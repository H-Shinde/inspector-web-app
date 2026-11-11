import json
from django.contrib.auth import get_user_model
from django.test import Client, TransactionTestCase
from bids.models import Inspector, Bid, Job


class ParallelAppSessionsTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='parallel-admin', email='admin@email.com', password='Admin-Strong-4882!')
        self.user = User.objects.create_user(username='parallel-inspector', email='parallel@example.com', password='Inspector-Strong-4882!')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.user, name='Inspector', email=self.user.email)
        self.browser = Client(enforce_csrf_checks=True)

    def post(self, path, values, inspector=False):
        csrf_path = '/api/auth/inspector-csrf/' if inspector else '/api/auth/csrf/'
        token = self.browser.get(csrf_path).json()['csrfToken']
        return self.browser.post(path, data=json.dumps(values), content_type='application/json', HTTP_X_CSRFTOKEN=token)

    def login_both(self):
        admin_result = self.post('/api/auth/login/', {'email': self.admin.email, 'password': 'Admin-Strong-4882!'})
        self.assertEqual(admin_result.status_code, 200, admin_result.content)
        admin_cookie = self.browser.cookies['sessionid'].value
        result = self.post('/api/auth/inspector-login/', {'email': self.user.email, 'password': 'Inspector-Strong-4882!'}, inspector=True)
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(self.browser.cookies['sessionid'].value, admin_cookie)
        self.assertIn('inspector_sessionid', result.cookies)
        self.assertNotIn('sessionid', result.cookies)
        self.assertTrue(result.cookies['inspector_sessionid']['httponly'])

    def test_same_browser_can_authenticate_both_apps_and_keep_csrf_separate(self):
        self.login_both()
        self.assertEqual(self.browser.get('/api/auth/me/').json()['email'], self.admin.email)
        self.assertEqual(self.browser.get('/api/inspector/jobs/').json()['email'], self.user.email)
        self.assertEqual(self.browser.get('/api/jobs/').status_code, 200)
        admin_token = self.browser.get('/api/auth/csrf/').json()['csrfToken']
        response = self.browser.post('/api/auth/inspector-logout/', data='{}', content_type='application/json', HTTP_X_CSRFTOKEN=admin_token)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.browser.get('/api/inspector/jobs/').status_code, 200)

    def test_inspector_logout_does_not_log_out_admin(self):
        self.login_both()
        self.assertEqual(self.post('/api/auth/inspector-logout/', {}, inspector=True).status_code, 200)
        self.assertEqual(self.browser.get('/api/inspector/jobs/').status_code, 401)
        self.assertEqual(self.browser.get('/api/auth/me/').status_code, 200)

    def test_admin_logout_does_not_log_out_inspector(self):
        self.login_both()
        self.assertEqual(self.post('/api/auth/logout/', {}).status_code, 200)
        self.assertEqual(self.browser.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.browser.get('/api/inspector/jobs/').status_code, 200)

    def test_inspector_login_does_not_invalidate_admin_csrf(self):
        self.assertEqual(self.post('/api/auth/login/', {'email': self.admin.email, 'password': 'Admin-Strong-4882!'}).status_code, 200)
        token = self.browser.get('/api/auth/csrf/').json()['csrfToken']
        self.assertEqual(self.post('/api/auth/inspector-login/', {'email': self.user.email, 'password': 'Inspector-Strong-4882!'}, inspector=True).status_code, 200)
        response = self.browser.post('/api/auth/logout/', data='{}', content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)

    def test_live_stream_is_scoped_and_delivers_job_changes(self):
        self.login_both()
        bid = Bid.objects.create(owner=self.admin, businessName='Live job', appraisalType='Business Valuation (BV)')
        job = Job.objects.create(owner=self.admin, source_bid=bid, inspector=self.inspector, status='In-Progress')
        response = self.browser.get('/api/inspector/events/')
        self.assertEqual(response.status_code, 200)
        events = iter(response.streaming_content)
        first = next(events)
        self.assertIn(b'In-Progress', first)
        self.assertTrue(first.endswith(bytes([10, 10])), repr(first))
        self.assertEqual(first.splitlines()[0], b'event: jobs-changed')
        job.status = 'Pending Review'
        job.revision += 1
        job.save()
        self.assertIn(b'Pending Review', next(events))
        self.post('/api/auth/inspector-logout/', {}, inspector=True)
        self.assertIn(b'session-expired', next(events))
        response.close()
        response = self.browser.get('/api/job-events/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Pending Review', next(iter(response.streaming_content)))
        response.close()
        self.assertEqual(self.browser.get('/api/inspector/events/').status_code, 401)

    def test_same_browser_job_submission_review_and_history(self):
        self.login_both()
        bid = Bid.objects.create(owner=self.admin, businessName='Shared workflow', appraisalType='Business Valuation (BV)')
        part = dict(id='desk', name='Desk', qty='1', type='Furniture', make='N/A', model='N/A', serial='123', condition='Good', year='N/A', mileage='N/A', comments='', photos=[])
        job = Job.objects.create(owner=self.admin, source_bid=bid, inspector=self.inspector, status='In-Progress', inspectionParts=[part])
        stream = self.browser.get('/api/job-events/')
        events = iter(stream.streaming_content)
        first = next(events)
        self.assertIn(b'In-Progress', first)
        self.assertTrue(first.endswith(bytes([10, 10])), repr(first))
        self.assertEqual(first.splitlines()[0], b'event: jobs-changed')
        response = self.post(f'/api/inspector/jobs/{job.pk}/', {'action': 'complete', 'revision': 0}, inspector=True)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn(b'Pending Review', next(events))
        token = self.browser.get('/api/auth/csrf/').json()['csrfToken']
        response = self.browser.patch(f'/api/jobs/{job.pk}/', data=json.dumps({'status': 'Needs Changes', 'reviewNotes': 'Check serial', 'revision': 1}), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn(b'Needs Changes', next(events))
        inspector_job = self.browser.get('/api/inspector/jobs/').json()['jobs'][0]
        self.assertEqual(inspector_job['reviewNotes'], 'Check serial')
        response = self.post(f'/api/inspector/jobs/{job.pk}/', {'action': 'complete', 'revision': 2}, inspector=True)
        self.assertEqual(response.status_code, 200, response.content)
        response = self.browser.patch(f'/api/jobs/{job.pk}/', data=json.dumps({'status': 'Complete', 'revision': 3}), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.browser.get('/api/jobs/?history=1').json()['jobs'][0]['status'], 'Complete')
        stream.close()

    def test_legacy_inspector_cookie_does_not_prevent_signing_into_both_apps(self):
        legacy_browser = Client()
        legacy_browser.force_login(self.user)
        self.browser.cookies['sessionid'] = legacy_browser.cookies['sessionid'].value
        self.assertEqual(self.browser.get('/api/auth/me/').status_code, 403)
        self.assertEqual(self.browser.get('/api/inspector/jobs/').status_code, 401)
        self.login_both()
        self.assertEqual(self.browser.get('/api/auth/me/').status_code, 200)
        self.assertEqual(self.browser.get('/api/inspector/jobs/').status_code, 200)

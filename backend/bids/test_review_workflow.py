from accounts.test_helpers import force_inspector_login
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Bid, Job, Inspector

class ReviewWorkflowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='review-admin', email='admin@email.com')
        self.inspector_user = User.objects.create_user(username='review-inspector', email='review@example.com')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.inspector_user, name='Inspector', email=self.inspector_user.email)
        bid = Bid.objects.create(owner=self.admin, appraisalType='Business Valuation (BV)', businessName='Review test')
        self.part = dict(id='desk', name='Desk', qty='1', type='Furniture', make='N/A', model='N/A', serial='N/A', condition='Good', year='N/A', mileage='N/A', comments='', photos=[])
        self.job = Job.objects.create(owner=self.admin, source_bid=bid, inspector=self.inspector, status='In-Progress', inspectionParts=[self.part])

    def inspector_action(self, action='complete', revision=None):
        force_inspector_login(self.client, self.inspector_user)
        self.job.refresh_from_db()
        return self.client.post(f'/api/inspector/jobs/{self.job.pk}/', data=json.dumps({'action': action, 'revision': self.job.revision if revision is None else revision}), content_type='application/json')

    def review(self, status, **extra):
        self.client.force_login(self.admin)
        self.job.refresh_from_db()
        return self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'status': status, 'revision': self.job.revision, **extra}), content_type='application/json')

    def test_submission_waits_for_admin_and_only_approval_archives(self):
        submitted = self.inspector_action()
        self.assertEqual(submitted.status_code, 200, submitted.content)
        self.assertEqual(submitted.json()['status'], 'Pending Review')
        self.assertIsNone(submitted.json()['completedAt'])
        self.client.force_login(self.admin)
        self.assertEqual(len(self.client.get('/api/jobs/').json()['jobs']), 1)
        self.assertEqual(self.client.get('/api/jobs/?history=1').json()['jobs'], [])
        approved = self.review('Complete')
        self.assertEqual(approved.status_code, 200, approved.content)
        self.assertIsNotNone(approved.json()['completedAt'])
        self.assertEqual(self.client.get('/api/jobs/').json()['jobs'], [])
        self.assertEqual(self.client.get('/api/jobs/?history=1').json()['jobs'][0]['status'], 'Complete')
        self.assertEqual(self.inspector_action().status_code, 409)

    def test_changes_feedback_edit_and_resubmit_cycle(self):
        self.inspector_action()
        returned = self.review('Needs Changes', reviewNotes='Correct the serial number.')
        self.assertEqual(returned.status_code, 200, returned.content)
        self.assertEqual(returned.json()['status'], 'Needs Changes')
        force_inspector_login(self.client, self.inspector_user)
        current = self.client.get('/api/inspector/jobs/').json()['jobs'][0]
        self.assertEqual(current['reviewNotes'], 'Correct the serial number.')
        self.assertEqual(current['inspectionParts'][0]['name'], 'Desk')
        response = self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', data=json.dumps({'revision': current['revision'], 'part': {**self.part, 'serial': 'Corrected-123'}}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        resubmitted = self.inspector_action()
        self.assertEqual(resubmitted.json()['status'], 'Pending Review')
        self.assertEqual(resubmitted.json()['inspectionParts'][0]['serial'], 'Corrected-123')
        self.assertEqual(self.review('Complete').status_code, 200)

    def test_pending_review_parts_are_read_only_and_submission_cannot_repeat(self):
        submitted = self.inspector_action().json()
        response = self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', data=json.dumps({'revision': submitted['revision'], 'part': self.part}), content_type='application/json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.inspector_action().status_code, 409)

    def test_admin_cannot_skip_submission_or_request_changes_without_feedback(self):
        self.assertEqual(self.review('Complete').status_code, 409)
        self.assertEqual(self.review('Needs Changes', reviewNotes='Fix it').status_code, 409)
        self.inspector_action()
        for notes in [None, '', '   ', 'x' * 4001]:
            changes = {} if notes is None else {'reviewNotes': notes}
            self.assertEqual(self.review('Needs Changes', **changes).status_code, 400)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'Pending Review')

    def test_review_rejects_stale_revision_and_wrong_role(self):
        self.inspector_action()
        self.client.force_login(self.admin)
        response = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'status': 'Complete', 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 409)
        force_inspector_login(self.client, self.inspector_user)
        self.client.cookies.pop('sessionid', None)
        response = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'status': 'Complete', 'revision': 1}), content_type='application/json')
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.inspector_action(revision=0).status_code, 409)

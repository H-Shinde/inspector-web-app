import json
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from .models import Bid, Job, Inspector


class JobApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='job-owner', email='job-owner@example.com')
        self.other = get_user_model().objects.create_user(username='job-other', email='job-other@example.com')
        self.client.force_login(self.user)
        self.bid = Bid.objects.create(
            owner=self.user, name='Contact', businessName='Example', appraisalType='Business Valuation (BV)',
            bidAmount=1000, fmvContinuedUse=1, totalInspectedItems=12, totalAppraisal=800,
            discount=50, total=950, meNote='Carry this note',
        )
        self.inspector = Inspector.objects.create(owner=self.user, name='Inspector', email='inspector@example.com', zipCode='10001')
        self.foreign = Inspector.objects.create(owner=self.other, name='Private', email='private@example.com')

    def accept(self):
        response = self.client.patch(f'/api/bids/{self.bid.pk}/', data=json.dumps({'status': 'Accepted'}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        return Job.objects.get(pk=response.json()['jobId'])

    def patch(self, job, data):
        return self.client.patch(f'/api/jobs/{job.pk}/', data=json.dumps(data), content_type='application/json')

    def test_accept_creates_one_unassigned_job_and_retries_are_idempotent(self):
        job = self.accept()
        self.assertIsNone(job.inspector_id)
        self.assertEqual(job.status, 'Unassigned')
        self.assertEqual(self.accept().pk, job.pk)
        response = self.client.post('/api/jobs/', data=json.dumps({'bidId': self.bid.pk}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Job.objects.count(), 1)
        data = self.client.get('/api/jobs/').json()['jobs'][0]
        self.assertEqual(data['sourceBidId'], self.bid.pk)
        self.assertEqual(data['referenceNumber'], f'JOB-{job.pk:06d}')
        self.assertEqual(data['totalBid'], '997.50')
        self.assertEqual(data['sectionDetails']['Asset Valuation']['fmvContinuedUse'], '1.00')
        self.assertEqual(data['sectionDetails']['Inspection Fees']['totalInspectedItems'], '12')
        self.assertEqual(data['sectionDetails']['Inspection Fees']['totalAppraisal'], '800.00')
        self.assertEqual(data['sectionDetails']['Inspection Fees']['pdfDiscount'], '50.00')
        self.assertEqual(data['sectionDetails']['Inspection Fees']['total'], '950.00')
        self.assertEqual(data['sectionDetails']['Inspection Fees']['meNote'], 'Carry this note')

    def test_can_only_create_from_own_accepted_bid(self):
        self.assertEqual(self.client.post('/api/jobs/', data=json.dumps({'bidId': self.bid.pk}), content_type='application/json').status_code, 409)
        self.bid.owner = self.other; self.bid.save()
        self.assertEqual(self.client.post('/api/jobs/', data=json.dumps({'bidId': self.bid.pk}), content_type='application/json').status_code, 404)

    def test_assignment_is_owned_active_and_persistent(self):
        job = self.accept()
        self.assertEqual(self.patch(job, {'inspectorId': self.foreign.pk}).status_code, 400)
        self.inspector.is_active = False; self.inspector.save()
        self.assertEqual(self.patch(job, {'inspectorId': self.inspector.pk}).status_code, 400)
        self.inspector.is_active = True; self.inspector.save()
        response = self.patch(job, {'inspectorId': self.inspector.pk, 'revision': 0})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['status'], 'Assigned')
        self.assertEqual(response.json()['inspectorEmail'], 'inspector@example.com')
        fresh_browser = Client(); fresh_browser.force_login(self.user)
        self.assertEqual(fresh_browser.get(f'/api/jobs/{job.pk}/').json()['inspectorId'], self.inspector.pk)
        self.assertEqual(self.patch(job, {'inspectorId': None}).json()['status'], 'Unassigned')

    def test_items_validation_and_stale_revision(self):
        job = self.accept()
        response = self.patch(job, {'items': [{'name': 'Forklift', 'year': '2020'}], 'revision': 0})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['items'][0]['itemId'])
        self.assertEqual(self.patch(job, {'items': [], 'revision': 0}).status_code, 409)
        self.assertEqual(self.patch(job, {'items': []}).status_code, 400)
        self.assertEqual(self.patch(job, {'items': [{'name': '', 'year': 'bad'}], 'revision': 1}).status_code, 400)
        self.assertEqual(len(self.client.get(f'/api/jobs/{job.pk}/').json()['items']), 1)
        self.assertEqual(self.patch(job, {'items': [], 'revision': 1}).status_code, 200)

    def test_sections_merge_validate_and_record_history(self):
        job = self.accept()
        self.assertEqual(self.patch(job, {'sectionDetails': {'Inspection Fees': {'total': '-1'}}}).status_code, 400)
        self.assertEqual(self.patch(job, {'sectionDetails': {'Appraised Items': {'count': '1.5'}}}).status_code, 400)
        self.assertEqual(self.patch(job, {'sectionDetails': {'Unknown': {}}}).status_code, 400)
        self.patch(job, {'sectionDetails': {'Inspection Fees': {'total': '150.50'}}})
        result = self.patch(job, {'sectionDetails': {'Inspection Fees': {'meNote': 'Reviewed'}}}).json()
        self.assertEqual(result['sectionDetails']['Inspection Fees']['total'], '150.50')
        self.assertEqual(result['sectionDetails']['Inspection Fees']['meNote'], 'Reviewed')
        self.assertEqual(len(result['valuationHistory']), 2)

    def test_complete_delete_and_archived_jobs_are_read_only(self):
        job = self.accept()
        self.assertEqual(self.patch(job, {'status': 'In-Progress'}).status_code, 400)
        response = self.patch(job, {'status': 'Complete', 'revision': 0})
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.json()['completedAt'])
        self.assertEqual(self.client.get('/api/jobs/').json()['jobs'], [])
        self.assertEqual(self.client.get('/api/jobs/?history=1').json()['jobs'][0]['id'], job.pk)
        self.assertEqual(self.patch(job, {'items': [], 'revision': 1}).status_code, 409)
        second_bid = Bid.objects.create(owner=self.user, name='Second', businessName='Second', appraisalType='Calculation Valuation', status='Accepted')
        other_job = Job.objects.create(owner=self.user, source_bid=second_bid)
        self.assertEqual(self.client.delete(f'/api/jobs/{other_job.pk}/').status_code, 200)
        other_job.refresh_from_db(); self.assertEqual(other_job.status, 'Deleted')

    def test_owner_auth_csrf_and_server_controlled_fields(self):
        job = self.accept()
        for field in ['owner', 'sourceBidId', 'businessName', 'valuationHistory']:
            self.assertEqual(self.patch(job, {field: 'bad'}).status_code, 400)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(f'/api/jobs/{job.pk}/').status_code, 404)
        self.assertEqual(self.client.get('/api/jobs/').json()['jobs'], [])
        self.client.logout(); self.assertEqual(self.client.get('/api/jobs/').status_code, 401)
        csrf = Client(enforce_csrf_checks=True); csrf.force_login(self.user)
        self.assertEqual(csrf.patch(f'/api/jobs/{job.pk}/', data='{}', content_type='application/json').status_code, 403)

from accounts.test_helpers import force_inspector_login
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Inspector, Bid, Job


class InspectorJobsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username='owner', email='owner@example.com')
        self.user = User.objects.create_user(username='inspector', email='inspector@example.com')
        self.inspector = Inspector.objects.create(owner=self.owner, user=self.user, name='Inspector', email=self.user.email)
        bid = Bid.objects.create(owner=self.owner, name='Contact', businessName='Example', appraisalType='Business Valuation (BV)')
        self.job = Job.objects.create(owner=self.owner, source_bid=bid, inspector=self.inspector, status='Assigned')
        force_inspector_login(self.client, self.user)

    def action(self, action, revision=0):
        return self.client.post(f'/api/inspector/jobs/{self.job.pk}/', data=json.dumps({'action': action, 'revision': revision}), content_type='application/json')

    def test_complete_persists_and_rejects_stale_request(self):
        self.assertEqual(self.client.get('/api/inspector/jobs/').json()['jobs'][0]['id'], self.job.pk)
        self.assertEqual(self.action('complete').status_code, 409)
        self.assertEqual(self.action('accept').status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'In-Progress')
        self.job.inspectionParts = [{'id': 'part-1', 'name': 'Desk', 'qty': '1', 'type': 'Furniture', 'make': 'N/A', 'model': 'N/A', 'serial': 'N/A', 'condition': 'Good', 'year': 'N/A', 'mileage': 'N/A', 'comments': '', 'photos': []}]
        self.job.save(update_fields=['inspectionParts'])
        self.assertEqual(self.action('complete', revision=1).status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'Pending Review')
        self.assertIsNone(self.job.completedAt)
        self.assertEqual(self.action('decline').status_code, 409)

    def test_decline_returns_job_to_admin(self):
        self.assertEqual(self.action('decline').status_code, 200)
        self.job.refresh_from_db()
        self.assertIsNone(self.job.inspector)
        self.assertEqual(self.job.status, 'Unassigned')
        self.assertEqual(self.client.get('/api/inspector/jobs/').json()['jobs'], [])

    def test_other_inspector_cannot_change_job(self):
        other = get_user_model().objects.create_user(username='other', email='other@example.com')
        Inspector.objects.create(owner=self.owner, user=other, name='Other', email=other.email)
        force_inspector_login(self.client, other)
        self.assertEqual(self.action('complete').status_code, 404)

    def test_parts_persist_and_submission_rejects_incomplete_data(self):
        self.assertEqual(self.action('accept').status_code, 200)
        self.assertEqual(self.action('complete', revision=1).status_code, 400)
        result = self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', data=json.dumps({'revision': 1, 'part': {'id': 'desk', 'name': 'Desk'}}), content_type='application/json')
        self.assertEqual(result.status_code, 200, result.content)
        fresh = self.client.get('/api/inspector/jobs/').json()['jobs'][0]
        self.assertEqual(fresh['inspectionParts'][0]['name'], 'Desk')
        self.assertEqual(self.action('complete', revision=2).status_code, 400)
        self.assertEqual(self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', data=json.dumps({'revision': 1, 'part': {'id': 'desk', 'name': 'Stale'}}), content_type='application/json').status_code, 409)

    def test_profile_update_cannot_change_rating_or_identity(self):
        url = '/api/inspector/profile/'
        result = self.client.post(url, data=json.dumps({'name': 'Updated Inspector', 'city': 'Buffalo', 'state': 'NY', 'zipCode': '14215'}), content_type='application/json')
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(self.client.get(url).json()['name'], 'Updated Inspector')
        self.assertEqual(self.client.post(url, data=json.dumps({'rating': 5}), content_type='application/json').status_code, 400)

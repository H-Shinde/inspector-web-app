import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.test_helpers import force_inspector_login
from .models import Bid, Job, Inspector, initial_job_items

class BidJobCountTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='count-admin', email='admin@email.com')
        self.user = User.objects.create_user(username='count-inspector', email='counts@example.com')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.user, email=self.user.email, name='Inspector')
        self.bid = Bid.objects.create(owner=self.admin, businessName='Counts', appraisalType='Business Valuation (BV)', totalInspectedItems=3, totalNonInspectedItems=2, bidAmount=1000)
        self.client.force_login(self.admin)
        force_inspector_login(self.client, self.user)

    def test_accepting_bid_creates_matching_item_count_and_legacy_empty_jobs_show_it(self):
        response = self.client.patch(f'/api/bids/{self.bid.pk}/', data=json.dumps({'status': 'Accepted'}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        job = Job.objects.get(source_bid=self.bid)
        self.assertEqual(len(job.items), 3)
        data = self.client.get(f'/api/jobs/{job.pk}/').json()
        self.assertEqual(data['expectedItemCount'], 3)
        self.assertEqual(len(data['items']), 3)
        job.items = []; job.save()
        self.assertEqual(len(self.client.get(f'/api/jobs/{job.pk}/').json()['items']), 3)

    def test_inspector_submission_quantities_must_match_bid(self):
        job = Job.objects.create(owner=self.admin, source_bid=self.bid, inspector=self.inspector, status='In-Progress', items=initial_job_items(self.bid))
        job.inspectionParts = [dict(id=item['itemId'], name=item['name'], qty='2', type='Equipment', make='N/A', model='N/A', serial='N/A', condition='Good', year='N/A', mileage='N/A', comments='', photos=[]) for item in job.items]
        job.save()
        url = f'/api/inspector/jobs/{job.pk}/'
        response = self.client.post(url, data=json.dumps({'action': 'complete', 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn('requires 3 items', response.json()['error'])
        for part in job.inspectionParts: part['qty'] = '1'
        job.save()
        response = self.client.post(url, data=json.dumps({'action': 'complete', 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)

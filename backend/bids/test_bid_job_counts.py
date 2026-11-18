import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.test_helpers import force_inspector_login
from .models import Bid, Job, Inspector

class BidJobCountTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='count-admin', email='admin@email.com')
        self.user = User.objects.create_user(username='count-inspector', email='counts@example.com')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.user, email=self.user.email, name='Inspector')
        self.bid = Bid.objects.create(owner=self.admin, businessName='Counts', appraisalType='Business Valuation (BV)', totalInspectedItems=3, totalNonInspectedItems=2, inspectionRate=25, appraisalRate=45, nonAppraisalRate=10, bidAmount=1000)
        self.client.force_login(self.admin)
        force_inspector_login(self.client, self.user)

    def test_import_jobs_preserves_references_and_rejects_bad_batches(self):
        row = {'externalReference': 'LEGACY-42', 'appraisalType': 'Machinery & Equipment (M&E)',
               'businessName': 'Example Equipment', 'clientCompany': 'Bank', 'clientName': 'Alex',
               'date': '11/18/2026', 'clientEmail': 'alex@example.com', 'bidAmount': '1250.50'}
        url = '/api/jobs/'
        response = self.client.post(url, data={'jobs': [row, {**row, 'businessName': ''}]}, content_type='application/json')
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(Job.objects.exists())
        response = self.client.post(url, data={'jobs': [row]}, content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json(), {'imported': 1})
        job = self.client.get(url).json()['jobs'][0]
        self.assertEqual(job['externalReference'], 'LEGACY-42')
        self.assertEqual(job['totalBid'], '1250.50')
        self.assertEqual(job['date'], '2026-11-18')
        response = self.client.post(url, data={'jobs': [row]}, content_type='application/json')
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(Job.objects.count(), 1)

    def test_accepting_bid_sets_quantity_limit_without_preloading_items(self):
        response = self.client.patch(f'/api/bids/{self.bid.pk}/', data=json.dumps({'status': 'Accepted'}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        job = Job.objects.get(source_bid=self.bid)
        self.assertEqual(job.items, [])
        data = self.client.get(f'/api/jobs/{job.pk}/').json()
        self.assertEqual(data['expectedItemCount'], 5)
        self.assertEqual(data['items'], [])
        self.assertEqual(data['inspectionParts'], [])
        self.assertEqual(job.sectionDetails['Appraised Items'], {'count': '3', 'inspectionRate': '25.00', 'appraisalRate': '45.00'})
        self.assertEqual(job.sectionDetails['Non Appraised Items'], {'count': '2', 'appraisalRate': '10.00'})

    def test_existing_jobs_show_appraisal_defaults_and_preserve_saved_edits(self):
        job = Job.objects.create(owner=self.admin, source_bid=self.bid, sectionDetails={
            'Appraised Items': {'count': '4', 'appraisalRate': '', 'customAppraisalRate': '60'},
        })
        sections = self.client.get(f'/api/jobs/{job.pk}/').json()['sectionDetails']
        self.assertEqual(sections['Appraised Items'], {
            'count': '4', 'inspectionRate': '25.00', 'appraisalRate': '', 'customAppraisalRate': '60',
        })
        self.assertEqual(sections['Non Appraised Items'], {'count': '2', 'appraisalRate': '10.00'})

    def test_inspector_compensation_uses_appraised_count_rate_and_saved_charges(self):
        job = Job.objects.create(owner=self.admin, source_bid=self.bid, inspector=self.inspector, status='Assigned')
        inspector_url = '/api/inspector/jobs/'
        self.assertEqual(self.client.get(inspector_url).json()['jobs'][0]['compensation'], '75.00')
        response = self.client.patch(f'/api/jobs/{job.pk}/', data={'revision': 0, 'sectionDetails': {
            'Appraised Items': {'count': '4', 'inspectionRate': '25.25', 'additionalInspectionCharge': '12.50'},
            'Inspection Fees': {'locationSurcharge': '30.75'},
            'Non Appraised Items': {'inspectionRate': '100', 'additionalInspectionCharge': '100'},
        }}, content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.client.get(inspector_url).json()['jobs'][0]['compensation'], '144.25')

    def test_job_item_updates_cap_total_quantity_across_rows(self):
        job = Job.objects.create(owner=self.admin, source_bid=self.bid)
        url = f'/api/jobs/{job.pk}/'
        items = [{'name': 'Desk', 'qty': '3'}, {'name': 'Chair', 'qty': '3'}]
        response = self.client.patch(url, data={'revision': 0, 'items': items}, content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('bid limit of 5', response.json()['error'])
        items[1]['qty'] = '2'
        response = self.client.patch(url, data={'revision': 0, 'items': items}, content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.json()['items']), 2)

    def test_inspector_submission_allows_quantity_below_bid_limit(self):
        job = Job.objects.create(owner=self.admin, source_bid=self.bid, inspector=self.inspector, status='In-Progress')
        job.inspectionParts = [dict(id='desk', name='Desk', qty='6', type='Equipment', make='N/A', model='N/A', serial='N/A', condition='Good', year='N/A', mileage='N/A', comments='', photos=[])]
        job.save()
        url = f'/api/inspector/jobs/{job.pk}/'
        response = self.client.post(url, data=json.dumps({'action': 'complete', 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn('bid limit of 5', response.json()['error'])
        job.inspectionParts[0]['qty'] = '3'
        job.save()
        response = self.client.post(url, data=json.dumps({'action': 'complete', 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)

    def test_explicit_zero_caps_items_but_unspecified_counts_allow_them(self):
        self.bid.totalInspectedItems = 0
        self.bid.totalNonInspectedItems = None
        self.bid.save()
        job = Job.objects.create(owner=self.admin, source_bid=self.bid)
        url = f'/api/jobs/{job.pk}/'
        data = {'revision': 0, 'items': [{'name': 'Desk'}]}
        self.assertEqual(self.client.patch(url, data=data, content_type='application/json').status_code, 400)
        self.bid.totalInspectedItems = None
        self.bid.save()
        self.assertEqual(self.client.patch(url, data=data, content_type='application/json').status_code, 200)

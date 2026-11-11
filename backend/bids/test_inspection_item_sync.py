import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.test_helpers import force_inspector_login
from .models import Bid, Job, Inspector

class InspectionItemSyncTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='item-admin', email='admin@email.com')
        self.user = User.objects.create_user(username='item-inspector', email='items@example.com')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.user, name='Inspector', email=self.user.email)
        bid = Bid.objects.create(owner=self.admin, businessName='Items', appraisalType='Machinery & Equipment (M&E)')
        self.item = dict(itemId='asset-1', name='Old description', photoNumber='42', referenceNumber='REF-1')
        self.part = dict(id='asset-1', name='Updated description', qty='2', type='Vehicle', make='Ford', model='F150', serial='SERIAL-123', condition='Very Good', year='2025', mileage='1200', comments='Updated notes', photos=[])
        self.job = Job.objects.create(owner=self.admin, source_bid=bid, inspector=self.inspector, status='In-Progress', items=[self.item])
        self.client.force_login(self.admin)
        force_inspector_login(self.client, self.user)

    def save_part(self, part=None):
        self.job.refresh_from_db()
        return self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', data=json.dumps({'part': part or self.part, 'revision': self.job.revision}), content_type='application/json')

    def admin_job(self):
        result = self.client.get(f'/api/jobs/{self.job.pk}/')
        self.assertEqual(result.status_code, 200, result.content)
        return result.json()

    def test_saved_inspector_details_update_admin_items_and_keep_metadata(self):
        result = self.save_part()
        self.assertEqual(result.status_code, 200, result.content)
        items = self.admin_job()['items']
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]['name'], 'Updated description')
        self.assertEqual(items[0]['serialNumber'], 'SERIAL-123')
        self.assertEqual(items[0]['hoursMiles'], '1200')
        self.assertEqual(items[0]['condition'], 'Very Good')
        self.assertEqual(items[0]['qty'], '2')
        self.assertEqual(items[0]['comments'], 'Updated notes')
        self.assertEqual(items[0]['photoNumber'], '42')
        self.assertEqual(items[0]['referenceNumber'], 'REF-1')
        self.job.refresh_from_db()
        self.assertEqual(self.job.items[0]['model'], 'F150')

    def test_already_submitted_parts_are_visible_without_resubmitting(self):
        self.job.inspectionParts = [self.part]
        self.job.status = 'Pending Review'
        self.job.save()
        item = self.admin_job()['items'][0]
        self.assertEqual(item['name'], 'Updated description')
        self.assertEqual(item['serialNumber'], 'SERIAL-123')

    def test_inspector_added_part_is_added_once_in_admin_list(self):
        self.assertEqual(self.save_part({**self.part, 'id': 'new-part'}).status_code, 200)
        self.assertEqual(self.save_part({**self.part, 'id': 'new-part', 'comments': 'Latest'}).status_code, 200)
        items = self.admin_job()['items']
        self.assertEqual(len(items), 2)
        self.assertEqual(items[1]['comments'], 'Latest')

    def test_admin_edits_additions_and_deletions_round_trip_to_inspector(self):
        self.save_part()
        job = self.admin_job()
        items = [{**job['items'][0], 'condition': 'Fair', 'year': 'N/A', 'hoursMiles': '222', 'serialNumber': 'CORRECTED'}, {'itemId': 'asset-2', 'name': 'New admin item'}]
        response = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'revision': job['revision'], 'items': items}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        parts = self.client.get('/api/inspector/jobs/').json()['jobs'][0]['inspectionParts']
        self.assertEqual(parts[0]['condition'], 'Fair')
        self.assertEqual(parts[0]['year'], 'N/A')
        self.assertEqual(parts[0]['mileage'], '222')
        self.assertEqual(parts[0]['serial'], 'CORRECTED')
        self.assertEqual(parts[1]['name'], 'New admin item')
        response = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'revision': response.json()['revision'], 'items': [items[1]]}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.json()['items']), 1)
        self.assertEqual(len(response.json()['inspectionParts']), 1)

    def test_condition_has_only_the_five_supported_values(self):
        for condition in ['Very Good', 'Good', 'Fair', 'Poor', 'Scrap']:
            response = self.save_part({**self.part, 'condition': condition})
            self.assertEqual(response.status_code, 200, response.content)
        response = self.save_part({**self.part, 'condition': '6'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('Choose Very Good', response.json()['error'])

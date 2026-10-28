import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Bid


class BidImportTests(TestCase):
    def setUp(self):
        self.client.force_login(get_user_model().objects.create_user(username='import-owner'))

    def upload(self, rows):
        return self.client.post('/api/bids/import/', data=json.dumps({'bids': rows}), content_type='application/json')

    def test_valid_rows_create_pending_bids(self):
        row = {'appraisalType': 'Business Valuation (BV)', 'businessName': 'Demo', 'name': 'Contact', 'bidAmount': '1500'}
        response = self.upload([row, {**row, 'businessName': 'Second'}])
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Bid.objects.filter(status='Pending').count(), 2)

    def test_one_invalid_row_prevents_all_imports(self):
        row = {'appraisalType': 'Business Valuation (BV)', 'businessName': 'Demo', 'name': 'Contact', 'bidAmount': '1500'}
        response = self.upload([row, {**row, 'bidAmount': '0'}])
        self.assertEqual(response.status_code, 400)
        self.assertIn('Row 3', response.json()['error'])
        self.assertEqual(Bid.objects.count(), 0)

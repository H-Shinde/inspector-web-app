import json
from decimal import Decimal
from types import SimpleNamespace
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from .models import Inspector, Bid, BidSettings
from .calculation import default_rules, validate_rules, calculate_total, TYPES


class BidSettingsTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='settings-owner', email='settings-owner@example.com')
        self.other = get_user_model().objects.create_user(username='settings-other', email='settings-other@example.com')
        self.client.force_login(self.user)
        self.inspector = Inspector.objects.create(owner=self.user, name='Inspector', email='inspector@example.com')
        self.payload = {'name': 'Contact', 'businessName': 'Example', 'appraisalType': TYPES[0], 'inspectorId': self.inspector.pk, 'bidAmount': '1000', 'discount': '50', 'rush': False}

    def put(self, rules):
        return self.client.put('/api/bid-settings/', data=json.dumps({'rules': rules}), content_type='application/json')

    def create_bid(self, **changes):
        response = self.client.post('/api/bids/', data=json.dumps({**self.payload, **changes}), content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_authentication_and_csrf(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/bid-settings/').status_code, 401)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(client.put('/api/bid-settings/', data=json.dumps({'rules': default_rules()}), content_type='application/json').status_code, 403)

    def test_settings_are_isolated_by_user(self):
        rules = default_rules()
        rules[TYPES[0]][0]['multiplier'] = '2'
        self.assertEqual(self.put(rules).status_code, 200)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get('/api/bid-settings/').json()['rules'], default_rules())

    def test_formulas_are_snapshotted_and_client_cannot_override_them(self):
        old = self.create_bid()
        self.assertEqual(old['totalBid'], '950.00')
        rules = default_rules()
        rules[TYPES[0]][0]['multiplier'] = '2'
        self.assertEqual(self.put(rules).status_code, 200)
        new = self.create_bid(calculationRules=default_rules(), totalBid='1')
        self.assertEqual(new['totalBid'], '1950.00')
        self.assertEqual(self.client.get(f"/api/bids/{old['id']}/").json()['totalBid'], '950.00')
        response = self.client.patch(f"/api/bids/{old['id']}/", data=json.dumps({'bidAmount': '1100'}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['totalBid'], '1050.00')

    def test_legacy_bid_keeps_default_formula(self):
        bid = Bid.objects.create(owner=self.user, inspector=self.inspector, name='Legacy', businessName='Legacy', appraisalType=TYPES[0], bidAmount=1000, discount=50)
        rules = default_rules(); rules[TYPES[0]][0]['multiplier'] = '2'
        self.put(rules)
        bid.refresh_from_db()
        self.assertEqual(bid.totalBid, Decimal('950.00'))

    def test_numeric_fields_and_checkbox_conditions(self):
        rules = default_rules()
        rules[TYPES[2]] = [
            {'field': 'bidAmount', 'operation': 'add', 'multiplier': '1', 'when': 'always'},
            {'field': 'totalInspectedItems', 'operation': 'add', 'multiplier': '25.50', 'when': 'always'},
            {'field': 'rush', 'operation': 'add', 'multiplier': '100', 'when': 'always'},
            {'field': 'discount', 'operation': 'subtract', 'multiplier': '1', 'when': 'pdfOnly'},
        ]
        self.assertEqual(self.put(rules).status_code, 200)
        result = self.create_bid(appraisalType=TYPES[2], reportFormat='Desktop', totalInspectedItems=3, rush=True, pdfOnly=True)
        self.assertEqual(result['totalBid'], '1126.50')
        result = self.create_bid(appraisalType=TYPES[2], reportFormat='Desktop', totalInspectedItems=3, rush=False, pdfOnly=False)
        self.assertEqual(result['totalBid'], '1076.50')

    def test_rejects_invalid_rules_without_replacing_saved_values(self):
        self.client.get('/api/bid-settings/')
        for change in [{'field': 'owner'}, {'multiplier': '-1'}, {'multiplier': 'NaN'}, {'multiplier': '1.001'}, {'when': 'unsafe'}, {'operation': 'eval'}]:
            rules = default_rules(); rules[TYPES[0]][0].update(change)
            self.assertEqual(self.put(rules).status_code, 400)
        self.assertEqual(self.put({}).status_code, 400)
        self.assertEqual(self.put({**default_rules(), TYPES[0]: []}).status_code, 400)
        self.assertEqual(BidSettings.objects.get(owner=self.user).rules, default_rules())

    def test_rounding_and_unchecked_conditions(self):
        rules = default_rules()
        rules[TYPES[0]] = [{'field': 'bidAmount', 'operation': 'add', 'multiplier': '0.50', 'when': 'notRush'}]
        bid = SimpleNamespace(calculationRules=validate_rules(rules), appraisalType=TYPES[0], bidAmount=Decimal('0.01'), rush=False, pdfOnly=False)
        self.assertEqual(calculate_total(bid), Decimal('0.01'))
        bid.rush = True
        self.assertEqual(calculate_total(bid), Decimal('0.00'))

    def test_asset_percentages_use_net_subtotal_without_compounding(self):
        rules = default_rules()
        for term in rules[TYPES[0]]:
            if term['field'] == 'fmvContinuedUse': term['multiplier'] = '10.00'
            if term['field'] == 'fairMarketValueRemoved': term['multiplier'] = '5.00'
        self.assertEqual(self.put(rules).status_code, 200)
        result = self.create_bid(bidAmount='1000', discount='100', additionalCharges='100', fmvContinuedUse=True, fairMarketValueRemoved=True)
        self.assertEqual(result['totalBid'], '1150.00')
        unchecked = self.create_bid(bidAmount='1000', discount='100', additionalCharges='100', fmvContinuedUse=False, fairMarketValueRemoved=False)
        self.assertEqual(unchecked['totalBid'], '1000.00')
        rules[TYPES[0]][0]['multiplier'] = '2'
        self.put(rules)
        self.assertEqual(self.client.get(f"/api/bids/{result['id']}/").json()['totalBid'], '1150.00')

    def test_asset_percentage_limits_and_legacy_snapshots(self):
        rules = default_rules()
        term = next(term for term in rules[TYPES[0]] if term['field'] == 'fmvContinuedUse')
        term['multiplier'] = '100.01'
        self.assertEqual(self.put(rules).status_code, 400)
        term['multiplier'] = '-1'
        self.assertEqual(self.put(rules).status_code, 400)
        old_rules = default_rules()
        old_rules[TYPES[0]] = [{'field': 'bidAmount', 'operation': 'add', 'multiplier': '1', 'when': 'always'}, {'field': 'fmvContinuedUse', 'operation': 'add', 'multiplier': '5', 'when': 'always'}]
        bid = SimpleNamespace(calculationRules=old_rules, appraisalType=TYPES[0], bidAmount=Decimal('1000'), fmvContinuedUse=Decimal('1'), rush=False, pdfOnly=False)
        self.assertEqual(calculate_total(bid), Decimal('1005.00'))

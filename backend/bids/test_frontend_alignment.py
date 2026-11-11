import json
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Bid, BidSettings
from .calculation import default_rules, TYPES
from .tier_rates import default_tier_tables

class FrontendAlignmentTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='alignment', email='admin@email.com')
        self.client.force_login(self.user)
        self.values = dict(name='Contact', businessName='Example', totalInspectedItems=10, totalNonInspectedItems=2, inspectionRate='10', appraisalRate='20', nonAppraisalRate='3')

    def create(self, **changes):
        response = self.client.post('/api/bids/', data=json.dumps({**self.values, **changes}), content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_server_selects_pricing_ignoring_client_override(self):
        cases = [(TYPES[2], 'Onsite', 'tiers-v1', '870.00'), (TYPES[2], 'Desktop', 'rates-v1', '206.00'), (TYPES[0], '', 'rates-v1', '306.00'), (TYPES[1], '', 'rates-v1', '306.00')]
        for kind, report, version, total in cases:
            with self.subTest(kind=kind, report=report):
                bid = self.create(appraisalType=kind, reportFormat=report, tier=5, calculationVersion='legacy', calculationRules={}, tierRates={})
                self.assertEqual(bid['calculationVersion'], version)
                self.assertEqual(Decimal(bid['totalBid']), Decimal(total))
                self.assertEqual(bid['tierRates'], default_tier_tables() if version == 'tiers-v1' else None)

    def test_defaults_and_explicit_values_survive_edits(self):
        bid = self.create(appraisalType=TYPES[0])
        self.assertEqual(bid['completionDays'], 5)
        self.assertEqual(bid['valueDate'], timezone.localdate().isoformat())
        bid = self.create(appraisalType=TYPES[0], completionDays=8, valueDate='2026-01-02')
        result = self.client.patch(f"/api/bids/{bid['id']}/", data=json.dumps({'businessName': 'Updated'}), content_type='application/json')
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()['completionDays'], 8)
        self.assertEqual(result.json()['valueDate'], '2026-01-02')

    def test_invalid_days_dates_and_required_fields(self):
        for change in [dict(completionDays='1.5'), dict(completionDays=-1), dict(valueDate='bad'), dict(businessName='')]:
            response = self.client.post('/api/bids/', data=json.dumps({**self.values, 'appraisalType': TYPES[0], **change}), content_type='application/json')
            self.assertEqual(response.status_code, 400, response.content)
            self.assertIn('fields', response.json())

    def test_settings_snapshots_and_no_completion_fee(self):
        original = self.create(appraisalType=TYPES[2], reportFormat='Onsite')
        rules = default_rules()
        rules[TYPES[0]].append(dict(field='completionDays', operation='add', multiplier='5.00', when='always'))
        tables = default_tier_tables()
        tables['appraisal'][0][0] = '99.00'
        BidSettings.objects.update_or_create(owner=self.user, defaults={'rules': rules, 'tierRates': tables})
        manual = self.create(appraisalType=TYPES[0])
        self.assertFalse(any(t['field'] == 'completionDays' for t in manual['calculationRules'][TYPES[0]]))
        new = self.create(appraisalType=TYPES[2], reportFormat='Onsite')
        self.assertEqual(Decimal(new['totalBid']), Decimal('1331.00'))
        old = self.client.get(f"/api/bids/{original['id']}/").json()
        self.assertEqual(old['totalBid'], original['totalBid'])
        self.assertEqual(old['tierRates'], original['tierRates'])
        result = self.client.put('/api/bid-settings/', data=json.dumps({'rules': rules}), content_type='application/json')
        self.assertEqual(result.status_code, 400)

    def test_saved_legacy_values_are_not_changed(self):
        bid = Bid.objects.create(owner=self.user, name='Old', businessName='Old', appraisalType=TYPES[0], bidAmount=1000)
        result = self.client.patch(f'/api/bids/{bid.pk}/', data=json.dumps({'businessName': 'Updated'}), content_type='application/json')
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()['calculationVersion'], 'legacy')
        self.assertIsNone(result.json()['completionDays'])
        self.assertIsNone(result.json()['valueDate'])
        self.assertEqual(result.json()['totalBid'], '1000.00')


    def test_switching_report_type_changes_pricing_mode(self):
        bid = self.create(appraisalType=TYPES[2], reportFormat='Onsite', tier=5)
        response = self.client.patch(f"/api/bids/{bid['id']}/", data=json.dumps({'reportFormat': 'Desktop', 'appraisalRate': '20'}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['calculationVersion'], 'rates-v1')
        self.assertEqual(response.json()['totalBid'], '206.00')
        self.assertIsNone(response.json()['tierRates'])
        response = self.client.patch(f"/api/bids/{bid['id']}/", data=json.dumps({'reportFormat': 'Onsite', 'tier': 5}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['calculationVersion'], 'tiers-v1')
        self.assertEqual(response.json()['totalBid'], '870.00')

    def test_conditional_fees_match_frontend_for_both_pricing_modes(self):
        for report, expected in [('Onsite', '791.00'), ('Desktop', '331.00')]:
            bid = self.create(appraisalType=TYPES[2], reportFormat=report, rush=True, rushFee='100', pdfOnly=True, discount='75', consolidationFee=True)
            self.assertEqual(bid['totalBid'], expected)

    def test_settings_round_trip_matches_removed_operation_controls(self):
        rules = default_rules()
        for terms in rules.values():
            for term in terms:
                term['when'] = 'rush'
                if term['field'] == 'discount':
                    term['operation'] = 'add'
        response = self.client.put('/api/bid-settings/', data=json.dumps({'rules': rules, 'tierRates': default_tier_tables()}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        for terms in response.json()['rules'].values():
            self.assertTrue(all(t['when'] == 'always' for t in terms))
            self.assertEqual(next(t for t in terms if t['field'] == 'discount')['operation'], 'subtract')
        self.assertEqual(self.client.get('/api/bid-settings/').json(), response.json())


    def test_contact_name_is_optional_as_in_admin_form(self):
        bid = self.create(appraisalType=TYPES[0], name='')
        self.assertEqual(bid['name'], '')

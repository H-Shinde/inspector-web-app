import json
from decimal import Decimal
from types import SimpleNamespace
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from .tier_rates import default_tier_tables, validate_tier_tables, subtotals
from .settings_views import bid_settings


class TierSettingsTests(TestCase):
    def test_save_reload_and_invalid_input(self):
        user = get_user_model().objects.create_user(username='tiers', email='tiers@example.com', password='test')
        factory = RequestFactory()
        request = factory.get('/')
        request.user = user
        initial = json.loads(bid_settings(request).content)
        tables = initial['tierRates']
        tables['appraisal'][0][0] = '99.25'
        request = factory.put('/', data=json.dumps({'rules': initial['rules'], 'tierRates': tables}), content_type='application/json')
        request.user = user
        self.assertEqual(bid_settings(request).status_code, 200)
        request = factory.get('/')
        request.user = user
        self.assertEqual(json.loads(bid_settings(request).content)['tierRates']['appraisal'][0][0], '99.25')
        tables['inspection'][0][0] = '-1'
        with self.assertRaises(ValueError):
            validate_tier_tables(tables)

    def test_defaults_boundaries_and_custom_appraisal(self):
        bid = SimpleNamespace(totalInspectedItems=11, totalNonInspectedItems=2, tier=1, reportFormat='Onsite', nonAppraisalRate=Decimal('0'), tierRates=default_tier_tables())
        self.assertEqual(subtotals(bid), (Decimal('312.50'), Decimal('330')))
        bid.tierRates['appraisal'][0][1] = '40.00'
        self.assertEqual(subtotals(bid)[1], Decimal('440'))
        self.assertEqual(default_tier_tables()['appraisal'][0][1], '30')

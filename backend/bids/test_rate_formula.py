from django.test import TestCase
from django.contrib.auth import get_user_model
from .forms import BidForm


class RateFormulaTests(TestCase):
    def test_onsite_and_desktop_use_counts_and_conditional_fees(self):
        user = get_user_model().objects.create_user(username='rates')
        values = dict(date='2026-11-03', appraisalType='Machinery & Equipment (M&E)', businessName='Demo', name='Contact',
                      inspectionRate='20', appraisalRate='30', nonAppraisalRate='10',
                      totalInspectedItems='10', totalNonInspectedItems='5', rush=True,
                      rushFee='100', pdfOnly=True, discount='50', reportFormat='Onsite')
        for report, expected in [('Onsite', '775.00'), ('Desktop', '425.00')]:
            form = BidForm({**values, 'reportFormat': report}, user=user)
            self.assertTrue(form.is_valid(), form.errors)
            bid = form.save(commit=False)
            self.assertEqual(str(bid.totalBid), expected)
            self.assertEqual(bid.totalInspectedItems, 10)
        form = BidForm({**values, 'consolidationFee': True}, user=user)
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(str(form.save(commit=False).totalBid), '875.00')

    def test_tier_quantity_boundaries(self):
        from .tier_rates import rate, APPRAISED_INSPECTION, NON_APPRAISED_INSPECTION, APPRAISAL
        for count, expected in [(1, '32.50'), (10, '32.50'), (11, '27.50'), (20, '27.50'), (21, '25'), (30, '25'), (31, '22.50'), (40, '22.50'), (41, '20'), (100, '20')]:
            self.assertEqual(str(rate(APPRAISED_INSPECTION, 1, count)), expected)
        self.assertEqual(str(rate(NON_APPRAISED_INSPECTION, 5, 41)), '3.50')
        self.assertEqual(str(rate(APPRAISAL, 4, 31)), '32.50')

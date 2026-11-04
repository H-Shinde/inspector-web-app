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
        for report, expected in [('Onsite', '600.00'), ('Desktop', '400.00')]:
            form = BidForm({**values, 'reportFormat': report}, user=user)
            self.assertTrue(form.is_valid(), form.errors)
            bid = form.save(commit=False)
            self.assertEqual(str(bid.totalBid), expected)
            self.assertEqual(bid.totalInspectedItems, 10)
        form = BidForm({**values, 'consolidationFee': True}, user=user)
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(str(form.save(commit=False).totalBid), '700.00')

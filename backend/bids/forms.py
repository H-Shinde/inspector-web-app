from decimal import Decimal
from django import forms

from .models import Bid, Inspector, Client, BidSettings
from .validation import contact_error


class BidForm(forms.ModelForm):
    def _post_clean(self):
        super()._post_clean()
        if self.errors:
            return
        if self.instance._state.adding:
            self.instance.calculationVersion = 'tiers-v1'
        if self.instance.calculationVersion == 'tiers-v1':
            from .tier_rates import subtotals, rate, APPRAISED_INSPECTION, APPRAISAL
            bid = self.instance
            bid.inspectionRate = rate(APPRAISED_INSPECTION, bid.tier, bid.totalInspectedItems or 0)
            bid.appraisalRate = rate(APPRAISAL, bid.tier, bid.totalInspectedItems or 0)
            bid.total, bid.totalAppraisal = subtotals(bid)
        elif self.instance.calculationVersion == 'rates-v1':
            bid = self.instance
            bid.total = Decimal('0') if bid.reportFormat == 'Desktop' else bid.inspectionRate * (bid.totalInspectedItems or 0)
            bid.totalAppraisal = bid.appraisalRate * (bid.totalInspectedItems or 0) + bid.nonAppraisalRate * (bid.totalNonInspectedItems or 0)
        if self.instance._state.adding:
            from .calculation import default_rules
            saved_settings = BidSettings.objects.filter(owner=self.user).first()
            self.instance.calculationRules = saved_settings.rules if saved_settings else default_rules()
        if self.instance.totalBid <= 0:
            self.add_error(None, 'Calculated bid total must be greater than zero.')

    class Meta:
        model = Bid
        exclude = ["owner", "inspector", "status", "agreement", "createdAt"]

    def __init__(self, *args, user, **kwargs):
        if args and args[0] is not None:
            data = args[0].copy()
            for field in ['fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue', 'other']:
                if isinstance(data.get(field), bool):
                    data[field] = '1' if data[field] else '0'
            args = (data, *args[1:])
        super().__init__(*args, **kwargs)
        self.user = user

        for field in [
            "bidAmount",
            "discount",
            "rushDiscount",
            "additionalCharges",
            "inspectionRate", "appraisalRate", "nonAppraisalRate", "rushFee", "tier",
        ]:
            self.fields[field].required = False

    def save(self, commit=True):
        bid = super().save(commit=False)
        if bid._state.adding:
            settings, _ = BidSettings.objects.get_or_create(owner=self.user)
            bid.calculationRules = settings.rules
        if commit:
            bid.save()
            self.save_m2m()
        return bid

    def clean(self):
        data = super().clean()
        if data.get('tier') is None:
            data['tier'] = 1
        for field in ['clientPhone', 'subjectContactPhone', 'state', 'clientState', 'zipCode', 'clientZipCode', 'city', 'clientCity']:
            error = contact_error(field, data.get(field))
            if error:
                self.add_error(field, error)


        for field in [
            "bidAmount",
            "discount",
            "rushDiscount",
            "additionalCharges",
            "inspectionRate", "appraisalRate", "nonAppraisalRate", "rushFee",
        ]:
            if data.get(field) is None:
                data[field] = Decimal("0")

        if data.get("appraisalType") == "Machinery & Equipment (M&E)":
            if data.get("reportFormat") not in ["Onsite", "Desktop"]:
                self.add_error(
                    "reportFormat",
                    "Choose Onsite or Desktop.",
                )

            data["additionalCharges"] = Decimal("0")
            if data.get('reportFormat') == 'Desktop':
                for field in ['total', 'nonRushTotal']:
                    data[field] = None
                data['inspectionRate'] = Decimal('0')
                data['meNote'] = ''

        return data

class ClientForm(forms.ModelForm):
    class Meta:
        model = Client
        fields = [
            "name",
            "businessName",
            "email",
            "phone",
            "fax",
            "streetAddress",
            "city",
            "state",
            "zipCode",
        ]

    def clean(self):
        data = super().clean()

        # Reuse the validation already added to this project.
        validation_fields = {
            "phone": "clientPhone",
            "fax": "clientPhone",
            "city": "city",
            "state": "state",
            "zipCode": "zipCode",
        }

        for field, validation_field in validation_fields.items():
            error = contact_error(validation_field, data.get(field))
            if error:
                self.add_error(field, error)

        if data.get("state"):
            data["state"] = data["state"].upper()

        return data

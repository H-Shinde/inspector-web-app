from decimal import Decimal
from django import forms
from django.utils import timezone
from .calculation import current_settings_rules

from .models import Bid, Inspector, Client, BidSettings
from .validation import contact_error


class BidForm(forms.ModelForm):
    def _post_clean(self):
        super()._post_clean()
        if self.errors:
            return
        bid = self.instance
        routing_changed = self.original_pricing_type != (bid.appraisalType, bid.reportFormat)
        if bid._state.adding or (routing_changed and bid.calculationVersion in ['tiers-v1', 'rates-v1']):
            bid.calculationVersion = 'tiers-v1' if bid.appraisalType == 'Machinery & Equipment (M&E)' and bid.reportFormat == 'Onsite' else 'rates-v1'
            if bid.calculationVersion != 'tiers-v1':
                bid.tier = 1
                bid.tierRates = None
        if self.instance.calculationVersion == 'tiers-v1':
            from .tier_rates import subtotals, rate, default_tier_tables
            bid = self.instance
            if bid._state.adding or not bid.tierRates:
                saved = BidSettings.objects.filter(owner=self.user).first()
                bid.tierRates = saved.tierRates if saved else default_tier_tables()
            tables = bid.tierRates or default_tier_tables()
            bid.inspectionRate = rate(tables['inspection'], bid.tier, bid.totalInspectedItems or 0)
            bid.appraisalRate = rate(tables['appraisal'], bid.tier, bid.totalInspectedItems or 0)
            bid.total, bid.totalAppraisal = subtotals(bid)
        elif self.instance.calculationVersion == 'rates-v1':
            bid = self.instance
            bid.total = Decimal('0') if bid.reportFormat == 'Desktop' else bid.inspectionRate * (bid.totalInspectedItems or 0)
            bid.totalAppraisal = bid.appraisalRate * (bid.totalInspectedItems or 0) + bid.nonAppraisalRate * (bid.totalNonInspectedItems or 0)
        if self.instance._state.adding:
            from .calculation import default_rules
            saved_settings = BidSettings.objects.filter(owner=self.user).first()
            self.instance.calculationRules = current_settings_rules(saved_settings.rules if saved_settings else default_rules())
        if self.instance.totalBid <= 0:
            self.add_error(None, 'Calculated bid total must be greater than zero.')

    class Meta:
        model = Bid
        exclude = ["owner", "inspector", "status", "agreement", "createdAt"]

    def __init__(self, *args, user, **kwargs):
        if args and args[0] is not None:
            data = args[0].copy()
            instance = kwargs.get('instance')
            if instance is None or instance._state.adding:
                if data.get('completionDays') in [None, '']:
                    data['completionDays'] = 5
                if data.get('date') in [None, '']:
                    data['date'] = timezone.localdate().isoformat()
            for field in ['fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue', 'other']:
                if isinstance(data.get(field), bool):
                    data[field] = '1' if data[field] else '0'
            args = (data, *args[1:])
        super().__init__(*args, **kwargs)
        self.user = user
        self.original_pricing_type = (self.instance.appraisalType, self.instance.reportFormat)

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
            bid.calculationRules = current_settings_rules(settings.rules)
        if commit:
            bid.save()
            self.save_m2m()
        return bid

    def clean(self):
        data = super().clean()
        if (data.get('totalInspectedItems') or 0) + (data.get('totalNonInspectedItems') or 0) > 5000:
            self.add_error('totalInspectedItems', 'A job supports up to 5000 items in total.')
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

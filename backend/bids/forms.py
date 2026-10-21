from decimal import Decimal

from django import forms

from .models import Bid, Inspector


class BidForm(forms.ModelForm):
    class Meta:
        model = Bid
        exclude = ["owner", "status", "agreement", "createdAt"]

    def __init__(self, *args, user, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["inspector"].queryset = Inspector.objects.filter(
            owner=user,
            is_active=True,
        )

        for field in [
            "bidAmount",
            "discount",
            "rushDiscount",
            "additionalCharges",
        ]:
            self.fields[field].required = False

    def clean(self):
        data = super().clean()

        for field in [
            "bidAmount",
            "discount",
            "rushDiscount",
            "additionalCharges",
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

        return data
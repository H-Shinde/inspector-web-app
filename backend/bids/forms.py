from decimal import Decimal
from django import forms

from .models import Bid, Inspector, Client
from .validation import contact_error


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
        for field in ['clientPhone', 'subjectContactPhone', 'state', 'clientState', 'zipCode', 'clientZipCode', 'city', 'clientCity']:
            error = contact_error(field, data.get(field))
            if error:
                self.add_error(field, error)


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
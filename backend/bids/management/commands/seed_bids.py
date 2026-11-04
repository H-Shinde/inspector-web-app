from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from bids.models import Bid, Inspector


class Command(BaseCommand):
    help = "Create three sample pending bids for each active user. Safe to run repeatedly."

    @transaction.atomic
    def handle(self, *args, **options):
        call_command("seed_inspectors", stdout=self.stdout)
        created_count = 0
        samples = [
            ("Sample — Harbor Coffee", "Business Valuation (BV)", "", "2500.00", "New York", "NY"),
            ("Sample — Summit Manufacturing", "Machinery & Equipment (M&E)", "Onsite", "4200.00", "Newark", "NJ"),
            ("Sample — Greenfield Equipment", "Machinery & Equipment (M&E)", "Desktop", "1800.00", "Hartford", "CT"),
        ]
        for user in get_user_model().objects.filter(is_active=True):
            inspectors = list(Inspector.objects.filter(owner=user, is_active=True).order_by("pk"))
            if not inspectors:
                continue
            for index, (business, appraisal, report, amount, city, state) in enumerate(samples):
                # Include archived samples in the lookup so reruns don't restore declined/deleted bids.
                if Bid.objects.filter(owner=user, businessName=business, clientEmail="sample.lender@example.com").exists():
                    continue
                bid = Bid(
                    owner=user, inspector=inspectors[index % len(inspectors)],
                    businessName=business, appraisalType=appraisal, reportFormat=report,
                    businessAddress=f"{100 + index} Example Street", city=city, state=state,
                    zipCode=["10001", "07102", "06103"][index],
                    propertyType="Commercial", name=["Avery Reed", "Morgan Ellis", "Casey Taylor"][index],
                    subjectContactEmail=f"sample.contact{index + 1}@example.com",
                    clientCompany="Sample Lending Company", clientName="Jamie Parker",
                    clientEmail="sample.lender@example.com", clientCity=city, clientState=state,
                    intendedUse="Loan underwriting", intendedUser="Sample Lending Company",
                    valueType="Fair Market Value", completionDays=14, bidAmount=Decimal(amount),
                    pdfOnly=index == 0, discount=Decimal("50.00") if index == 0 else Decimal("0"),
                )
                bid.full_clean()
                bid.save()
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} sample bids."))

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Inspector(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=200)
    email = models.EmailField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Bid(models.Model):
    APPRAISAL_TYPES = [
        ("Business Valuation (BV)", "Business Valuation (BV)"),
        (
            "Machinery & Equipment (M&E)",
            "Machinery & Equipment (M&E)",
        ),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    inspector = models.ForeignKey(
        Inspector,
        on_delete=models.PROTECT,
    )

    appraisalType = models.CharField(
        max_length=50,
        choices=APPRAISAL_TYPES,
    )
    reportFormat = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=20,
        default="Pending",
        editable=False,
    )

    businessName = models.CharField(max_length=250)
    propertyType = models.CharField(max_length=200, blank=True)
    businessAddress = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=150, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zipCode = models.CharField(max_length=20, blank=True)

    clientCompany = models.CharField(max_length=250, blank=True)
    clientName = models.CharField(max_length=200, blank=True)
    clientStreetAddress = models.CharField(max_length=300, blank=True)
    clientCity = models.CharField(max_length=150, blank=True)
    clientState = models.CharField(max_length=100, blank=True)
    clientZipCode = models.CharField(max_length=20, blank=True)
    clientPhone = models.CharField(max_length=50, blank=True)
    clientEmail = models.EmailField(blank=True)

    name = models.CharField(max_length=200)
    subjectContactEmail = models.EmailField(blank=True)
    subjectContactPhone = models.CharField(max_length=50, blank=True)

    valueType = models.CharField(max_length=200, blank=True)
    valueDate = models.DateField(null=True, blank=True)
    intendedUse = models.CharField(max_length=300, blank=True)
    intendedUser = models.CharField(max_length=200, blank=True)
    completionDays = models.PositiveIntegerField(null=True, blank=True)
    date = models.DateField(default=timezone.localdate)

    rush = models.BooleanField(default=False)
    pdfOnly = models.BooleanField(default=False)

    bidAmount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0"))],
    )
    discount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0"))],
    )
    rushDiscount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0"))],
    )
    additionalCharges = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal("0"))],
    )

    agreement = models.FileField(
        upload_to="bid-agreements/",
        blank=True,
    )
    createdAt = models.DateTimeField(auto_now_add=True)

    @property
    def referenceNumber(self):
        return f"BID-{self.pk:06d}"

    @property
    def totalBid(self):
        if self.appraisalType == "Machinery & Equipment (M&E)":
            return self.bidAmount

        return (
            self.bidAmount
            - self.discount
            - (self.rushDiscount if self.rush else Decimal("0"))
            + self.additionalCharges
        )

    def __str__(self):
        return f"{self.referenceNumber} — {self.businessName}"
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from .calculation import default_rules, calculate_total

class Client(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=200)
    businessName = models.CharField(max_length=250, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    fax = models.CharField(max_length=50, blank=True)
    streetAddress = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=150, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zipCode = models.CharField(max_length=10, blank=True)

    def __str__(self):
        return self.name
        
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
        ("Business Valuation (BV)", "Business Valuation"),
        ("Calculation Valuation", "Calculation Valuation"),
        (
            "Machinery & Equipment (M&E)",
            "Machinery and Equipment",
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

    fmvContinuedUse = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    fairMarketValueRemoved = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    orderlyLiquidationValue = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    forcedLiquidationValue = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    totalAppraisal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    nonRushTotal = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])
    totalInspectedItems = models.PositiveIntegerField(null=True, blank=True)
    totalNonInspectedItems = models.PositiveIntegerField(null=True, blank=True)
    other = models.TextField(blank=True)
    additionalLocations = models.TextField(blank=True)
    meNote = models.TextField(blank=True)

    agreement = models.FileField(
        upload_to="bid-agreements/",
        blank=True,
    )
    calculationRules = models.JSONField(null=True, blank=True, editable=False)
    createdAt = models.DateTimeField(auto_now_add=True)

    @property
    def referenceNumber(self):
        return f"BID-{self.pk:06d}"

    @property
    def totalBid(self):
        return calculate_total(self)

    def __str__(self):
        return f"{self.referenceNumber} — {self.businessName}"

class BidSettings(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rules = models.JSONField(default=default_rules)

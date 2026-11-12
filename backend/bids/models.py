from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone
from .calculation import default_rules, calculate_total
from .tier_rates import default_tier_tables, default_appraisal_tiers

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
    invitationNonce = models.UUIDField(null=True, blank=True, editable=False)
    invitationSentAt = models.DateTimeField(null=True, blank=True, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='inspector_profile')
    rating = models.PositiveSmallIntegerField(default=0, validators=[MaxValueValidator(5)])
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=300, blank=True)
    city = models.CharField(max_length=150, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zipCode = models.CharField(max_length=10, blank=True)
    focus = models.CharField(max_length=30, default='Inspection', choices=[('Inspection', 'Inspection'), ('Appraisal', 'Appraisal'), ('Appraisal, Inspection', 'Appraisal, Inspection')])
    region = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
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
        null=True, blank=True, editable=False,
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

    name = models.CharField(max_length=200, blank=True)
    subjectContactEmail = models.EmailField(blank=True)
    subjectContactPhone = models.CharField(max_length=50, blank=True)

    valueType = models.CharField(max_length=200, blank=True)
    valueDate = models.DateField(null=True, blank=True)
    intendedUse = models.CharField(max_length=300, blank=True)
    intendedUser = models.CharField(max_length=200, blank=True)
    completionDays = models.PositiveIntegerField(null=True, blank=True)
    date = models.DateField(default=timezone.localdate)

    rush = models.BooleanField(default=False)
    consolidationFee = models.BooleanField(default=False)
    tier = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)])
    calculationVersion = models.CharField(max_length=20, default='legacy', editable=False)
    inspectionRate = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))])
    appraisalRate = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))])
    nonAppraisalRate = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))])
    rushFee = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0'))])
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
    tierRates = models.JSONField(null=True, blank=True, editable=False)
    appraisalTierRates = models.JSONField(null=True, blank=True, editable=False)
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
    tierRates = models.JSONField(default=default_tier_tables)
    appraisalTierRates = models.JSONField(default=default_appraisal_tiers)


class Job(models.Model):
    inspectionParts = models.JSONField(default=list, blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    source_bid = models.OneToOneField(Bid, on_delete=models.PROTECT, related_name='job')
    inspector = models.ForeignKey(Inspector, on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=30, default='Unassigned', choices=[(value, value) for value in ['Unassigned', 'Assigned', 'In-Progress', 'Pending Review', 'Needs Changes', 'Complete', 'Deleted']])
    previousStatus = models.CharField(max_length=30, blank=True)
    reviewNotes = models.TextField(blank=True)
    items = models.JSONField(default=list, blank=True)
    sectionDetails = models.JSONField(default=dict, blank=True)
    valuationHistory = models.JSONField(default=list, blank=True)
    revision = models.PositiveIntegerField(default=0)
    createdAt = models.DateTimeField(auto_now_add=True)
    completedAt = models.DateTimeField(null=True, blank=True)
    deletedAt = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'JOB-{self.pk:06d} — {self.source_bid.businessName}'


def initial_job_section_details(bid):
    """Copy bid valuation and fee values into a newly accepted job."""
    def value(field):
        current = getattr(bid, field, None)
        if current is None:
            return ''
        if isinstance(current, bool):
            return '1' if current else '0'
        return str(current)

    return {
        'Asset Valuation': {
            field: value(field)
            for field in [
                'fmvContinuedUse', 'fairMarketValueRemoved',
                'orderlyLiquidationValue', 'forcedLiquidationValue',
                'other', 'additionalLocations',
            ]
        },
        'Inspection Fees': {
            'totalInspectedItems': value('totalInspectedItems'),
            'totalNonInspectedItems': value('totalNonInspectedItems'),
            'totalAppraisal': value('totalAppraisal'),
            'rush': value('rush'),
            'pdfDiscount': value('discount'),
            'total': value('total'),
            'nonRushTotal': value('nonRushTotal'),
            'meNote': value('meNote'),
        },
    }


def bid_item_count(bid):
    return bid.totalInspectedItems or 0


def initial_job_items(bid):
    return [{'itemId': f'bid-{bid.pk}-item-{index + 1}', 'name': f'Item {index + 1}', 'qty': '1'}
            for index in range(bid_item_count(bid))]


class Message(models.Model):
    inspector = models.ForeignKey(Inspector, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(blank=True)
    clientId = models.UUIDField()
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['inspector', 'sender', 'clientId'], name='unique_message_delivery')]
        ordering = ['id']


class MessageAttachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='message-attachments/')
    name = models.CharField(max_length=255)
    contentType = models.CharField(max_length=100)


class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    realm = models.CharField(max_length=12, choices=[('admin', 'Admin'), ('inspector', 'Inspector')])
    kind = models.CharField(max_length=20)
    objectId = models.PositiveBigIntegerField()
    conversationId = models.PositiveBigIntegerField(null=True, blank=True)
    version = models.PositiveIntegerField(default=0)
    isNew = models.BooleanField(default=False)
    title = models.CharField(max_length=300)
    target = models.CharField(max_length=300)
    createdAt = models.DateTimeField(auto_now_add=True)
    readAt = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['recipient', 'realm', 'readAt'], name='notification_unread_idx')]
        ordering = ['-id']


class InspectionPhoto(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='inspection_photos')
    partId = models.CharField(max_length=100)
    file = models.FileField(upload_to='inspection-photos/')
    name = models.CharField(max_length=255)
    contentType = models.CharField(max_length=50)
    createdAt = models.DateTimeField(auto_now_add=True)

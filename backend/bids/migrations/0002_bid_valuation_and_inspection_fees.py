from decimal import Decimal
from django.core.validators import MinValueValidator
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("bids", "0001_initial")]
    operations = [
        migrations.AddField(model_name="bid", name="fmvContinuedUse", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="fairMarketValueRemoved", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="orderlyLiquidationValue", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="forcedLiquidationValue", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="totalAppraisal", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="total", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="nonRushTotal", field=models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))])),
        migrations.AddField(model_name="bid", name="totalInspectedItems", field=models.PositiveIntegerField(null=True, blank=True)),
        migrations.AddField(model_name="bid", name="totalNonInspectedItems", field=models.PositiveIntegerField(null=True, blank=True)),
        migrations.AddField(model_name="bid", name="other", field=models.TextField(blank=True)),
        migrations.AddField(model_name="bid", name="additionalLocations", field=models.TextField(blank=True)),
        migrations.AddField(model_name="bid", name="meNote", field=models.TextField(blank=True)),
    ]

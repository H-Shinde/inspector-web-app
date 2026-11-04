from django.db import migrations


def update_percentages(apps, schema_editor):
    Settings = apps.get_model('bids', 'BidSettings')
    rates = {'fmvContinuedUse': '0.00', 'fairMarketValueRemoved': '5.00', 'orderlyLiquidationValue': '5.00', 'forcedLiquidationValue': '2.00'}
    for settings in Settings.objects.using(schema_editor.connection.alias).all().iterator():
        for terms in settings.rules.values():
            for field, rate in rates.items():
                term = next((entry for entry in terms if entry['field'] == field), None)
                values = dict(field=field, multiplier=rate, operation='add', when='always', mode='percentage')
                if term is None:
                    terms.append(values)
                else:
                    term.update(values)
        settings.save(using=schema_editor.connection.alias, update_fields=['rules'])


class Migration(migrations.Migration):
    dependencies = [('bids', '0017_bid_tier')]
    operations = [migrations.RunPython(update_percentages, migrations.RunPython.noop)]

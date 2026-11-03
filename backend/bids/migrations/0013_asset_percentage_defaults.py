from django.db import migrations


def update_defaults(apps, schema_editor):
    Settings = apps.get_model('bids', 'BidSettings')
    for settings in Settings.objects.using(schema_editor.connection.alias).all().iterator():
        for terms in settings.rules.values():
            for field, rate in [('fairMarketValueRemoved', '5.00'), ('orderlyLiquidationValue', '2.00'), ('forcedLiquidationValue', '1.00'), ('other', '10.00')]:
                term = next((entry for entry in terms if entry['field'] == field), None)
                values = dict(field=field, operation='add', multiplier=rate, when='always', mode='percentage')
                if term is None:
                    terms.append(values)
                else:
                    term.update(values)
        settings.save(using=schema_editor.connection.alias, update_fields=['rules'])


class Migration(migrations.Migration):
    dependencies = [('bids', '0012_default_email_pdf_and_rush_fees')]
    operations = [migrations.RunPython(update_defaults, migrations.RunPython.noop)]

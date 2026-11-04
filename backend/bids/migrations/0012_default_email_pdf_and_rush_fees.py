from copy import deepcopy
from django.db import migrations


def update_defaults(apps, schema_editor):
    alias = schema_editor.connection.alias
    Settings = apps.get_model('bids', 'BidSettings')
    for settings in Settings.objects.using(alias).all().iterator():
        rules = deepcopy(settings.rules)
        for terms in rules.values():
            for field, amount, operation in [('discount', '100.00', 'subtract'), ('rushDiscount', '400.00', 'add')]:
                term = next((entry for entry in terms if entry['field'] == field), None)
                if term is None:
                    terms.append({'field': field, 'multiplier': amount, 'operation': operation, 'when': 'always'})
                elif str(term.get('multiplier')) in ['1', '1.0', '1.00']:
                    term.update(multiplier=amount, operation=operation, when='always')
        settings.rules = rules
        settings.save(using=alias, update_fields=['rules'])


class Migration(migrations.Migration):
    dependencies = [('bids', '0011_bid_appraisalrate_bid_calculationversion_and_more')]
    operations = [migrations.RunPython(update_defaults, migrations.RunPython.noop)]

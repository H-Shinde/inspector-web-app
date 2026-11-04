from copy import deepcopy
from django.db import migrations

TYPES = ['Business Valuation (BV)', 'Calculation Valuation', 'Machinery & Equipment (M&E)']
ASSETS = ['fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue']


def upgrade(apps, schema_editor):
    Bid = apps.get_model('bids', 'Bid')
    Settings = apps.get_model('bids', 'BidSettings')
    alias = schema_editor.connection.alias
    valuation = [
        {'field': 'bidAmount', 'operation': 'add', 'multiplier': '1.00', 'when': 'always'},
        {'field': 'discount', 'operation': 'subtract', 'multiplier': '1.00', 'when': 'always'},
        {'field': 'rushDiscount', 'operation': 'subtract', 'multiplier': '1.00', 'when': 'rush'},
        {'field': 'additionalCharges', 'operation': 'add', 'multiplier': '1.00', 'when': 'always'},
    ]
    legacy = {TYPES[0]: deepcopy(valuation), TYPES[1]: deepcopy(valuation), TYPES[2]: [deepcopy(valuation[0])]}
    Bid.objects.using(alias).filter(calculationRules__isnull=True).update(calculationRules=legacy)
    for settings in Settings.objects.using(alias).all().iterator():
        for bid_type in TYPES:
            terms = settings.rules.setdefault(bid_type, deepcopy(legacy[bid_type]))
            # Convert account settings to percentages with a 5% starting rate.
            # Saved bid snapshots retain their earlier fixed-fee semantics.
            for field in ASSETS:
                term = next((entry for entry in terms if entry['field'] == field), None)
                if term is None:
                    terms.append({'field': field, 'operation': 'add', 'multiplier': '5.00', 'when': 'always', 'mode': 'percentage'})
                elif term.get('mode') != 'percentage':
                    term.update(operation='add', multiplier='5.00', mode='percentage')
        settings.save(using=alias, update_fields=['rules'])


class Migration(migrations.Migration):
    dependencies = [('bids', '0008_job')]
    operations = [migrations.RunPython(upgrade, migrations.RunPython.noop)]

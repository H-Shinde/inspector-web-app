from django.db import migrations


def add_fee(apps, schema_editor):
    for model in ['BidSettings', 'Bid']:
        Model = apps.get_model('bids', model)
        for record in Model.objects.using(schema_editor.connection.alias).all().iterator():
            field = 'rules' if model == 'BidSettings' else 'calculationRules'
            rules = getattr(record, field)
            if not rules:
                continue
            for terms in rules.values():
                if not any(term['field'] == 'consolidationFee' for term in terms):
                    terms.append(dict(field='consolidationFee', operation='add', multiplier='100.00', when='always'))
            record.save(using=schema_editor.connection.alias, update_fields=[field])


class Migration(migrations.Migration):
    dependencies = [('bids', '0015_bid_consolidationfee')]
    operations = [migrations.RunPython(add_fee, migrations.RunPython.noop)]

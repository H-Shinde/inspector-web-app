from django.db import migrations


ASSET_FIELDS = [
    'fmvContinuedUse', 'fairMarketValueRemoved',
    'orderlyLiquidationValue', 'forcedLiquidationValue',
    'other', 'additionalLocations',
]


def copy_bid_details(apps, schema_editor):
    Job = apps.get_model('bids', 'Job')
    alias = schema_editor.connection.alias

    def value(bid, field):
        current = getattr(bid, field, None)
        if current is None:
            return ''
        if isinstance(current, bool):
            return '1' if current else '0'
        return str(current)

    for job in Job.objects.using(alias).select_related('source_bid').all().iterator():
        bid = job.source_bid
        sections = dict(job.sectionDetails or {})
        asset = dict(sections.get('Asset Valuation') or {})
        fees = dict(sections.get('Inspection Fees') or {})

        for field in ASSET_FIELDS:
            asset.setdefault(field, value(bid, field))
        for target, source in [
            ('totalInspectedItems', 'totalInspectedItems'),
            ('totalNonInspectedItems', 'totalNonInspectedItems'),
            ('totalAppraisal', 'totalAppraisal'),
            ('rush', 'rush'),
            ('pdfDiscount', 'discount'),
            ('total', 'total'),
            ('nonRushTotal', 'nonRushTotal'),
            ('meNote', 'meNote'),
        ]:
            fees.setdefault(target, value(bid, source))

        sections['Asset Valuation'] = asset
        sections['Inspection Fees'] = fees
        job.sectionDetails = sections
        job.save(using=alias, update_fields=['sectionDetails'])


class Migration(migrations.Migration):
    dependencies = [('bids', '0009_asset_valuation_percentages')]
    operations = [migrations.RunPython(copy_bid_details, migrations.RunPython.noop)]

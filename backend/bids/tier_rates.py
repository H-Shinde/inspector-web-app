from decimal import Decimal, InvalidOperation

APPRAISED_INSPECTION = [
    ['32.50', '27.50', '25', '22.50', '20'],
    ['35', '30', '27.50', '25', '22.50'],
    ['37.50', '32.50', '30', '27.50', '25'],
    ['40', '35', '32.50', '30', '27.50'],
    ['42.50', '37.50', '35', '32.50', '30'],
]
NON_APPRAISED_INSPECTION = [
    ['5', '4', '3', '2', '1'], ['6', '5', '4', '3', '2'],
    ['6.50', '5.50', '4.50', '3.50', '2.50'],
    ['7', '6.50', '5.50', '4.50', '3.50'], ['7', '6.50', '5.50', '4.50', '3.50'],
]
APPRAISAL = [
    ['32.50', '30', '28', '26', '24'], ['35', '33', '31', '28', '26'],
    ['37.50', '36', '34', '30', '28'], ['40', '37', '36', '32.50', '30'],
    ['42.50', '40', '37', '35', '33'],
]


def default_appraisal_tiers():
    return [row[:] for row in APPRAISAL]


def rate(table, tier, count):
    return Decimal(table[tier - 1][min(max((count - 1) // 10, 0), 4)])


def subtotals(bid):
    tables = getattr(bid, 'tierRates', None) or default_tier_tables()
    appraised = bid.totalInspectedItems or 0
    non_appraised = bid.totalNonInspectedItems or 0
    inspection = Decimal('0') if bid.reportFormat == 'Desktop' else (
        rate(tables['inspection'], bid.tier, appraised) * appraised
        + rate(tables['nonAppraisedInspection'], bid.tier, non_appraised) * non_appraised
    )
    appraisal = rate(tables['appraisal'], bid.tier, appraised) * appraised + (bid.nonAppraisalRate or 0) * non_appraised
    return inspection, appraisal


def default_tier_tables():
    return {'inspection': [row[:] for row in APPRAISED_INSPECTION],
            'nonAppraisedInspection': [row[:] for row in NON_APPRAISED_INSPECTION],
            'appraisal': default_appraisal_tiers()}


def validate_tier_tables(tables):
    if not isinstance(tables, dict) or set(tables) != set(default_tier_tables()):
        raise ValueError('Provide all three tier tables.')
    result = {}
    for key, rows in tables.items():
        if not isinstance(rows, list) or len(rows) != 5:
            raise ValueError('Each table requires five tiers.')
        result[key] = []
        for row in rows:
            if not isinstance(row, list) or len(row) != 5:
                raise ValueError('Each tier requires five quantity rates.')
            normalized = []
            for value in row:
                try:
                    amount = Decimal(str(value))
                    if not amount.is_finite() or amount < 0 or amount > 1000000 or amount != amount.quantize(Decimal('0.01')):
                        raise ValueError()
                except (ValueError, InvalidOperation):
                    raise ValueError('Rates must be between 0 and 1000000 with at most two decimal places.')
                normalized.append(format(amount, '.2f'))
            result[key].append(normalized)
    return result

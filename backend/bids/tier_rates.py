from decimal import Decimal

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
    ['37.50', '36', '34', '30', '28'], ['40', '37.50', '36', '32.50', '30'],
    ['42.50', '40', '37', '35', '33'],
]


def rate(table, tier, count):
    return Decimal(table[tier - 1][min(max((count - 1) // 10, 0), 4)])


def subtotals(bid):
    appraised = bid.totalInspectedItems or 0
    non_appraised = bid.totalNonInspectedItems or 0
    inspection = Decimal('0') if bid.reportFormat == 'Desktop' else (
        rate(APPRAISED_INSPECTION, bid.tier, appraised) * appraised
        + rate(NON_APPRAISED_INSPECTION, bid.tier, non_appraised) * non_appraised
    )
    appraisal = rate(APPRAISAL, bid.tier, appraised) * appraised + (bid.nonAppraisalRate or 0) * non_appraised
    return inspection, appraisal

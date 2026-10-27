from copy import deepcopy
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

TYPES = ['Business Valuation (BV)', 'Calculation Valuation', 'Machinery & Equipment (M&E)']
FIELDS = {
    'bidAmount': 'Appraisal fee', 'discount': 'PDF discount',
    'rushDiscount': 'Rush discount', 'additionalCharges': 'Additional charges',
    'completionDays': 'Completion days', 'fmvContinuedUse': 'FMV in continued use',
    'fairMarketValueRemoved': 'Fair market value removed',
    'orderlyLiquidationValue': 'Orderly liquidation value',
    'forcedLiquidationValue': 'Forced liquidation value',
    'totalInspectedItems': 'Total inspected items',
    'totalNonInspectedItems': 'Total non-inspected items',
    'totalAppraisal': 'Total appraisal', 'total': 'Inspection total',
    'nonRushTotal': 'Non-rush total', 'additionalLocations': 'Additional locations',
    'rush': 'Rush checkbox', 'pdfOnly': 'PDF Only checkbox',
}
CHECKBOX_FIELDS = {'rush', 'pdfOnly', 'fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue'}


def default_rules():
    valuation = [
        {'field': 'bidAmount', 'operation': 'add', 'multiplier': '1.00', 'when': 'always'},
        {'field': 'discount', 'operation': 'subtract', 'multiplier': '1.00', 'when': 'always'},
        {'field': 'rushDiscount', 'operation': 'subtract', 'multiplier': '1.00', 'when': 'rush'},
        {'field': 'additionalCharges', 'operation': 'add', 'multiplier': '1.00', 'when': 'always'},
    ]
    return {TYPES[0]: deepcopy(valuation), TYPES[1]: deepcopy(valuation), TYPES[2]: [deepcopy(valuation[0])]}


def validate_rules(rules):
    if not isinstance(rules, dict) or set(rules) != set(TYPES):
        raise ValueError('Provide a formula for each bid type.')
    result = {}
    for bid_type, terms in rules.items():
        if not isinstance(terms, list) or not terms or len(terms) > len(FIELDS):
            raise ValueError('Each formula needs at least one field.')
        seen = set()
        result[bid_type] = []
        for term in terms:
            if not isinstance(term, dict) or set(term) != {'field', 'operation', 'multiplier', 'when'}:
                raise ValueError('Invalid formula entry.')
            field = term['field']
            if not isinstance(field, str) or field not in FIELDS or field in seen:
                raise ValueError('Choose unique, supported fields.')
            if bid_type == TYPES[2] and field == 'additionalCharges':
                raise ValueError('Additional charges are not available for Machinery and Equipment.')
            if term['operation'] not in ['add', 'subtract'] or term['when'] not in ['always', 'rush', 'pdfOnly', 'notRush', 'notPdfOnly']:
                raise ValueError('Choose a valid operation and condition.')
            try:
                multiplier = Decimal(str(term['multiplier']))
                if not multiplier.is_finite() or not 0 <= multiplier <= 1000000 or multiplier != multiplier.quantize(Decimal('.01')):
                    raise ValueError('Multipliers must be between 0 and 1000000 with up to two decimal places.')
            except (InvalidOperation, TypeError):
                raise ValueError('Enter a valid multiplier.')
            seen.add(field)
            result[bid_type].append({**term, 'multiplier': str(multiplier.quantize(Decimal('.01')))})
    return result


def calculate_total(bid):
    rules = bid.calculationRules or default_rules()
    total = Decimal('0')
    for term in rules.get(bid.appraisalType, []):
        condition = term['when']
        if condition == 'rush' and not bid.rush or condition == 'pdfOnly' and not bid.pdfOnly:
            continue
        if condition == 'notRush' and bid.rush or condition == 'notPdfOnly' and bid.pdfOnly:
            continue
        value = getattr(bid, term['field'], 0) or 0
        if term['field'] in CHECKBOX_FIELDS:
            value = 1 if value else 0
        try:
            value = Decimal(str(value))
        except InvalidOperation:
            value = Decimal('0')
        contribution = (value * Decimal(term['multiplier'])).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        total += contribution if term['operation'] == 'add' else -contribution
    return total.quantize(Decimal('.01'))

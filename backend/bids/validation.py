import re

STATE_CODES = set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR VI'.split())
PHONE = re.compile(r'(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}(?:\s*(?:ext\.?|x|#)\s*\d{1,6})?', re.I)


def contact_error(field, value):
    text = str(value or '').strip()
    if not text:
        return ''
    if field in ['clientPhone', 'subjectContactPhone'] and not PHONE.fullmatch(text):
        return 'Enter a 10-digit phone number, optionally with +1 and an extension.'
    if field in ['state', 'clientState'] and text.upper() not in STATE_CODES:
        return 'Enter a valid two-letter state code.'
    if field in ['zipCode', 'clientZipCode'] and not re.fullmatch(r'\d{5}(?:-\d{4})?', text):
        return 'Enter a 5-digit ZIP code or ZIP+4.'
    if field in ['city', 'clientCity'] and (not text[0].isalpha() or not all(c.isalpha() or c in " .’'-" for c in text)):
        return 'Enter a valid city name.'
    return ''

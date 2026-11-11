import uuid
from urllib.parse import urlencode, urlsplit
from django.conf import settings
from django.core import signing
from django.core.mail import get_connection, send_mail
from django.utils import timezone

INVITATION_AGE = 7 * 24 * 3600


def send_invitation(inspector):
    if inspector.user_id or not inspector.is_active:
        raise ValueError('Only an active inspector who has not registered can be invited.')
    base = settings.INSPECTOR_FRONTEND_URL.rstrip('/')
    parsed = urlsplit(base)
    if parsed.scheme not in ['http', 'https'] or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError('Configure a valid inspector app URL before sending invitations.')
    inspector.invitationNonce = uuid.uuid4()
    inspector.invitationSentAt = timezone.now()
    inspector.save(update_fields=['invitationNonce', 'invitationSentAt'])
    token = signing.dumps({'inspectorId': inspector.pk, 'email': inspector.email, 'nonce': str(inspector.invitationNonce)}, salt='inspector-registration')
    url = base + '/?' + urlencode({'token': token})
    connection = get_connection()
    sent = send_mail('You are invited to Bison Valuation',
                    'You have been invited to the private Bison Valuation inspector app.\n\n'
                    f'Create your inspector account using your personal registration link:\n{url}\n\n'
                    f'Register with this email address: {inspector.email}\n'
                    'This link expires in 7 days and can only be used once. '
                    'A new invitation replaces any previous registration link.\n\n'
                    'If you were not expecting this invitation, you can ignore this email.\n\nBison Valuation',
                    settings.DEFAULT_FROM_EMAIL, [inspector.email], fail_silently=False, connection=connection)
    if sent != 1:
        raise RuntimeError('The email service did not accept the invitation.')
    module = type(connection).__module__
    if module.endswith('.console'): return 'console'
    return 'development' if module.endswith(('.filebased', '.locmem', '.dummy')) else 'email'

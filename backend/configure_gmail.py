"""Run locally: .venv/Scripts/python.exe backend/configure_gmail.py.
Credentials are entered in the terminal, never passed as command arguments.
"""
import getpass
import json
import os
from pathlib import Path
import re
import smtplib
import ssl
from urllib.parse import urlsplit


def gmail_config(address, password, inspector_url, previous=None):
    address = address.strip()
    password = ''.join(password.split())
    if not re.fullmatch(r'[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+', address):
        raise ValueError('Enter the full Gmail or Google Workspace email address.')
    if len(password) != 16 or not password.isalnum():
        raise ValueError('Use the 16-character Google app password, not your normal account password.')
    inspector_url = inspector_url.strip().rstrip('/')
    url = urlsplit(inspector_url)
    if url.scheme not in ['http', 'https'] or not url.netloc or url.query or url.fragment:
        raise ValueError('Enter a valid inspector-app URL.')
    values = dict(previous or {})
    values.update(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend', EMAIL_HOST='smtp.gmail.com',
                  EMAIL_PORT='587', EMAIL_USE_TLS='true', EMAIL_USE_SSL='false',
                  EMAIL_HOST_USER=address, EMAIL_HOST_PASSWORD=password,
                  DEFAULT_FROM_EMAIL=f'Bison Valuation <{address}>', INSPECTOR_FRONTEND_URL=inspector_url)
    return values


def verify_gmail(values):
    with smtplib.SMTP('smtp.gmail.com', 587, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(values['EMAIL_HOST_USER'], values['EMAIL_HOST_PASSWORD'])


def main():
    destination = Path(__file__).resolve().parent / 'email_config.json'
    previous = json.loads(destination.read_text(encoding='utf-8')) if destination.exists() else {}
    print('Gmail invitation email setup')
    print('Enable Google 2-Step Verification, then create an app password at https://myaccount.google.com/apppasswords')
    address = input('Sending Gmail / Google Workspace address: ')
    password = getpass.getpass('Google app password (hidden): ')
    default_url = previous.get('INSPECTOR_FRONTEND_URL', 'http://localhost:5173')
    inspector_url = input(f'Inspector app URL [{default_url}]: ').strip() or default_url
    values = gmail_config(address, password, inspector_url, previous)
    print('Checking Gmail sign-in over TLS; no email will be sent during this check...')
    verify_gmail(values)
    destination.write_text(json.dumps(values, indent=2) + chr(10), encoding='utf-8')
    password = None
    print('Gmail accepted the sign-in. Private email configuration saved (gitignored).')
    conflicts = [key for key, value in values.items() if key in os.environ and os.environ[key] != str(value)]
    if conflicts:
        print('These existing environment variables override the file; update or remove them: ' + ', '.join(conflicts))
    if urlsplit(values['INSPECTOR_FRONTEND_URL']).hostname in ['localhost', '127.0.0.1']:
        print('The inspector URL is local. Recipients on another computer need your deployed inspector-app URL.')
    print('Restart the backend, then use Resend invite in the admin Inspector directory.')


if __name__ == '__main__':
    try:
        main()
    except smtplib.SMTPAuthenticationError:
        print('Gmail rejected sign-in. Check the email, 2-Step Verification, and app password. Configuration was not changed.')
        raise SystemExit(1)
    except (OSError, smtplib.SMTPException, ValueError) as error:
        print('Setup could not finish. Check your input, network access and Gmail settings. Configuration was not changed.')
        raise SystemExit(1)

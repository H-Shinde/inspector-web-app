import json
import re
import time
from urllib.parse import urlparse, parse_qs
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core import mail, signing
from django.contrib.auth import get_user_model
from .models import Inspector

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', INSPECTOR_FRONTEND_URL='https://inspectors.example.com')
class InvitationDeliveryTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(username='invite-admin', email='admin@email.com')
        self.client.force_login(self.admin)

    def invite(self, email='invited@example.com'):
        return self.client.post('/api/inspectors/', data=json.dumps({'email': email}), content_type='application/json')

    def token(self, email=None):
        message = mail.outbox[-1]
        if email: self.assertEqual(message.to, [email])
        url = re.search(r'https://[^\s]+', message.body).group(0)
        self.assertEqual(urlparse(url).hostname, 'inspectors.example.com')
        self.assertEqual(set(parse_qs(urlparse(url).query)), {'token'})
        return parse_qs(urlparse(url).query)['token'][0]

    def register(self, token, email='invited@example.com'):
        self.client.logout()
        values = dict(token=token, fullName='Invited Inspector', email=email, password='Unique-Inspector-4829!', phone='7165550123', address='123 Main St', city='Buffalo', state='NY', zipCode='14228')
        return self.client.post('/api/inspector-registration/', data=json.dumps(values), content_type='application/json')

    def test_invite_goes_to_exact_email_with_random_signed_nonce(self):
        result = self.invite('Invited@Example.com')
        self.assertEqual(result.status_code, 201, result.content)
        token = self.token('invited@example.com')
        inspector = Inspector.objects.get(pk=result.json()['id'])
        payload = signing.loads(token, salt='inspector-registration')
        self.assertEqual(payload['email'], inspector.email)
        self.assertEqual(payload['nonce'], str(inspector.invitationNonce))
        self.assertIsNotNone(inspector.invitationSentAt)
        data = self.client.get('/api/inspector-registration/', {'token': token}).json()
        self.assertEqual(data['email'], 'invited@example.com')
        self.assertEqual(data['fullName'], '')
        self.assertNotIn('invitationNonce', result.json())
        self.assertIn('7 days', mail.outbox[-1].body)

    def test_registration_is_invite_only_bound_to_email_and_single_use(self):
        result = self.invite()
        token = self.token()
        self.assertEqual(self.register('').status_code, 400)
        self.assertEqual(self.register(token, 'someone-else@example.com').status_code, 400)
        self.assertEqual(self.register(token).status_code, 201)
        self.assertEqual(self.register(token).status_code, 400)
        self.assertEqual(self.client.get('/api/inspector-registration/', {'token': token}).status_code, 400)
        self.assertTrue(Inspector.objects.get(pk=result.json()['id']).user_id)

    def test_resend_uses_same_record_and_invalidates_old_link(self):
        result = self.invite()
        old = self.token()
        duplicate = self.invite()
        self.assertEqual(duplicate.status_code, 409)
        response = self.client.post(f"/api/inspectors/{result.json()['id']}/invite/", data='{}', content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        new = self.token('invited@example.com')
        self.assertNotEqual(old, new)
        self.assertEqual(Inspector.objects.count(), 1)
        self.assertEqual(self.client.get('/api/inspector-registration/', {'token': old}).status_code, 400)
        self.assertEqual(self.client.get('/api/inspector-registration/', {'token': new}).status_code, 200)

    def test_expired_tampered_and_inactive_links_are_rejected(self):
        result = self.invite()
        token = self.token()
        with patch('django.core.signing.time.time', return_value=time.time() + 8 * 86400):
            self.assertEqual(self.client.get('/api/inspector-registration/', {'token': token}).status_code, 400)
        self.assertEqual(self.client.get('/api/inspector-registration/', {'token': token + 'x'}).status_code, 400)
        Inspector.objects.filter(pk=result.json()['id']).update(is_active=False)
        self.assertEqual(self.client.get('/api/inspector-registration/', {'token': token}).status_code, 400)

    def test_send_failure_rolls_back_inspector_and_resend_nonce(self):
        with patch('bids.invitations.send_mail', side_effect=RuntimeError('SMTP unavailable')):
            self.assertEqual(self.invite().status_code, 503)
        self.assertFalse(Inspector.objects.exists())
        result = self.invite()
        old = self.token()
        with patch('bids.invitations.send_mail', side_effect=RuntimeError('SMTP unavailable')):
            response = self.client.post(f"/api/inspectors/{result.json()['id']}/invite/", data='{}', content_type='application/json')
            self.assertEqual(response.status_code, 503)
        self.assertEqual(self.client.get('/api/inspector-registration/', {'token': old}).status_code, 200)

    def test_only_owner_can_resend_and_registered_inspectors_use_login(self):
        result = self.invite()
        token = self.token()
        self.client.logout()
        self.assertEqual(self.client.post(f"/api/inspectors/{result.json()['id']}/invite/", data='{}', content_type='application/json').status_code, 401)
        self.assertEqual(self.register(token).status_code, 201)
        self.client.force_login(self.admin)
        self.assertEqual(self.client.post(f"/api/inspectors/{result.json()['id']}/invite/", data='{}', content_type='application/json').status_code, 409)
        self.assertEqual(self.invite().status_code, 409)

    def test_registration_and_login_leave_an_existing_admin_session_intact(self):
        result = self.invite()
        token = self.token()
        values = dict(token=token, fullName='Invited Inspector', email='invited@example.com', password='Unique-Inspector-4829!', phone='7165550123', address='123 Main St', city='Buffalo', state='NY', zipCode='14228')
        csrf = self.client.get('/api/auth/inspector-csrf/').json()['csrfToken']
        response = self.client.post('/api/inspector-registration/', data=json.dumps(values), content_type='application/json', HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code, 201, response.content)
        response = self.client.post('/api/auth/inspector-login/', data=json.dumps({'email': values['email'], 'password': values['password']}), content_type='application/json', HTTP_X_CSRFTOKEN=csrf)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.client.get('/api/auth/me/').json()['email'], self.admin.email)
        self.assertEqual(self.client.get('/api/inspector/jobs/').json()['email'], values['email'])
        self.assertEqual(get_user_model().objects.filter(email=values['email']).count(), 1)

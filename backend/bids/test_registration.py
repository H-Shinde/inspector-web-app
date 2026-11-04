import json
from django.core import signing
from django.contrib.auth import get_user_model
from django.test import TestCase
from .models import Inspector


class RegistrationTests(TestCase):
    def setUp(self):
        owner = get_user_model().objects.create_user(username='invite-owner', email='owner@example.com')
        self.inspector = Inspector.objects.create(owner=owner, name='Invited', email='invited@example.com')
        self.token = signing.dumps({'inspectorId': self.inspector.pk, 'email': self.inspector.email}, salt='inspector-registration')

    def register(self, token):
        return self.client.post('/api/inspector-registration/', data=json.dumps({'token': token, 'fullName': 'Inspector Name', 'password': 'Unique-Inspector-4829!'}), content_type='application/json')

    def test_register_hashes_password_and_prevents_reuse(self):
        result = self.register(self.token)
        self.assertEqual(result.status_code, 201, result.content)
        self.assertEqual(result.json()['inspectorId'], self.inspector.pk)
        self.inspector.refresh_from_db()
        self.assertTrue(self.inspector.user.check_password('Unique-Inspector-4829!'))
        self.assertEqual(self.inspector.user.email, 'invited@example.com')
        self.assertEqual(self.register(self.token).status_code, 400)

    def test_invalid_token_does_not_create_account(self):
        self.assertEqual(self.register('invalid').status_code, 400)
        self.assertEqual(get_user_model().objects.count(), 1)

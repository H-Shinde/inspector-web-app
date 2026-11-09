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

    def register(self, token, **changes):
        data = {'token': token, 'fullName': 'Inspector Name', 'password': 'Unique-Inspector-4829!', 'email': 'invited@example.com', 'phone': '7165550123', 'address': '123 Main St', 'city': 'Buffalo', 'state': 'NY', 'zipCode': '14228'}
        data.update(changes)
        return self.client.post('/api/inspector-registration/', data=json.dumps(data), content_type='application/json')

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

    def test_required_profile_fields_and_email_binding(self):
        for field in ['fullName', 'email', 'phone', 'address', 'city', 'state', 'zipCode']:
            with self.subTest(field=field):
                self.assertEqual(self.register(self.token, **{field: ''}).status_code, 400)
        self.assertEqual(self.register(self.token, email='different@example.com').status_code, 400)
        self.inspector.refresh_from_db()
        self.assertIsNone(self.inspector.user_id)

    def test_profile_is_saved_to_directory_record(self):
        result = self.register(self.token)
        self.assertEqual(result.status_code, 201, result.content)
        self.inspector.refresh_from_db()
        self.assertEqual(self.inspector.phone, '7165550123')
        self.assertEqual(self.inspector.region, '')
        self.assertEqual(self.inspector.notes, '')
        self.assertEqual(self.inspector.focus, 'Inspection')

    def test_signup_preserves_admin_profile_fields(self):
        self.inspector.region = 'Western NY'
        self.inspector.notes = 'Admin notes'
        self.inspector.save()
        result = self.register(self.token, status='Inactive', region='Override', notes='Override', focus='Appraisal')
        self.assertEqual(result.status_code, 201, result.content)
        self.inspector.refresh_from_db()
        self.assertTrue(self.inspector.is_active)
        self.assertEqual(self.inspector.focus, 'Inspection')
        self.assertEqual(self.inspector.region, 'Western NY')
        self.assertEqual(self.inspector.notes, 'Admin notes')

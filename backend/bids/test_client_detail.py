import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Client


class ClientDetailTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(username='client-owner', email='owner@example.com')
        self.other = get_user_model().objects.create_user(username='client-other', email='other@example.com')
        self.record = Client.objects.create(owner=self.owner, name='Original', email='client@example.com')
        self.url = f'/api/clients/{self.record.pk}/'
        self.client.force_login(self.owner)

    def test_edit_and_delete(self):
        result = self.client.patch(self.url, data=json.dumps({'name': 'Updated'}), content_type='application/json')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['name'], 'Updated')
        self.assertEqual(result.json()['email'], 'client@example.com')
        self.assertEqual(self.client.delete(self.url).status_code, 200)
        self.assertFalse(Client.objects.filter(pk=self.record.pk).exists())

    def test_validation_and_ownership(self):
        self.assertEqual(self.client.patch(self.url, data=json.dumps({'email': 'invalid'}), content_type='application/json').status_code, 400)
        self.client.force_login(self.other)
        self.assertEqual(self.client.delete(self.url).status_code, 404)
        self.assertTrue(Client.objects.filter(pk=self.record.pk).exists())
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 401)

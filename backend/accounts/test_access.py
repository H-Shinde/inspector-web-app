import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from bids.models import Inspector


class AdminAccessTests(TestCase):
    def test_inspector_cannot_log_into_admin_or_read_admin_api(self):
        User = get_user_model()
        admin = User.objects.create_user(username='admin', email='admin@email.com', password='Admin-test-4829!')
        user = User.objects.create_user(username='inspector', email='inspector@example.com', password='Inspector-test-4829!')
        Inspector.objects.create(owner=admin, user=user, email=user.email, name='Inspector')
        credentials = json.dumps({'email': user.email, 'password': 'Inspector-test-4829!'})
        self.assertEqual(self.client.post('/api/auth/login/', data=credentials, content_type='application/json').status_code, 403)
        self.assertEqual(self.client.post('/api/auth/inspector-login/', data=credentials, content_type='application/json').status_code, 200)
        self.assertEqual(self.client.get('/api/bids/').status_code, 401)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.client.get('/api/inspector/jobs/').status_code, 200)
        self.client.logout()
        credentials = json.dumps({'email': admin.email, 'password': 'Admin-test-4829!'})
        self.assertEqual(self.client.post('/api/auth/login/', data=credentials, content_type='application/json').status_code, 200)
        self.assertEqual(self.client.get('/api/bids/').status_code, 200)

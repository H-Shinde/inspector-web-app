import json
import tempfile
import uuid
from django.test import TransactionTestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from accounts.test_helpers import force_inspector_login
from .models import Inspector, Message

class MessagingTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='chat-admin', email='admin@email.com')
        self.user = User.objects.create_user(username='chat-inspector', email='chat@example.com')
        self.other = User.objects.create_user(username='chat-other', email='other-chat@example.com')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.user, name='Chat inspector', email=self.user.email)
        self.foreign = Inspector.objects.create(owner=self.other, name='Private', email='private-chat@example.com')
        self.client.force_login(self.admin)
        force_inspector_login(self.client, self.user)
        self.media = tempfile.TemporaryDirectory(prefix='message-test-')
        self.override = override_settings(MEDIA_ROOT=self.media.name)
        self.override.enable()
        self.addCleanup(self.media.cleanup)
        self.addCleanup(self.override.disable)

    def send(self, text='Hello', inspector=False, client_id=None):
        values = {'text': text, 'clientId': client_id or str(uuid.uuid4())}
        if not inspector: values['inspectorId'] = self.inspector.pk
        return self.client.post('/api/inspector/messages/' if inspector else '/api/messages/', data=json.dumps(values), content_type='application/json')

    def test_two_way_persistent_conversation_and_idempotent_retries(self):
        key = str(uuid.uuid4())
        first = self.send('Admin message', client_id=key)
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(self.send('Admin message', client_id=key).status_code, 200)
        reply = self.send('Inspector reply', inspector=True)
        self.assertEqual(reply.status_code, 201, reply.content)
        for url in [f'/api/messages/?inspectorId={self.inspector.pk}', '/api/inspector/messages/']:
            rows = self.client.get(url).json()['messages']
            self.assertEqual([row['text'] for row in rows], ['Admin message', 'Inspector reply'])
            self.assertEqual([row['from'] for row in rows], ['admin', 'inspector'])
        self.assertEqual(Message.objects.count(), 2)

    def test_conversations_are_private_and_messages_are_validated(self):
        self.assertEqual(self.client.get(f'/api/messages/?inspectorId={self.foreign.pk}').status_code, 404)
        response = self.client.post('/api/inspector/messages/', data=json.dumps({'inspectorId': self.foreign.pk, 'text': 'No', 'clientId': str(uuid.uuid4())}), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        for text in ['', ' ' * 5, 'a' * 2001]:
            self.assertEqual(self.send(text).status_code, 400)
        self.assertEqual(Message.objects.count(), 0)

    def test_attachment_is_private_and_shared_with_both_apps(self):
        upload = SimpleUploadedFile('photo.png', bytes([137,80,78,71,13,10,26,10]) + b'image data', content_type='image/png')
        response = self.client.post('/api/inspector/messages/', {'text': 'Photo', 'clientId': str(uuid.uuid4()), 'files': upload})
        self.assertEqual(response.status_code, 201, response.content)
        inspector_url = response.json()['attachments'][0]['url']
        admin_url = self.client.get(f'/api/messages/?inspectorId={self.inspector.pk}').json()['messages'][0]['attachments'][0]['url']
        for url in [inspector_url, admin_url]:
            result = self.client.get(url)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(result['Content-Type'], 'image/png')
            result.close()
        force_inspector_login(self.client, self.other)
        self.assertEqual(self.client.get(inspector_url).status_code, 404)
        bad = SimpleUploadedFile('bad.svg', b'<svg></svg>', content_type='image/svg+xml')
        self.assertEqual(self.client.post('/api/messages/', {'text': '', 'inspectorId': self.inspector.pk, 'clientId': str(uuid.uuid4()), 'files': bad}).status_code, 400)

    def test_live_message_events_and_older_history(self):
        response = self.client.get('/api/inspector/message-events/')
        self.assertEqual(response.status_code, 200)
        stream = iter(response.streaming_content)
        self.assertIn(b'event: messages-changed', next(stream))
        sent = self.send('Live').json()
        self.assertIn(str(sent['id']).encode(), next(stream))
        response.close()
        Message.objects.bulk_create([Message(inspector=self.inspector, sender=self.admin, text=str(index), clientId=uuid.uuid4()) for index in range(205)])
        latest = self.client.get('/api/inspector/messages/').json()
        self.assertEqual(len(latest['messages']), 200)
        self.assertTrue(latest['hasEarlier'])
        earlier = self.client.get(f"/api/inspector/messages/?before={latest['messages'][0]['id']}").json()
        self.assertEqual(len(earlier['messages']), 6)
        self.assertFalse(earlier['hasEarlier'])

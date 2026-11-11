import json
import uuid
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from accounts.test_helpers import force_inspector_login
from .models import Notification, Bid, Job, Inspector

class NotificationTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(username='notice-admin', email='admin@email.com')
        self.user = User.objects.create_user(username='notice-inspector', email='notice@example.com')
        self.other = User.objects.create_user(username='notice-other', email='notice-other@example.com')
        self.inspector = Inspector.objects.create(owner=self.admin, user=self.user, name='Inspector', email=self.user.email)
        self.bid = Bid.objects.create(owner=self.admin, businessName='Notification job', appraisalType='Business Valuation (BV)')
        self.job = Job.objects.create(owner=self.admin, source_bid=self.bid, inspector=self.inspector, status='In-Progress')
        Notification.objects.all().delete()
        self.client.force_login(self.admin)
        force_inspector_login(self.client, self.user)

    def feed(self, inspector=False):
        result = self.client.get('/api/inspector/notifications/' if inspector else '/api/notifications/')
        self.assertEqual(result.status_code, 200, result.content)
        return result.json()

    def read(self, data, inspector=False):
        return self.client.post('/api/inspector/notifications/' if inspector else '/api/notifications/', data=json.dumps(data), content_type='application/json')

    def send(self):
        return self.client.post('/api/inspector/messages/', data=json.dumps({'text': 'New message', 'clientId': str(uuid.uuid4())}), content_type='application/json')

    def test_message_badges_persist_and_only_recipient_gets_unread(self):
        self.assertEqual(self.send().status_code, 201)
        self.assertEqual(self.send().status_code, 201)
        admin = self.feed()
        self.assertEqual(admin['counts']['message'], 2)
        self.assertEqual(admin['conversations'][0]['count'], 2)
        self.assertEqual(self.feed()['counts']['message'], 2)
        self.assertEqual(self.feed(True)['total'], 0)
        response = self.read({'kind': 'message', 'conversationId': self.inspector.pk, 'throughId': admin['throughId']})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.feed()['total'], 0)

    def test_job_edits_group_by_record_and_do_not_notify_the_editor(self):
        part = dict(id='desk', name='Desk', qty='1', type='Equipment', make='N/A', model='N/A', serial='N/A', condition='Good', year='N/A', mileage='N/A', comments='', photos=[])
        for revision in [0, 1]:
            result = self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', data=json.dumps({'part': part, 'revision': revision}), content_type='application/json')
            self.assertEqual(result.status_code, 200, result.content)
        admin = self.feed()
        self.assertEqual(admin['counts']['job'], 1)
        self.assertEqual(len(admin['notifications']), 1)
        self.assertEqual(admin['records'][0]['version'], 2)
        self.assertEqual(self.feed(True)['total'], 0)
        self.read({'kind': 'job', 'objectId': self.job.pk, 'throughId': admin['throughId']})
        self.assertEqual(self.feed()['total'], 0)

    def test_changes_requested_notifies_inspector_but_not_admin(self):
        self.job.status = 'Pending Review'; self.job.save()
        Notification.objects.all().delete()
        response = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'status': 'Needs Changes', 'reviewNotes': 'Correct the serial.', 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.feed()['total'], 0)
        inspector = self.feed(True)
        self.assertEqual(inspector['counts']['job'], 1)
        self.assertIn('Changes requested', inspector['notifications'][0]['title'])
        self.read({'kind': 'job', 'objectId': self.job.pk, 'throughId': inspector['throughId']}, True)
        self.assertEqual(self.feed(True)['total'], 0)

    def test_read_snapshot_cannot_clear_a_later_message(self):
        self.send(); old = self.feed()
        self.send()
        self.read({'all': True, 'throughId': old['throughId']})
        self.assertEqual(self.feed()['counts']['message'], 1)

    def test_read_ids_cannot_clear_another_users_or_realms_updates(self):
        self.send()
        admin = self.feed()
        self.read({'ids': [admin['notifications'][0]['id']]}, True)
        self.assertEqual(self.feed()['counts']['message'], 1)
        force_inspector_login(self.client, self.other)
        self.assertEqual(self.client.get('/api/inspector/notifications/').status_code, 404)

    def test_live_badge_events_change_on_arrival_and_read(self):
        response = self.client.get('/api/notification-events/')
        self.assertEqual(response.status_code, 200)
        stream = iter(response.streaming_content)
        first = next(stream)
        self.assertIn(b'updates-changed', first)
        self.send()
        changed = next(stream)
        self.assertNotEqual(first, changed)
        data = self.feed()
        self.read({'all': True, 'throughId': data['throughId']})
        self.assertNotEqual(changed, next(stream))
        response.close()

    def test_new_assignment_and_profile_changes_are_indicated(self):
        response = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'inspectorId': self.inspector.pk, 'revision': 0}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(self.feed(True)['records'][0]['isNew'] is False)
        self.client.post('/api/inspector/profile/', data=json.dumps({'name': 'Updated Inspector'}), content_type='application/json')
        self.assertEqual(self.feed()['counts']['inspector'], 1)

    def test_first_assignment_is_new_until_the_inspector_opens_it(self):
        self.job.inspector = None; self.job.status = 'Unassigned'; self.job.save()
        Notification.objects.all().delete()
        result = self.client.patch(f'/api/jobs/{self.job.pk}/', data=json.dumps({'inspectorId': self.inspector.pk, 'revision': 0}), content_type='application/json')
        self.assertEqual(result.status_code, 200, result.content)
        unread = self.feed(True)
        self.assertTrue(unread['records'][0]['isNew'])
        self.assertEqual(self.feed()['total'], 0)
        self.read({'kind': 'job', 'objectId': self.job.pk, 'throughId': unread['throughId']}, True)
        self.assertEqual(self.feed(True)['total'], 0)

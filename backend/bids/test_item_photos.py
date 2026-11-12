import base64
import json
import tempfile
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from accounts.test_helpers import force_inspector_login
from .models import Bid, Job, Inspector, InspectionPhoto

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')

class ItemPhotoTests(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.settings_override = override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        self.addCleanup(self.media.cleanup)
        self.addCleanup(self.settings_override.disable)
        User = get_user_model()
        self.admin = User.objects.create_user(username='photo-admin', email='admin@email.com')
        self.user = User.objects.create_user(username='photo-inspector', email='photos@example.com')
        inspector = Inspector.objects.create(owner=self.admin, user=self.user, name='Inspector', email=self.user.email)
        bid = Bid.objects.create(owner=self.admin, businessName='Photo test', appraisalType='Business Valuation (BV)')
        self.part = dict(id='asset-1', name='Machine', qty='1', type='Machine', make='N/A', model='N/A', serial='N/A', condition='Good', year='N/A', mileage='N/A', comments='', photos=[])
        self.job = Job.objects.create(owner=self.admin, source_bid=bid, inspector=inspector, status='In-Progress', items=[{'itemId': 'asset-1', 'name': 'Machine'}])
        self.client.force_login(self.admin)
        force_inspector_login(self.client, self.user)

    def save(self, part=None, upload=False, revision=None):
        self.job.refresh_from_db()
        data = {'part': part or self.part, 'revision': self.job.revision if revision is None else revision}
        url = f'/api/inspector/jobs/{self.job.pk}/parts/'
        if upload:
            return self.client.post(url, {'part': json.dumps(data['part']), 'revision': str(data['revision']), 'files': SimpleUploadedFile('camera.png', PNG, content_type='image/png')})
        return self.client.post(url, json.dumps(data), content_type='application/json')

    def test_upload_visible_to_both_apps_and_after_submission(self):
        response = self.save(upload=True)
        self.assertEqual(response.status_code, 200, response.content)
        photo = response.json()['inspectionParts'][0]['photos'][0]
        self.assertEqual(InspectionPhoto.objects.count(), 1)
        inspector_url = photo['url']
        self.assertTrue(inspector_url.startswith('/api/inspector/'))
        response = self.client.get(inspector_url)
        self.assertEqual(b''.join(response.streaming_content), PNG)
        admin_item = self.client.get(f'/api/jobs/{self.job.pk}/').json()['items'][0]
        admin_photo = admin_item['photos'][0]
        self.assertEqual(admin_photo['id'], photo['id'])
        self.assertTrue(admin_photo['url'].startswith('/api/item-photos/'))
        response = self.client.get(admin_photo['url'])
        self.assertEqual(b''.join(response.streaming_content), PNG)
        self.job.refresh_from_db()
        response = self.client.post(f'/api/inspector/jobs/{self.job.pk}/', json.dumps({'action': 'complete', 'revision': self.job.revision}), content_type='application/json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['status'], 'Pending Review')
        self.assertEqual(response.json()['inspectionParts'][0]['photos'][0]['id'], photo['id'])
        self.assertEqual(self.save(upload=True).status_code, 409)
        response = self.client.get(admin_photo['url'])
        self.assertEqual(response.status_code, 200)
        response.close()

    def test_retain_remove_and_reject_stale_upload(self):
        first = self.save(upload=True).json()['inspectionParts'][0]
        self.assertEqual(self.save(first).status_code, 200)
        self.assertEqual(InspectionPhoto.objects.count(), 1)
        self.assertEqual(self.save(first, upload=True, revision=0).status_code, 409)
        self.assertEqual(InspectionPhoto.objects.count(), 1)
        self.assertEqual(self.save({**first, 'photos': []}).status_code, 200)
        self.assertEqual(InspectionPhoto.objects.count(), 0)
        self.assertEqual(self.client.get(first['photos'][0]['url']).status_code, 404)

    def test_photo_access_and_retained_ids_are_scoped(self):
        first = self.save(upload=True).json()['inspectionParts'][0]
        invalid = {**self.part, 'id': 'another-item', 'photos': first['photos']}
        self.assertEqual(self.save(invalid).status_code, 400)
        outsider = get_user_model().objects.create_user(username='other-inspector', email='other@example.com')
        Inspector.objects.create(owner=self.admin, user=outsider, name='Other', email=outsider.email)
        force_inspector_login(self.client, outsider)
        self.assertEqual(self.client.get(first['photos'][0]['url']).status_code, 404)

    def test_non_image_rejected(self):
        response = self.client.post(f'/api/inspector/jobs/{self.job.pk}/parts/', {'part': json.dumps(self.part), 'revision': str(self.job.revision), 'files': SimpleUploadedFile('fake.png', b'not an image', content_type='image/png')})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(InspectionPhoto.objects.count(), 0)

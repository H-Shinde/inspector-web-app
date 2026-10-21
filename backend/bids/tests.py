import json
import shutil
import tempfile
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings, Client
from .models import Bid, Inspector

class BidApiTests(TestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp(prefix='bid-test-files-')
        self.settings = override_settings(MEDIA_ROOT=self.media)
        self.settings.enable()
        self.addCleanup(self.settings.disable)
        self.addCleanup(shutil.rmtree, self.media)
        self.user = get_user_model().objects.create_user(username='owner', email='owner@example.com', password='Strong-Pass!73')
        self.other = get_user_model().objects.create_user(username='other', email='other@example.com', password='Strong-Pass!74')
        self.inspector = Inspector.objects.create(owner=self.user, name='Assigned Inspector', email='inspector@example.com')
        self.foreign_inspector = Inspector.objects.create(owner=self.other, name='Other Inspector', email='other-inspector@example.com')
        self.client.force_login(self.user)
        self.payload = {'name': 'Subject', 'businessName': 'Example Co', 'appraisalType': 'Business Valuation (BV)', 'inspectorId': self.inspector.pk, 'bidAmount': '1500', 'discount': '100', 'pdfOnly': True}

    def send(self, url='/api/bids/', data=None, method='post'):
        return getattr(self.client, method)(url, data=json.dumps(self.payload if data is None else data), content_type='application/json')

    def create_bid(self):
        response = self.send()
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_create_uses_database_id_reference_owner_and_total(self):
        result = self.send(data={**self.payload, 'referenceNumber': 'FAKE', 'totalBid': '1', 'owner': self.other.pk, 'status': 'Accepted'}).json()
        record = Bid.objects.get(pk=result['id'])
        self.assertEqual(record.owner, self.user)
        self.assertEqual(record.status, 'Pending')
        self.assertEqual(result['referenceNumber'], f'BID-{record.pk:06d}')
        self.assertEqual(Decimal(result['totalBid']), Decimal('1400'))

    def test_list_and_inspector_choices_are_scoped_to_owner(self):
        self.create_bid()
        self.assertEqual(len(self.client.get('/api/bids/').json()['bids']), 1)
        self.assertEqual(self.client.get('/api/bids/inspectors/').json()['inspectors'][0]['id'], self.inspector.pk)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get('/api/bids/').json()['bids'], [])

    def test_inspector_is_required_and_cannot_belong_to_another_user(self):
        for inspector_id in ['', self.foreign_inspector.pk, 999999]:
            self.assertEqual(self.send(data={**self.payload, 'inspectorId': inspector_id}).status_code, 400)
        self.assertEqual(Bid.objects.count(), 0)

    def test_machinery_uses_only_its_fee(self):
        result = self.send(data={**self.payload, 'appraisalType': 'Machinery & Equipment (M&E)', 'reportFormat': 'Desktop', 'additionalCharges': '99'}).json()
        self.assertEqual(Decimal(result['totalBid']), Decimal('1500'))
        self.assertEqual(Decimal(result['discount']), Decimal('100'))

    def test_detail_and_patch_keep_ownership_and_calculate_totals(self):
        result = self.create_bid(); url = f"/api/bids/{result['id']}/"
        self.assertEqual(self.client.get(url).json()['businessName'], 'Example Co')
        response = self.send(url, {'bidAmount': '1800', 'businessName': 'Updated'}, 'patch')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Decimal(response.json()['totalBid']), Decimal('1700'))
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.send(url, {'businessName': 'Stolen'}, 'patch').status_code, 404)

    def test_decline_moves_record_to_history_and_preserves_details(self):
        result = self.create_bid(); url = f"/api/bids/{result['id']}/"
        self.assertEqual(self.send(url, {'status': 'Declined'}, 'patch').status_code, 200)
        self.assertEqual(self.client.get('/api/bids/').json()['bids'], [])
        self.assertEqual(self.client.get('/api/bids/?history=1').json()['bids'][0]['name'], 'Subject')
        self.assertEqual(self.send(url, {'status': 'Accepted'}, 'patch').status_code, 409)

    def test_delete_archives_instead_of_destroying(self):
        result = self.create_bid(); url = f"/api/bids/{result['id']}/"
        self.assertEqual(self.client.delete(url).json()['status'], 'Deleted')
        self.assertEqual(Bid.objects.count(), 1)
        self.assertEqual(self.client.get('/api/bids/?history=1').json()['bids'][0]['businessName'], 'Example Co')

    def test_pdf_upload_download_and_private_access(self):
        result = self.create_bid(); url = f"/api/bids/{result['id']}/agreement/"
        self.assertEqual(self.client.get(url).status_code, 404)
        pdf = SimpleUploadedFile('agreement.pdf', b'%PDF-1.7\nexample', content_type='application/pdf')
        response = self.client.post(url, {'agreement': pdf})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['hasAgreement'])
        downloaded = self.client.get(url)
        self.assertEqual(b''.join(downloaded.streaming_content), b'%PDF-1.7\nexample')
        downloaded.close()
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_invalid_upload_does_not_modify_bid(self):
        result = self.create_bid(); url = f"/api/bids/{result['id']}/agreement/"
        self.assertEqual(self.client.post(url, {'agreement': SimpleUploadedFile('fake.pdf', b'html')}).status_code, 400)
        self.assertFalse(Bid.objects.get(pk=result['id']).agreement)

    def test_authentication_and_csrf_required(self):
        self.client.logout()
        self.assertEqual(self.client.get('/api/bids/').status_code, 401)
        self.assertEqual(self.send().status_code, 401)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(client.post('/api/bids/', data=json.dumps(self.payload), content_type='application/json').status_code, 403)


    def test_regular_user_can_create_an_owned_inspector(self):
        response = self.send('/api/bids/inspectors/', {'name': 'My Inspector', 'email': 'my-inspector@example.com', 'owner': self.other.pk})
        self.assertEqual(response.status_code, 201, response.content)
        inspector = Inspector.objects.get(pk=response.json()['id'])
        self.assertEqual(inspector.owner, self.user)
        self.assertFalse(self.user.is_staff)

    def test_inspector_email_is_validated(self):
        response = self.send('/api/bids/inspectors/', {'name': 'Inspector', 'email': 'invalid'})
        self.assertEqual(response.status_code, 400)

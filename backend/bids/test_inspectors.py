import json
from unittest.mock import patch
from django.core import mail
from django.contrib.auth import get_user_model
from django.test import TestCase, Client as HttpClient
from .models import Inspector, Client, Bid


class InspectorDirectoryTests(TestCase):
    def test_invitation_is_emailed_to_created_inspector(self):
        response = self.client.post('/api/inspectors/', data=json.dumps({'email': 'invited@example.com'}), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(mail.outbox[-1].to, ['invited@example.com'])
        self.assertIn('invited', mail.outbox[-1].body)

    @patch('bids.inspector_views.send_mail', side_effect=RuntimeError('SMTP unavailable'))
    def test_failed_invitation_does_not_create_inspector(self, send):
        response = self.client.post('/api/inspectors/', data=json.dumps({'email': 'failed@example.com'}), content_type='application/json')
        self.assertEqual(response.status_code, 503)
        self.assertFalse(Inspector.objects.filter(email='failed@example.com').exists())

    def setUp(self):
        self.user = get_user_model().objects.create_user(username='inspect-owner', email='inspect-owner@example.com')
        self.other = get_user_model().objects.create_user(username='inspect-other', email='inspect-other@example.com')
        self.client.force_login(self.user)
        self.near = Inspector.objects.create(owner=self.user, name='Near', email='near@example.com', zipCode='10001')
        self.next = Inspector.objects.create(owner=self.user, name='Brooklyn', email='brooklyn@example.com', zipCode='11201')
        self.far = Inspector.objects.create(owner=self.user, name='Far', email='far@example.com', zipCode='90001')
        self.unknown = Inspector.objects.create(owner=self.user, name='Unknown', email='unknown@example.com')
        self.foreign = Inspector.objects.create(owner=self.other, name='Private', email='private@example.com', zipCode='10001')
        self.customer = Client.objects.create(owner=self.user, name='Client', zipCode='10001-1234')

    def test_client_zip_orders_inspectors_by_geographic_distance(self):
        response = self.client.get(f'/api/inspectors/?clientId={self.customer.pk}')
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual([row['id'] for row in result['inspectors']], [self.near.pk, self.next.pk, self.far.pk, self.unknown.pk])
        self.assertEqual(result['inspectors'][0]['distanceMiles'], 0)
        self.assertIsNone(result['inspectors'][-1]['distanceMiles'])
        self.assertTrue(result['locationKnown'])
        self.assertLess(result['inspectors'][1]['distanceMiles'], 10)
        self.assertGreater(result['inspectors'][2]['distanceMiles'], 2000)

    def test_radius_and_unknown_zip(self):
        result = self.client.get('/api/inspectors/?zipCode=10001&radiusMiles=20').json()
        self.assertEqual({row['id'] for row in result['inspectors']}, {self.near.pk, self.next.pk})
        result = self.client.get('/api/inspectors/?zipCode=00000').json()
        self.assertFalse(result['locationKnown'])
        self.assertTrue(all(row['distanceMiles'] is None for row in result['inspectors']))
        for query in ['zipCode=abc', 'radiusMiles=NaN', 'radiusMiles=-1']:
            self.assertEqual(self.client.get(f'/api/inspectors/?{query}').status_code, 400)

    def test_create_update_and_location_fields(self):
        data = {'name': 'New Inspector', 'email': 'new@example.com', 'zipCode': '02108', 'owner': self.other.pk, 'phone': '202-555-0101'}
        response = self.client.post('/api/inspectors/', data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        result = response.json()
        self.assertEqual(result['state'], 'MA')
        self.assertEqual(result['city'], 'Boston')
        self.assertEqual(Inspector.objects.get(pk=result['id']).owner, self.user)
        response = self.client.patch(f"/api/inspectors/{result['id']}/", data=json.dumps({'phone': '(212) 555-0101'}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['zipCode'], '02108')

    def test_rejects_invalid_fields(self):
        for fields in [{'zipCode': '1234'}, {'phone': 'abc'}, {'email': 'bad'}, {'state': 'CA', 'zipCode': '10001'}]:
            data = {'name': 'Invalid', 'email': 'valid@example.com', **fields}
            self.assertEqual(self.client.post('/api/inspectors/', data=json.dumps(data), content_type='application/json').status_code, 400)

    def test_ownership_and_authentication(self):
        self.assertEqual(self.client.get(f'/api/inspectors/{self.foreign.pk}/').status_code, 404)
        foreign_client = Client.objects.create(owner=self.other, name='Private Client', zipCode='10001')
        self.assertEqual(self.client.get(f'/api/inspectors/?clientId={foreign_client.pk}').status_code, 404)
        self.client.logout()
        self.assertEqual(self.client.get('/api/inspectors/').status_code, 401)
        csrf = HttpClient(enforce_csrf_checks=True); csrf.force_login(self.user)
        self.assertEqual(csrf.post('/api/inspectors/', data='{}', content_type='application/json').status_code, 403)

    def test_inactive_inspectors_and_protected_deletion(self):
        Bid.objects.create(owner=self.user, inspector=self.near, name='Contact', businessName='Example', appraisalType='Business Valuation (BV)')
        self.assertEqual(self.client.delete(f'/api/inspectors/{self.near.pk}/').status_code, 409)
        self.assertEqual(self.client.patch(f'/api/inspectors/{self.near.pk}/', data=json.dumps({'is_active': False}), content_type='application/json').status_code, 200)
        self.assertNotIn(self.near.pk, [row['id'] for row in self.client.get('/api/inspectors/').json()['inspectors']])
        self.assertIn(self.near.pk, [row['id'] for row in self.client.get('/api/inspectors/?includeInactive=1').json()['inspectors']])
        self.assertEqual(self.client.delete(f'/api/inspectors/{self.unknown.pk}/').status_code, 200)

    def test_existing_bid_endpoint_remains_compatible(self):
        self.assertEqual(self.client.get('/api/bids/inspectors/').status_code, 200)
        self.assertIn('zipCode', self.client.get('/api/bids/inspectors/').json()['inspectors'][0])

    def test_create_with_only_email(self):
        response = self.client.post('/api/inspectors/', data=json.dumps({'email': 'email-only@example.com'}), content_type='application/json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()['name'], 'email-only@example.com')
        self.assertEqual(response.json()['zipCode'], '')
        self.assertIsNone(response.json()['distanceMiles'])

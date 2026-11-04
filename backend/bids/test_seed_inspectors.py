from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from bids.models import Inspector


class SampleInspectorTests(TestCase):
    def test_samples_belong_to_each_user_and_repeated_seeding_keeps_existing_records(self):
        first = get_user_model().objects.create_user(username="first", email="first@example.com", password="test-pass")
        second = get_user_model().objects.create_user(username="second", email="second@example.com", password="test-pass")
        existing = Inspector.objects.create(owner=first, name="Existing Inspector", email="real@example.com")
        call_command("seed_inspectors", stdout=StringIO())
        call_command("seed_inspectors", stdout=StringIO())
        self.assertEqual(Inspector.objects.filter(owner=first).count(), 4)
        self.assertEqual(Inspector.objects.filter(owner=second).count(), 3)
        existing.refresh_from_db()
        self.assertEqual(existing.name, "Existing Inspector")
        self.assertEqual(Inspector.objects.filter(owner=first, name="Alex Morgan").count(), 1)

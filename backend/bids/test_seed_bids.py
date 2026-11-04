from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from bids.models import Bid


class SampleBidTests(TestCase):
    def test_samples_are_visible_to_their_owner_and_seeding_preserves_changes(self):
        users = [get_user_model().objects.create_user(username=name, email=f"{name}@example.com", password="sample-pass") for name in ("first", "second")]
        call_command("seed_bids", stdout=StringIO())
        self.assertEqual(Bid.objects.count(), 6)
        for user in users:
            self.client.force_login(user)
            response = self.client.get("/api/bids/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()["bids"]), 3)
            ids = {row["id"] for row in response.json()["bids"]}
            self.assertEqual(ids, set(Bid.objects.filter(owner=user).values_list("id", flat=True)))
            self.assertFalse(Bid.objects.filter(owner=user).exclude(inspector__owner=user).exists())
        sample = Bid.objects.first()
        sample.status = "Declined"
        sample.save()
        call_command("seed_bids", stdout=StringIO())
        self.assertEqual(Bid.objects.count(), 6)
        sample.refresh_from_db()
        self.assertEqual(sample.status, "Declined")

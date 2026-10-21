from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from bids.models import Inspector


class Command(BaseCommand):
    help = "Add sample inspectors for each active user without replacing existing records."

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        for user in get_user_model().objects.filter(is_active=True):
            for name, email in [
                ("Alex Morgan", "alex.morgan@example.com"),
                ("Jordan Lee", "jordan.lee@example.com"),
                ("Taylor Brooks", "taylor.brooks@example.com"),
            ]:
                _, created = Inspector.objects.get_or_create(
                    owner=user, email=email, defaults={"name": name}
                )
                created_count += int(created)
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} sample inspectors."))

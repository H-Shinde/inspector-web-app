import json
import re
from datetime import datetime, timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from django import VERSION as DJANGO_VERSION
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.test import Client, TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


TEST_EMAIL = ({"MAILERS": {"default": {"BACKEND": "django.core.mail.backends.locmem.EmailBackend"}}}
              if DJANGO_VERSION >= (6, 1) else {"EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend"})


@override_settings(
    **TEST_EMAIL,
    FRONTEND_URL="http://localhost:3000",
    PASSWORD_RESET_TIMEOUT=3600,
)
class AuthenticationTests(TestCase):
    def setUp(self):
        self.old_password = "Old-Passphrase!97"
        self.new_password = "New-Passphrase!83"
        self.user = get_user_model().objects.create_user(
            username="avery", email="avery@example.com", password=self.old_password,
        )

    def post(self, path, data, client=None):
        return (client or self.client).post(
            f"/api/auth/{path}/", data=json.dumps(data), content_type="application/json",
        )

    def reset_data(self):
        return {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
            "new_password1": self.new_password,
            "new_password2": self.new_password,
        }

    def test_reset_email_link_works_end_to_end(self):
        response = self.post("password-reset", {"email": self.user.email})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertEqual(mail.outbox[0].subject, "Reset your Bison Valuation password")
        link = re.search(r"http://localhost:3000/UpdatePass\?\S+", mail.outbox[0].body).group()
        query = parse_qs(urlparse(link).query)
        payload = {"uid": query["uid"][0], "token": query["token"][0],
                   "new_password1": self.new_password, "new_password2": self.new_password}
        self.assertEqual(self.post("password-reset-confirm", payload).status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.new_password))
        self.assertFalse(self.user.check_password(self.old_password))
        self.assertEqual(self.post("login", {"email": self.user.email, "password": self.old_password}).status_code, 401)
        self.assertEqual(self.post("login", {"email": self.user.email, "password": self.new_password}).status_code, 200)

    def test_unknown_inactive_and_unusable_accounts_receive_same_generic_response(self):
        expected = self.post("password-reset", {"email": self.user.email}).json()
        mail.outbox.clear()
        inactive = get_user_model().objects.create_user(username="inactive", email="inactive@example.com", password=self.old_password, is_active=False)
        unusable = get_user_model().objects.create_user(username="unusable", email="unusable@example.com", password=None)
        for email in ["missing@example.com", inactive.email, unusable.email]:
            with self.subTest(email=email):
                response = self.post("password-reset", {"email": email})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), expected)
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_request_bodies_and_addresses_return_json_errors(self):
        for data in [[], None, {}, {"email": []}, {"email": "invalid"}]:
            with self.subTest(data=data):
                response = self.post("password-reset", data)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.json())
        response = self.client.post("/api/auth/password-reset/", data="{bad", content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_bad_token_and_uid_do_not_change_password(self):
        for updates in [{"token": "bad"}, {"uid": "!!!"}, {"uid": urlsafe_base64_encode(b"999999")}, {"new_password1": []}]:
            with self.subTest(updates=updates):
                payload = {**self.reset_data(), **updates}
                self.assertEqual(self.post("password-reset-confirm", payload).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.old_password))

    def test_expired_token_is_rejected(self):
        now = datetime.now()
        with patch.object(default_token_generator, "_now", return_value=now):
            payload = self.reset_data()
        with patch.object(default_token_generator, "_now", return_value=now + timedelta(seconds=3601)):
            self.assertEqual(self.post("password-reset-confirm", payload).status_code, 400)

    def test_token_cannot_be_reused(self):
        payload = self.reset_data()
        self.assertEqual(self.post("password-reset-confirm", payload).status_code, 200)
        self.assertEqual(self.post("password-reset-confirm", payload).status_code, 400)

    def test_passwords_must_match_and_pass_django_validators(self):
        for updates in [{"new_password2": "Different-Passphrase!34"},
                        {"new_password1": "123", "new_password2": "123"}]:
            response = self.post("password-reset-confirm", {**self.reset_data(), **updates})
            self.assertEqual(response.status_code, 400)
            self.assertIn("error", response.json())
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.old_password))

    def test_inactive_account_cannot_reset_even_with_a_previously_valid_token(self):
        payload = self.reset_data()
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.post("password-reset-confirm", payload).status_code, 400)

    def test_csrf_is_required_for_both_reset_endpoints(self):
        client = Client(enforce_csrf_checks=True)
        for path, data in [("password-reset", {"email": self.user.email}), ("password-reset-confirm", self.reset_data())]:
            self.assertEqual(self.post(path, data, client=client).status_code, 403)
        token = client.get("/api/auth/csrf/").json()["csrfToken"]
        response = client.post("/api/auth/password-reset/", data=json.dumps({"email": self.user.email}), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)

    def test_reset_endpoints_reject_get(self):
        for path in ["password-reset", "password-reset-confirm"]:
            self.assertEqual(self.client.get(f"/api/auth/{path}/").status_code, 405)

    def test_login_session_and_logout(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.assertEqual(self.post("login", {"email": self.user.email, "password": self.old_password}).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").json()["email"], self.user.email)
        self.assertEqual(self.post("logout", {}).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_reset_invalidates_existing_login_sessions(self):
        self.client.force_login(self.user)
        separate_client = Client()
        self.assertEqual(self.post("password-reset-confirm", self.reset_data(), client=separate_client).status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

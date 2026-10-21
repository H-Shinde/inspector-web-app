import json

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_GET, require_POST

@require_GET
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})

@require_POST
def sign_in(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid request."}, status=400)
    email = data.get("email")
    password = data.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return JsonResponse({"error": "Invalid request."}, status=400)
    user = authenticate(request, email=email, password=password)
    if user is None:
        return JsonResponse(
            {"error": "Invalid email or password."}, status=401
        )
    login(request, user)
    return JsonResponse({"email": user.email})

@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Sign in required."}, status=401)
    return JsonResponse({"id": request.user.pk, "email": request.user.email})
@require_POST
def sign_out(request):
    logout(request)
    return JsonResponse({"message": "Signed out."})


def _json_object(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _form_error(form):
    return " ".join(str(message) for messages in form.errors.values() for message in messages)


@require_POST
def password_reset(request):
    data = _json_object(request)
    if data is None or not isinstance(data.get("email"), str):
        return JsonResponse({"error": "Enter a valid email address."}, status=400)
    form = PasswordResetForm({"email": data["email"].strip()})
    if not form.is_valid():
        return JsonResponse({"error": _form_error(form)}, status=400)
    # Django sends only for active users with usable passwords. Always return
    # the same result for existing and unknown email addresses.
    form.save(
        request=request,
        from_email=settings.DEFAULT_FROM_EMAIL,
        subject_template_name="accounts/password_reset_subject.txt",
        email_template_name="accounts/password_reset_email.txt",
        extra_email_context={"frontend_url": settings.FRONTEND_URL.rstrip("/")},
    )
    return JsonResponse({"message": "If an account matches that email, you will receive a password-reset link."})


@require_POST
def password_reset_confirm(request):
    data = _json_object(request)
    required = ("uid", "token", "new_password1", "new_password2")
    if data is None or any(not isinstance(data.get(key), str) or not data[key] for key in required):
        return JsonResponse({"error": "A reset link and both password fields are required."}, status=400)
    invalid = {"error": "This password-reset link is invalid or has expired. Request a new link."}
    try:
        user_id = force_str(urlsafe_base64_decode(data["uid"]))
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().get(pk=user_id, is_active=True)
            if not user.has_usable_password() or not default_token_generator.check_token(user, data["token"]):
                return JsonResponse(invalid, status=400)
            form = SetPasswordForm(user, data={
                "new_password1": data["new_password1"],
                "new_password2": data["new_password2"],
            })
            if not form.is_valid():
                return JsonResponse({"error": _form_error(form)}, status=400)
            form.save()
    except (ValueError, TypeError, OverflowError, UnicodeDecodeError, ValidationError, get_user_model().DoesNotExist):
        return JsonResponse(invalid, status=400)
    return JsonResponse({"message": "Your password has been updated. Sign in with your new password."})

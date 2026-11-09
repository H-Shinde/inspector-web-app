import json
import uuid
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Inspector
from .inspector_views import InspectorForm


@require_http_methods(['GET', 'POST'])
def inspector_registration(request):
    try:
        data = json.loads(request.body) if request.method == 'POST' else request.GET
        if not hasattr(data, 'get'):
            raise ValueError('Invalid request.')
        invite = signing.loads(data.get('token', ''), salt='inspector-registration', max_age=7 * 24 * 3600)
        with transaction.atomic():
            inspector = Inspector.objects.select_for_update().filter(pk=invite['inspectorId'], email=invite['email'], is_active=True).first()
            if inspector is None or inspector.user_id:
                return JsonResponse({'error': 'Invitation is unavailable or already used.'}, status=400)
            if request.method == 'GET':
                return JsonResponse({'email': inspector.email, 'fullName': inspector.name, 'inspectorId': inspector.pk})
            name = data.get('fullName', '')
            password = data.get('password', '')
            if not isinstance(name, str) or not name.strip() or len(name.strip()) > 200 or not isinstance(password, str):
                raise ValueError('Enter your full name and password.')
            required = ['phone', 'email', 'address', 'city', 'state', 'zipCode']
            for field in required:
                if not isinstance(data.get(field), str) or not data[field].strip():
                    return JsonResponse({'error': f'{field} is required.'}, status=400)
            if data['email'].strip().casefold() != inspector.email.casefold():
                return JsonResponse({'error': 'Use the email address that received this invitation.'}, status=400)
            profile = {field: data[field].strip() for field in required}
            profile.update(name=name.strip(), email=inspector.email, is_active=inspector.is_active, rating=inspector.rating, region=inspector.region, notes=inspector.notes, focus=inspector.focus)
            form = InspectorForm(profile, instance=inspector)
            if not form.is_valid():
                return JsonResponse({'error': ' '.join(f'{field}: {" ".join(messages)}' for field, messages in form.errors.items())}, status=400)
            User = get_user_model()
            if User.objects.filter(email__iexact=inspector.email).exists():
                raise ValueError('An account already exists for this email. Contact your administrator.')
            user = User(email=inspector.email, username='inspector-' + uuid.uuid4().hex, first_name=name.strip()[:150])
            validate_password(password, user)
            user.set_password(password)
            user.save()
            inspector = form.save(commit=False)
            inspector.name = name.strip()
            inspector.user = user
            inspector.save()
            return JsonResponse({'registered': True, 'status': 'Active' if inspector.is_active else 'Inactive', 'email': inspector.email, 'fullName': inspector.name, 'inspectorId': inspector.pk}, status=201)
    except signing.BadSignature:
        return JsonResponse({'error': 'Invitation link is invalid or expired. Request a new invitation.'}, status=400)
    except ValidationError as error:
        return JsonResponse({'error': ' '.join(error.messages)}, status=400)
    except (ValueError, TypeError, KeyError, UnicodeDecodeError):
        return JsonResponse({'error': 'Enter valid registration details and a valid invitation token.'}, status=400)
    except IntegrityError:
        return JsonResponse({'error': 'This email is already registered.'}, status=409)

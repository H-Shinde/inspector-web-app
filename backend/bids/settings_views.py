import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import BidSettings
from .calculation import FIELDS, CHECKBOX_FIELDS, ASSET_FIELDS, TYPES, default_rules, validate_rules


@require_http_methods(['GET', 'PUT'])
def bid_settings(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    settings, _ = BidSettings.objects.get_or_create(owner=request.user)
    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            if not isinstance(data, dict) or set(data) != {'rules'}:
                raise ValueError('Provide calculation rules.')
            rules = validate_rules(data['rules'])
        except (ValueError, UnicodeDecodeError) as error:
            return JsonResponse({'error': str(error)}, status=400)
        settings.rules = rules
        settings.save(update_fields=['rules'])
    return JsonResponse({
        'rules': settings.rules,
        'defaults': default_rules(),
        'fields': [{'field': field, 'label': label, 'checkbox': field in CHECKBOX_FIELDS, 'percentage': field in ASSET_FIELDS} for field, label in FIELDS.items()],
        'types': TYPES,
    })

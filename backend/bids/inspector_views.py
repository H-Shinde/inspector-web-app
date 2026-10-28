import json
import math
import re
from django import forms
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from .models import Inspector, Client
from .locations import zip_location, distance_miles
from .validation import contact_error


class InspectorForm(forms.ModelForm):
    class Meta:
        model = Inspector
        fields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zipCode', 'focus', 'region', 'notes', 'is_active']

    def clean(self):
        data = super().clean()
        for field in ['phone', 'city', 'state', 'zipCode']:
            error = contact_error('clientPhone' if field == 'phone' else field, data.get(field))
            if error:
                self.add_error(field, error)
        location = zip_location(data.get('zipCode'))
        state = data.get('state', '').upper()
        if location:
            if state and state != location[3]:
                self.add_error('state', 'State does not match the ZIP code.')
            data['city'] = data.get('city') or location[2]
            state = state or location[3]
        data['state'] = state
        return data


def serialize_inspector(inspector, origin=None):
    location = zip_location(inspector.zipCode)
    return {
        'id': inspector.pk,
        **{field: getattr(inspector, field) for field in InspectorForm.Meta.fields},
        'status': 'Active' if inspector.is_active else 'Inactive',
        'cityStateZip': ', '.join(filter(None, [inspector.city, ' '.join(filter(None, [inspector.state, inspector.zipCode]))])),
        'latitude': location[0] if location else None,
        'longitude': location[1] if location else None,
        'distanceMiles': distance_miles(origin, location),
    }


def save_inspector(request, instance=None):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError()
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': 'Provide a valid JSON object.'}, status=400)
    current = {field: getattr(instance, field) for field in InspectorForm.Meta.fields} if instance else {'is_active': True, 'focus': 'Inspection'}
    if instance is None and 'name' not in data and isinstance(data.get('email'), str):
        current['name'] = data['email'].strip()[:200]
    current.update(data)
    form = InspectorForm(current, instance=instance)
    if not form.is_valid():
        return JsonResponse({'error': ' '.join(f'{field}: {message}' for field, messages in form.errors.items() for message in messages)}, status=400)
    inspector = form.save(commit=False)
    inspector.owner = request.user
    inspector.save()
    return JsonResponse(serialize_inspector(inspector), status=200 if instance else 201)


@require_http_methods(['GET', 'POST'])
def inspectors(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    if request.method == 'POST':
        return save_inspector(request)
    reference_zip = request.GET.get('zipCode', '').strip()
    if 'clientId' in request.GET:
        client = get_object_or_404(Client, pk=request.GET['clientId'] if re.fullmatch(r'[0-9]+', request.GET['clientId']) is not None else 0, owner=request.user)
        reference_zip = client.zipCode
    if reference_zip and not re.fullmatch(r'\d{5}(?:-\d{4})?', reference_zip):
        return JsonResponse({'error': 'Enter a valid ZIP code.'}, status=400)
    origin = zip_location(reference_zip)
    rows = Inspector.objects.filter(owner=request.user).order_by('name', 'id')
    if request.GET.get('includeInactive') != '1':
        rows = rows.filter(is_active=True)
    results = [serialize_inspector(row, origin) for row in rows]
    results.sort(key=lambda row: (row['distanceMiles'] is None, row['distanceMiles'] or 0, row['name'].casefold(), row['id']))
    if 'radiusMiles' in request.GET:
        try:
            radius = float(request.GET['radiusMiles'])
            if not math.isfinite(radius) or not 0 < radius <= 5000:
                raise ValueError()
        except ValueError:
            return JsonResponse({'error': 'Radius must be between 0 and 5000 miles.'}, status=400)
        results = [row for row in results if row['distanceMiles'] is not None and row['distanceMiles'] <= radius]
    return JsonResponse({'inspectors': results, 'referenceZipCode': reference_zip, 'locationKnown': origin is not None, 'distanceType': 'straight-line'})


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def inspector_detail(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    inspector = get_object_or_404(Inspector, pk=pk, owner=request.user)
    if request.method == 'GET':
        return JsonResponse(serialize_inspector(inspector))
    if request.method == 'PATCH':
        return save_inspector(request, inspector)
    try:
        inspector.delete()
    except ProtectedError:
        return JsonResponse({'error': 'This inspector is assigned to bids. Mark them inactive instead.'}, status=409)
    return JsonResponse({'deleted': True})

import json
import uuid
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from .models import Inspector, Job, InspectionPhoto
from .inspector_views import InspectorForm, serialize_inspector
from .job_views import serialize_job

PART_FIELDS = ['id', 'name', 'qty', 'type', 'make', 'model', 'serial', 'condition', 'year', 'mileage', 'comments']
CONDITIONS = ['Very Good', 'Good', 'Fair', 'Poor', 'Scrap']
REQUIRED_PART_FIELDS = ['name', 'qty', 'type', 'make', 'model', 'serial', 'condition', 'year', 'mileage']


def clean_part(value):
    if not isinstance(value, dict) or set(value) - set(PART_FIELDS + ['photos']):
        raise ValueError('Invalid part fields.')
    result = {}
    for field in PART_FIELDS:
        text = value.get(field, '')
        if not isinstance(text, str) or len(text) > 4000:
            raise ValueError(f'Invalid {field}.')
        result[field] = text.strip()
    if len(result['id']) > 100:
        raise ValueError('Part ID must be at most 100 characters.')
    if not result['id'] or not result['name']:
        raise ValueError('Part ID and name are required.')
    for field in ['qty', 'year', 'mileage']:
        text = result[field]
        if text and text.upper() != 'N/A':
            if not text.isascii() or not text.isdigit() or (field == 'qty' and int(text) < 1) or (field == 'year' and len(text) != 4):
                raise ValueError(f'Enter a valid {field} or N/A.')
    if result['condition'] and result['condition'] not in CONDITIONS:
        raise ValueError('Choose Very Good, Good, Fair, Poor or Scrap for condition.')
    photos = value.get('photos', [])
    if not isinstance(photos, list) or len(photos) > 10 or any(not isinstance(photo, dict) or type(photo.get('id')) is not int for photo in photos):
        raise ValueError('Keep up to 10 saved photos per item.')
    if len({photo['id'] for photo in photos}) != len(photos):
        raise ValueError('Photo IDs must be unique.')
    result['photos'] = [{'id': photo['id']} for photo in photos]
    return result


@require_http_methods(['POST'])
@transaction.atomic
def save_part(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    inspector = get_object_or_404(Inspector, user=request.user, is_active=True)
    job = get_object_or_404(Job.objects.select_for_update().select_related('source_bid', 'inspector'), pk=pk, inspector=inspector)
    if job.status not in ['In-Progress', 'Needs Changes']:
        return JsonResponse({'error': 'Only in-progress jobs or jobs needing changes can be edited.'}, status=409)
    try:
        uploads = []
        if request.content_type == 'multipart/form-data':
            if set(request.POST) != {'part', 'revision'} or set(request.FILES) - {'files'}:
                raise ValueError('Provide item details, revision and photo files.')
            revision = request.POST['revision']
            if not revision.isascii() or not revision.isdigit():
                raise ValueError('Provide the job revision.')
            data = {'part': json.loads(request.POST['part']), 'revision': int(revision)}
            uploads = request.FILES.getlist('files')
        else:
            data = json.loads(request.body)
        if not isinstance(data, dict) or set(data) != {'part', 'revision'}:
            raise ValueError('Provide a part and job revision.')
        if type(data['revision']) is not int or data['revision'] != job.revision:
            return JsonResponse({'error': 'Job changed elsewhere. Reload before saving.'}, status=409)
        part = clean_part(data['part'])
        retained = [photo['id'] for photo in part['photos']]
        if InspectionPhoto.objects.filter(job=job, partId=part['id'], pk__in=retained).count() != len(retained):
            raise ValueError('A saved photo does not belong to this item.')
        if len(retained) + len(uploads) > 10:
            raise ValueError('Attach up to 10 photos per item.')
        from .message_views import file_type
        kinds = []
        for upload in uploads:
            if upload.size > 10 * 1024 * 1024:
                raise ValueError('Each item photo must be at most 10 MB.')
            kind = file_type(upload)
            if not kind.startswith('image/'):
                raise ValueError('Item photos must be JPEG, PNG, GIF or WebP images.')
            kinds.append(kind)
        from .inspector_jobs import parts_for_job
        parts = parts_for_job(job)
        existing = any(entry['id'] == part['id'] for entry in parts)
        if not existing and len(parts) >= 5000:
            raise ValueError('A job can contain up to 5000 parts.')
        job.inspectionParts = [part if entry['id'] == part['id'] else entry for entry in parts] if existing else parts + [part]
        from .models import bid_item_count
        expected = bid_item_count(job.source_bid)
        allocated = sum(int(entry['qty']) if str(entry.get('qty') or '').isdigit() else 1 for entry in job.inspectionParts)
        if expected and allocated > expected:
            raise ValueError(f'The bid contains {expected} items. Update its existing parts instead of adding extra quantities.')
        from .inspection_items import merge_inspection_items, current_job_items
        job.items = merge_inspection_items(current_job_items(job), [part])
        created = []
        try:
            with transaction.atomic():
                for upload, kind in zip(uploads, kinds):
                    photo = InspectionPhoto(job=job, partId=part['id'], name=upload.name[:255], contentType=kind)
                    photo.file.save(uuid.uuid4().hex, upload, save=False)
                    created.append(photo)
                    photo.save()
                    part['photos'].append({'id': photo.pk})
                # Only remove explicitly omitted photos from this item.
                removed = InspectionPhoto.objects.filter(job=job, partId=part['id']).exclude(pk__in=[photo['id'] for photo in part['photos']])
                old_files = [(photo.file.storage, photo.file.name) for photo in removed]
                removed.delete()
                for storage, name in old_files:
                    transaction.on_commit(lambda storage=storage, name=name: storage.delete(name))
                job.revision += 1
                job.save(update_fields=['inspectionParts', 'items', 'revision'])
                result = serialize_job(job, inspector_app=True)
        except Exception:
            for photo in created:
                if photo.file.name:
                    photo.file.storage.delete(photo.file.name)
            raise
        return JsonResponse(result)
    except (ValueError, UnicodeDecodeError) as error:
        return JsonResponse({'error': str(error)}, status=400)
    except OSError:
        return JsonResponse({'error': 'Unable to save the photos. Please try again.'}, status=503)


@require_http_methods(['GET', 'POST'])
def inspector_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    inspector = get_object_or_404(Inspector, user=request.user, is_active=True)
    if request.method == 'GET':
        return JsonResponse(serialize_inspector(inspector))
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict) or set(data) - {'name', 'phone', 'address', 'city', 'state', 'zipCode'}:
            raise ValueError('Only name and contact location fields can be changed.')
    except (ValueError, UnicodeDecodeError) as error:
        return JsonResponse({'error': str(error)}, status=400)
    current = {field: getattr(inspector, field) for field in InspectorForm.Meta.fields}
    form = InspectorForm({**current, **data}, instance=inspector)
    if not form.is_valid():
        return JsonResponse({'error': ' '.join(f'{field}: {message}' for field, messages in form.errors.items() for message in messages)}, status=400)
    return JsonResponse(serialize_inspector(form.save()))

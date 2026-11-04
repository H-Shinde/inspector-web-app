import json
from django.db import transaction
from django.http import JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from .models import Inspector, Job
from .job_views import serialize_job


def parts_for_job(job):
    if job.inspectionParts:
        return job.inspectionParts
    return [{
        'id': str(item.get('itemId') or f'item-{index}'), 'name': str(item.get('name') or ''),
        'qty': str(item.get('qty') or ''), 'type': str(item.get('type') or ''),
        'make': str(item.get('make') or ''), 'model': str(item.get('model') or ''),
        'serial': str(item.get('serialNumber') or ''), 'condition': '',
        'year': str(item.get('year') or ''), 'mileage': str(item.get('hoursMiles') or ''),
        'comments': str(item.get('comments') or ''), 'photos': [],
    } for index, item in enumerate(job.items)]


@require_http_methods(['GET'])
def inspector_agreement(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    inspector = get_object_or_404(Inspector, user=request.user, is_active=True)
    job = get_object_or_404(Job.objects.select_related('source_bid'), pk=pk, inspector=inspector)
    bid = job.source_bid
    if not bid.agreement:
        return JsonResponse({'error': 'No engagement agreement has been uploaded for this job.'}, status=404)
    try:
        return FileResponse(bid.agreement.open('rb'), content_type='application/pdf', as_attachment=False,
                            filename=f'{bid.referenceNumber}-engagement-agreement.pdf')
    except FileNotFoundError:
        return JsonResponse({'error': 'The engagement agreement file is unavailable.'}, status=404)


@require_http_methods(['GET', 'POST'])
@transaction.atomic
def inspector_jobs(request, pk=None):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    inspector = get_object_or_404(Inspector, user=request.user, is_active=True)
    if request.method == 'GET':
        jobs = Job.objects.filter(inspector=inspector).exclude(status='Deleted').select_related('source_bid', 'inspector')
        return JsonResponse({'inspectorId': inspector.pk, 'name': inspector.name, 'email': inspector.email, 'jobs': [serialize_job(job) for job in jobs]})
    job = get_object_or_404(Job.objects.select_for_update().select_related('source_bid', 'inspector'), pk=pk, inspector=inspector)
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict) or set(data) != {'action', 'revision'} or data['action'] not in ['accept', 'complete', 'decline']:
            raise ValueError()
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': 'Choose accept, complete or decline and provide the job revision.'}, status=400)
    if type(data['revision']) is not int or data['revision'] != job.revision or job.status in ['Complete', 'Deleted']:
        return JsonResponse({'error': 'Job has changed. Reload before trying again.'}, status=409)
    job.previousStatus = job.status
    action = data['action']
    if action in ['accept', 'decline'] and job.status != 'Assigned':
        return JsonResponse({'error': 'Only a new assigned job can be accepted or declined.'}, status=409)
    if action == 'complete' and job.status != 'In-Progress':
        return JsonResponse({'error': 'Accept the job before completing it.'}, status=409)
    if action == 'complete':
        from .inspector_data import clean_part, REQUIRED_PART_FIELDS
        try:
            parts = [clean_part(part) for part in parts_for_job(job)]
            if not parts:
                raise ValueError('Add and save at least one inspection part before submitting.')
            issues = [f'{part["name"]}: {field} is required.' for part in parts for field in REQUIRED_PART_FIELDS if not part[field]]
            if issues:
                return JsonResponse({'error': ' '.join(issues)}, status=400)
            job.inspectionParts = parts
        except ValueError as error:
            return JsonResponse({'error': str(error)}, status=400)
    if action == 'accept':
        job.status = 'In-Progress'
    elif action == 'decline':
        job.inspector = None
        job.status = 'Unassigned'
    else:
        job.status = 'Complete'
        job.completedAt = timezone.now()
    job.revision += 1
    job.save()
    return JsonResponse(serialize_job(job))

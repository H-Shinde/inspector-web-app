import json
from django.db import transaction
from django.http import JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from .models import Inspector, Job
from .job_views import serialize_job


def parts_for_job(job):
    from .inspection_items import current_job_items, parts_from_items
    items = current_job_items(job)
    return parts_from_items(items, job.inspectionParts)


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
        jobs = Job.objects.filter(inspector=inspector).exclude(status='Deleted').select_related('source_bid', 'inspector').prefetch_related('inspection_photos')
        return JsonResponse({'inspectorId': inspector.pk, 'name': inspector.name, 'email': inspector.email, 'jobs': [serialize_job(job, inspector_app=True) for job in jobs]})
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
    if action == 'complete' and job.status not in ['In-Progress', 'Needs Changes']:
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
            from .models import bid_item_count
            from .inspection_items import inspection_quantity
            expected = bid_item_count(job.source_bid)
            if expected and inspection_quantity(parts) != expected:
                raise ValueError(f'This bid requires {expected} items. Completed item quantities must match before submission.')
            job.inspectionParts = parts
        except ValueError as error:
            return JsonResponse({'error': str(error)}, status=400)
    if action == 'accept':
        job.status = 'In-Progress'
    elif action == 'decline':
        job.inspector = None
        job.status = 'Unassigned'
    else:
        job.status = 'Pending Review'
        job.completedAt = None
    job.revision += 1
    job.save()
    return JsonResponse(serialize_job(job, inspector_app=True))

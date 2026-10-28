import json
import uuid
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from .models import Job, Bid, Inspector

RATES = ['count', 'inspectionRate', 'customInspectionRate', 'additionalInspectionCharge', 'appraisalRate', 'customAppraisalRate', 'additionalAppraisalCharge']
SECTIONS = {
    'Appraised Items': RATES, 'Non Appraised Items': RATES,
    'Asset Valuation': ['fmvContinuedUse', 'fairMarketValueRemoved', 'orderlyLiquidationValue', 'forcedLiquidationValue', 'other', 'additionalLocations'],
    'Inspection Fees': ['totalInspectedItems', 'totalNonInspectedItems', 'totalAppraisal', 'rush', 'pdfDiscount', 'total', 'nonRushTotal', 'meNote'],
}
ITEM_FIELDS = ['name', 'type', 'make', 'model', 'serialNumber', 'year', 'hoursMiles', 'photoNumber', 'referenceNumber', 'comments']


def serialize_job(job):
    from .views import serialize_bid
    result = serialize_bid(job.source_bid, include_job=False)
    result.update({
        'id': job.pk, 'jobId': job.pk, 'referenceNumber': f'JOB-{job.pk:06d}', 'sourceBidId': job.source_bid_id,
        'sourceBidReference': job.source_bid.referenceNumber, 'sourceBidBackend': 'django', 'recordType': 'Job',
        'status': job.status, 'previousStatus': job.previousStatus, 'revision': job.revision,
        'inspectorId': job.inspector_id, 'inspector': job.inspector.name if job.inspector else '',
        'inspectorEmail': job.inspector.email if job.inspector else '',
        'inspectorEmailFor': job.inspector.name if job.inspector else '',
        'items': job.items, 'sectionDetails': job.sectionDetails, 'valuationHistory': job.valuationHistory,
        'createdAt': job.createdAt, 'completedAt': job.completedAt, 'deletedAt': job.deletedAt,
        'pdf': result.get('engagementAgreement', ''),
    })
    return result


def body(request):
    if len(request.body) > 2 * 1024 * 1024:
        raise ValueError('Job data is too large.')
    data = json.loads(request.body)
    if not isinstance(data, dict):
        raise ValueError('Provide a JSON object.')
    return data


def clean_items(items):
    if not isinstance(items, list) or len(items) > 5000:
        raise ValueError('Provide up to 5000 items.')
    result, seen = [], set()
    for item in items:
        if not isinstance(item, dict) or set(item) - set(ITEM_FIELDS + ['itemId']):
            raise ValueError('Invalid item fields.')
        cleaned = {}
        for field in ITEM_FIELDS:
            value = item.get(field, '')
            if not isinstance(value, (str, int)) or isinstance(value, bool) or len(str(value)) > 4000:
                raise ValueError(f'Invalid item {field}.')
            cleaned[field] = str(value).strip()
        if not cleaned['name']:
            raise ValueError('Each item needs a name.')
        if cleaned['year'] and (not cleaned['year'].isascii() or not cleaned['year'].isdigit() or len(cleaned['year']) != 4 or int(cleaned['year']) < 1000):
            raise ValueError('Enter a four-digit item year.')
        item_id = item.get('itemId') or str(uuid.uuid4())
        if not isinstance(item_id, str) or len(item_id) > 100 or item_id in seen:
            raise ValueError('Item IDs must be unique.')
        seen.add(item_id)
        result.append({**cleaned, 'itemId': item_id})
    return result


def clean_sections(sections):
    if not isinstance(sections, dict) or set(sections) - set(SECTIONS):
        raise ValueError('Invalid job section.')
    result = {}
    for section, fields in sections.items():
        if not isinstance(fields, dict) or set(fields) - set(SECTIONS[section]):
            raise ValueError('Invalid job section fields.')
        result[section] = {}
        for field, value in fields.items():
            if not isinstance(value, (str, int, float)) or isinstance(value, bool) or len(str(value)) > 4000:
                raise ValueError(f'Invalid {field}.')
            text = str(value).strip()
            if text and field not in ['other', 'additionalLocations', 'meNote']:
                try:
                    number = Decimal(text)
                    if not number.is_finite() or number < 0 or number > Decimal('9999999999.99') or number != number.quantize(Decimal('.01')):
                        raise ValueError(f'{field} must be a nonnegative amount with up to two decimals.')
                    if field in ['count', 'totalInspectedItems', 'totalNonInspectedItems'] and number != number.to_integral_value():
                        raise ValueError(f'{field} must be a whole number.')
                except InvalidOperation:
                    raise ValueError(f'Enter a valid {field}.')
            result[section][field] = text
    return result


@require_http_methods(['GET', 'POST'])
@transaction.atomic
def jobs(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    if request.method == 'POST':
        try:
            data = body(request)
            if set(data) != {'bidId'} or not isinstance(data['bidId'], int) or isinstance(data['bidId'], bool):
                raise ValueError('Provide a bid ID.')
        except (ValueError, UnicodeDecodeError) as error:
            return JsonResponse({'error': str(error)}, status=400)
        bid = get_object_or_404(Bid.objects.select_for_update(), pk=data['bidId'], owner=request.user)
        if bid.status != 'Accepted':
            return JsonResponse({'error': 'Only accepted bids can become jobs.'}, status=409)
        job, created = Job.objects.get_or_create(source_bid=bid, defaults={'owner': request.user})
        return JsonResponse(serialize_job(job), status=201 if created else 200)
    records = Job.objects.filter(owner=request.user).select_related('source_bid', 'inspector').order_by('-createdAt', '-id')
    records = records.filter(status__in=['Complete', 'Deleted']) if request.GET.get('history') == '1' else records.exclude(status__in=['Complete', 'Deleted'])
    return JsonResponse({'jobs': [serialize_job(job) for job in records]})


@require_http_methods(['GET', 'PATCH', 'DELETE'])
@transaction.atomic
def job_detail(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    job = get_object_or_404(Job.objects.select_for_update().select_related('source_bid', 'inspector'), pk=pk, owner=request.user)
    if request.method == 'GET':
        return JsonResponse(serialize_job(job))
    try:
        data = body(request) if request.method == 'PATCH' else {'status': 'Deleted'}
        if set(data) - {'inspectorId', 'items', 'sectionDetails', 'status', 'revision'}:
            raise ValueError('Only job assignment, items, sections and status can be changed.')
        if 'revision' in data and (type(data['revision']) is not int or data['revision'] != job.revision):
            return JsonResponse({'error': 'This job changed elsewhere. Reload before saving.'}, status=409)
        if job.status in ['Complete', 'Deleted']:
            return JsonResponse({'error': 'Archived jobs are read-only.'}, status=409)
        if 'items' in data:
            if 'revision' not in data:
                raise ValueError('Provide the job revision when updating items.')
            job.items = clean_items(data['items'])
        if 'sectionDetails' in data:
            for section, changes in clean_sections(data['sectionDetails']).items():
                job.sectionDetails[section] = {**job.sectionDetails.get(section, {}), **changes}
                if section in ['Asset Valuation', 'Inspection Fees']:
                    job.valuationHistory = (job.valuationHistory + [{'jobId': str(job.pk), 'section': section, 'status': 'Saved', 'savedAt': timezone.now().isoformat(), 'values': job.sectionDetails[section].copy()}])[-200:]
        if 'inspectorId' in data:
            inspector_id = data['inspectorId']
            if inspector_id is None:
                job.inspector = None
                job.status = 'Unassigned'
            else:
                if type(inspector_id) is not int:
                    raise ValueError('Choose a valid inspector.')
                inspector = Inspector.objects.filter(pk=inspector_id, owner=request.user, is_active=True).first()
                if inspector is None:
                    raise ValueError('Choose an active inspector belonging to your account.')
                job.inspector = inspector
                job.status = 'Assigned'
        if 'status' in data:
            status = data['status']
            if status not in ['Unassigned', 'Assigned', 'In-Progress', 'Pending Review', 'Complete', 'Deleted']:
                raise ValueError('Choose a valid job status.')
            if status in ['Assigned', 'In-Progress', 'Pending Review'] and job.inspector is None:
                raise ValueError('Assign an inspector before advancing the job.')
            if status == 'Unassigned' and job.inspector is not None:
                raise ValueError('Remove the inspector to mark a job unassigned.')
            job.previousStatus = job.status
            job.status = status
            if status == 'Complete': job.completedAt = timezone.now()
            if status == 'Deleted': job.deletedAt = timezone.now()
        job.revision += 1
        job.save()
    except (ValueError, UnicodeDecodeError) as error:
        return JsonResponse({'error': str(error)}, status=400)
    return JsonResponse(serialize_job(job))

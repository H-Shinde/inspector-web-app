import json
from django.db.models import Count, Max, Q, Subquery
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_GET
from .models import Notification, Inspector


def notifications_for(request):
    if not request.user.is_authenticated:
        return None
    inspector_app = request.path.startswith('/api/inspector/')
    if inspector_app:
        get_object_or_404(Inspector, user=request.user, is_active=True)
    elif request.user.email.casefold() != 'admin@email.com':
        return None
    return Notification.objects.filter(recipient=request.user, realm='inspector' if inspector_app else 'admin')


def summary(rows):
    unread = rows.filter(readAt__isnull=True)
    counts = {}
    for entry in unread.values('kind').annotate(messages=Count('id'), records=Count('objectId', distinct=True)):
        counts[entry['kind']] = entry['messages'] if entry['kind'] == 'message' else entry['records']
    records = list(unread.exclude(kind='message').values('kind', 'objectId').annotate(version=Max('version'), lastId=Max('id'), newCount=Count('id', filter=Q(isNew=True))))
    for record in records:
        record['isNew'] = record.pop('newCount') > 0
    conversations = list(unread.filter(kind='message').values('conversationId').annotate(count=Count('id'), lastMessageId=Max('objectId'), lastId=Max('id')))
    latest_records = unread.exclude(kind='message').values('kind', 'objectId').annotate(last=Max('id')).values('last')
    latest_threads = unread.filter(kind='message').values('conversationId').annotate(last=Max('id')).values('last')
    displayed = unread.filter(Q(id__in=Subquery(latest_records)) | Q(id__in=Subquery(latest_threads)))
    return {'counts': counts, 'total': sum(counts.values()), 'records': records, 'conversations': conversations,
            'throughId': unread.aggregate(last=Max('id'))['last'] or 0,
            'notifications': list(displayed.order_by('-id').values('id', 'kind', 'objectId', 'conversationId', 'title', 'target', 'createdAt', 'version', 'isNew')[:100])}


@require_http_methods(['GET', 'POST'])
def notifications(request):
    rows = notifications_for(request)
    if rows is None:
        return JsonResponse({'error': 'Sign in to this app to see updates.'}, status=401)
    if request.method == 'GET':
        return JsonResponse(summary(rows))
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict) or set(data) - {'ids', 'all', 'throughId', 'kind', 'objectId', 'conversationId'}:
            raise ValueError('Choose which updates to mark as read.')
        if 'ids' in data:
            ids = data['ids']
            if not isinstance(ids, list) or len(ids) > 100 or any(type(key) is not int for key in ids):
                raise ValueError('Choose up to 100 update IDs.')
            rows = rows.filter(pk__in=ids)
        else:
            through = data.get('throughId')
            if type(through) is not int or through < 0:
                raise ValueError('Provide the last displayed update ID.')
            rows = rows.filter(pk__lte=through)
            if data.get('all') is not True:
                if not isinstance(data.get('kind'), str):
                    raise ValueError('Choose an update type.')
                rows = rows.filter(kind=data['kind'])
                field = 'conversationId' if data['kind'] == 'message' else 'objectId'
                if type(data.get(field)) is not int:
                    raise ValueError('Choose a record or conversation.')
                rows = rows.filter(**{field: data[field]})
        rows.filter(readAt__isnull=True).update(readAt=timezone.now())
        from .live_updates import notify_job_change
        notify_job_change(None)
        return JsonResponse(summary(notifications_for(request)))
    except (ValueError, UnicodeDecodeError) as error:
        return JsonResponse({'error': str(error)}, status=400)


@require_GET
def notification_events(request):
    rows = notifications_for(request)
    if rows is None:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    from .live_updates import stream_response
    inspector = Inspector.objects.filter(user=request.user, is_active=True).first() if request.path.startswith('/api/inspector/') else None
    def signature():
        return rows.aggregate(last=Max('id'), unread=Count('id', filter=Q(readAt__isnull=True)))
    return stream_response(request, signature, 'updates-changed', inspector.pk if inspector else None)

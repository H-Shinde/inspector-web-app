import json
import uuid
from django.db import transaction
from django.http import JsonResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods, require_GET
from .models import Inspector, Message, MessageAttachment


def conversation(request, inspector_id=None):
    if request.path.startswith('/api/inspector/'):
        return get_object_or_404(Inspector, user=request.user, is_active=True)
    return get_object_or_404(Inspector, pk=inspector_id, owner=request.user)


def serialize_message(message, inspector_app):
    prefix = '/api/inspector/messages/' if inspector_app else '/api/messages/'
    return {'id': message.pk, 'clientId': str(message.clientId), 'inspectorId': message.inspector_id, 'from': 'inspector' if message.sender_id == message.inspector.user_id else 'admin',
            'text': message.text, 'createdAt': message.createdAt,
            'attachments': [{'id': attachment.pk, 'name': attachment.name,
                             'type': 'video' if attachment.contentType.startswith('video/') else 'image',
                             'url': f'{prefix}attachments/{attachment.pk}/'} for attachment in message.attachments.all()]}


def file_type(upload):
    if upload.size > 25 * 1024 * 1024:
        raise ValueError('Each attachment must be at most 25 MB.')
    head = upload.read(16)
    upload.seek(0)
    if head.startswith(bytes([137, 80, 78, 71, 13, 10, 26, 10])): return 'image/png'
    if head.startswith(bytes([255, 216, 255])): return 'image/jpeg'
    if head[:6] in [b'GIF87a', b'GIF89a']: return 'image/gif'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP': return 'image/webp'
    if head[4:8] == b'ftyp': return 'video/mp4'
    if head.startswith(bytes([26, 69, 223, 163])): return 'video/webm'
    raise ValueError('Attach a PNG, JPEG, GIF, WebP, MP4 or WebM file.')


@require_http_methods(['GET', 'POST'])
@transaction.atomic
def messages(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    inspector_app = request.path.startswith('/api/inspector/')
    try:
        if request.method == 'GET':
            inspector = conversation(request, request.GET.get('inspectorId'))
            rows = Message.objects.filter(inspector=inspector).select_related('inspector').prefetch_related('attachments')
            if request.GET.get('before'):
                rows = rows.filter(pk__lt=int(request.GET['before']))
            batch = list(rows.order_by('-id')[:201])
            return JsonResponse({'inspectorId': inspector.pk, 'messages': [serialize_message(row, inspector_app) for row in reversed(batch[:200])], 'hasEarlier': len(batch) > 200})
        if int(request.META.get('CONTENT_LENGTH') or 0) > 126 * 1024 * 1024:
            raise ValueError('Message attachments are too large.')
        data = request.POST.dict() if request.content_type == 'multipart/form-data' else json.loads(request.body)
        if not isinstance(data, dict) or set(data) - {'text', 'clientId', 'inspectorId'}:
            raise ValueError('Provide message text and a delivery ID.')
        if inspector_app and 'inspectorId' in data:
            raise ValueError('Inspectors can message only their administrator.')
        inspector = conversation(request, data.get('inspectorId'))
        text = data.get('text', '')
        if not isinstance(text, str) or len(text.strip()) > 2000:
            raise ValueError('Messages must be at most 2000 characters.')
        client_id = uuid.UUID(str(data.get('clientId', '')))
        uploads = request.FILES.getlist('files')
        if len(uploads) > 5 or (not text.strip() and not uploads):
            raise ValueError('Write a message or attach up to five files.')
        kinds = [file_type(upload) for upload in uploads]
        message, created = Message.objects.get_or_create(inspector=inspector, sender=request.user, clientId=client_id, defaults={'text': text.strip()})
        if created:
            for upload, kind in zip(uploads, kinds):
                attachment = MessageAttachment(message=message, name=upload.name[:255], contentType=kind)
                attachment.file.save(f'{uuid.uuid4().hex}', upload, save=True)
        return JsonResponse(serialize_message(message, inspector_app), status=201 if created else 200)
    except (ValueError, UnicodeDecodeError, TypeError) as error:
        return JsonResponse({'error': str(error) or 'Invalid message.'}, status=400)


@require_GET
def attachment(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    files = MessageAttachment.objects.select_related('message__inspector')
    if request.path.startswith('/api/inspector/'):
        files = files.filter(message__inspector__user=request.user, message__inspector__is_active=True)
    else:
        files = files.filter(message__inspector__owner=request.user)
    record = get_object_or_404(files, pk=pk)
    try:
        response = FileResponse(record.file.open('rb'), content_type=record.contentType, filename=record.name)
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'private, no-store'
        return response
    except FileNotFoundError:
        return JsonResponse({'error': 'Attachment unavailable.'}, status=404)

import json
import threading
from django.db import close_old_connections, transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET
from .models import Inspector, Job, Message, Notification


_changes = threading.Condition()
_generation = 0


@receiver(post_save, sender=Notification)
@receiver(post_save, sender=Message)
@receiver(post_save, sender=Job)
@receiver(post_delete, sender=Job)
def notify_job_change(sender, **kwargs):
    def committed():
        global _generation
        with _changes:
            _generation += 1
            _changes.notify_all()
    transaction.on_commit(committed)


@require_GET
def job_events(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    if request.path.startswith('/api/inspector/'):
        inspector = get_object_or_404(Inspector, user=request.user, is_active=True)
        filters = {'inspector_id': inspector.pk}
    else:
        if request.user.email.casefold() != 'admin@email.com':
            return JsonResponse({'error': 'Admin access required.'}, status=403)
        filters = {'owner_id': request.user.pk}
    return stream_response(request, lambda: list(Job.objects.filter(**filters).order_by('pk').values_list('pk', 'revision', 'status')), 'jobs-changed', filters.get('inspector_id'))


def stream_response(request, signature_for_request, event_name, inspector_id=None):
    def session_active():
        if not request.session.exists(request.session.session_key) or not get_user_model().objects.filter(pk=request.user.pk, is_active=True).exists():
            return False
        return not inspector_id or Inspector.objects.filter(pk=inspector_id, user_id=request.user.pk, is_active=True).exists()

    def event(signature):
        return 'event: ' + event_name + '\ndata: ' + json.dumps(signature) + '\n\n'

    expired = 'event: session-expired\ndata: {}\n\n'

    def stream():
        previous = None
        heartbeat = 0
        try:
            while True:
                with _changes:
                    generation = _generation
                close_old_connections()
                if not session_active():
                    yield expired
                    return
                signature = signature_for_request()
                if signature != previous:
                    yield event(signature)
                    previous = signature
                elif heartbeat % 15 == 0:
                    yield ': keepalive\n\n'
                heartbeat += 1
                with _changes:
                    if _generation == generation:
                        _changes.wait(timeout=1)
        finally:
            close_old_connections()
    if request.get_host().partition(':')[0].lower().endswith('.pythonanywhere.com'):
        # Release the synchronous worker after each snapshot. EventSource reconnects after the retry delay.
        snapshot = event(signature_for_request()) if session_active() else expired
        response = HttpResponse('retry: 10000\n' + snapshot, content_type='text/event-stream')
    else:
        response = StreamingHttpResponse(stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@require_GET
def message_events(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Sign in required.'}, status=401)
    from .message_views import conversation
    inspector = conversation(request, request.GET.get('inspectorId'))
    if not request.path.startswith('/api/inspector/') and request.user.email.casefold() != 'admin@email.com':
        return JsonResponse({'error': 'Admin access required.'}, status=403)
    return stream_response(request, lambda: list(Message.objects.filter(inspector=inspector).order_by('-pk').values_list('pk', flat=True)[:1]), 'messages-changed', inspector.pk if request.path.startswith('/api/inspector/') else None)

from contextvars import ContextVar
from .app_sessions import inspector_request

actor = ContextVar('notification_actor', default=None)


class RequestActorMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        identity = (request.user.pk, 'inspector' if inspector_request(request) else 'admin') if request.user.is_authenticated else None
        token = actor.set(identity)
        try:
            return self.get_response(request)
        finally:
            actor.reset(token)

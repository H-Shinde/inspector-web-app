from contextlib import contextmanager
from django.conf import settings
from django.contrib.sessions.middleware import SessionMiddleware
from django.middleware.csrf import CsrfViewMiddleware


def inspector_request(request):
    return (request.path.startswith('/api/inspector/')
            or request.path.startswith('/api/auth/inspector-')
            or request.path == '/api/inspector-registration/')


@contextmanager
def scoped_cookies(request, default_name, inspector_name):
    original = request.COOKIES
    if inspector_request(request):
        request.COOKIES = {key: value for key, value in original.items() if key != default_name}
        if inspector_name in original:
            request.COOKIES[default_name] = original[inspector_name]
    try:
        yield
    finally:
        request.COOKIES = original


def rename_cookie(response, old, new):
    if old in response.cookies:
        cookie = response.cookies[old]
        response.set_cookie(new, cookie.value)
        response.cookies[new].update(dict(cookie.items()))
        del response.cookies[old]


class AppSessionMiddleware(SessionMiddleware):
    def process_request(self, request):
        with scoped_cookies(request, settings.SESSION_COOKIE_NAME, settings.INSPECTOR_SESSION_COOKIE_NAME):
            return super().process_request(request)

    def process_response(self, request, response):
        with scoped_cookies(request, settings.SESSION_COOKIE_NAME, settings.INSPECTOR_SESSION_COOKIE_NAME):
            response = super().process_response(request, response)
        if inspector_request(request):
            rename_cookie(response, settings.SESSION_COOKIE_NAME, settings.INSPECTOR_SESSION_COOKIE_NAME)
        return response


class AppCsrfMiddleware(CsrfViewMiddleware):
    def _get_secret(self, request):
        with scoped_cookies(request, settings.CSRF_COOKIE_NAME, settings.INSPECTOR_CSRF_COOKIE_NAME):
            return super()._get_secret(request)

    def _set_csrf_cookie(self, request, response):
        super()._set_csrf_cookie(request, response)
        if inspector_request(request) and not settings.CSRF_USE_SESSIONS:
            rename_cookie(response, settings.CSRF_COOKIE_NAME, settings.INSPECTOR_CSRF_COOKIE_NAME)

from django.conf import settings


def force_inspector_login(client, user):
    admin_cookie = client.cookies.pop(settings.SESSION_COOKIE_NAME, None)
    client.force_login(user)
    client.cookies[settings.INSPECTOR_SESSION_COOKIE_NAME] = client.cookies.pop(settings.SESSION_COOKIE_NAME).value
    if admin_cookie is not None:
        client.cookies[settings.SESSION_COOKIE_NAME] = admin_cookie.value

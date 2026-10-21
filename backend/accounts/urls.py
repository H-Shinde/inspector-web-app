from django.urls import path
from . import views

urlpatterns = [
    path("csrf/", views.csrf),
    path("login/", views.sign_in),
    path("me/", views.current_user),
    path("logout/", views.sign_out),
    path("password-reset/", views.password_reset, name="password-reset"),
    path("password-reset-confirm/", views.password_reset_confirm, name="password-reset-confirm"),
]

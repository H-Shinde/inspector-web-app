from django.contrib import admin
from django.urls import include, path
from bids.client_views import clients
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/bids/", include("bids.urls")),
    path("api/clients/", clients, name="clients"),
]

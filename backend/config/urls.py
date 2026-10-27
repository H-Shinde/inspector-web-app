from django.contrib import admin
from django.urls import include, path
from bids.client_views import clients
from bids.settings_views import bid_settings
urlpatterns = [
    path("api/bid-settings/", bid_settings, name="bid-settings"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/bids/", include("bids.urls")),
    path("api/clients/", clients, name="clients"),
]

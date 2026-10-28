from bids.job_views import jobs, job_detail
from bids.inspector_views import inspectors, inspector_detail
from django.contrib import admin
from django.urls import include, path
from bids.client_views import clients
from bids.settings_views import bid_settings
urlpatterns = [
    path("api/jobs/", jobs, name="jobs"),
    path("api/jobs/<int:pk>/", job_detail, name="job-detail"),
    path("api/inspectors/", inspectors, name="inspectors"),
    path("api/inspectors/<int:pk>/", inspector_detail, name="inspector-detail"),
    path("api/bid-settings/", bid_settings, name="bid-settings"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/bids/", include("bids.urls")),
    path("api/clients/", clients, name="clients"),
]

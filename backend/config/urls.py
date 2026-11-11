from bids.job_views import jobs, job_detail
from bids.inspector_views import inspectors, inspector_detail
from django.contrib import admin
from bids.registration_views import inspector_registration
from bids.inspector_jobs import inspector_jobs, inspector_agreement
from bids.inspector_data import save_part, inspector_profile
from django.urls import include, path
from bids.client_views import clients, client_detail
from bids.settings_views import bid_settings
from bids.live_updates import job_events
from bids.message_views import messages, attachment
from bids.live_updates import message_events
from bids.notification_views import notifications, notification_events
urlpatterns = [
    path('api/notifications/', notifications),
    path('api/notification-events/', notification_events),
    path('api/inspector/notifications/', notifications),
    path('api/inspector/notification-events/', notification_events),
    path('api/messages/', messages),
    path('api/messages/attachments/<int:pk>/', attachment),
    path('api/message-events/', message_events),
    path('api/inspector/messages/', messages),
    path('api/inspector/messages/attachments/<int:pk>/', attachment),
    path('api/inspector/message-events/', message_events),
    path('api/job-events/', job_events),
    path('api/inspector/events/', job_events),
    path('api/inspector/profile/', inspector_profile),
    path('api/inspector/jobs/<int:pk>/parts/', save_part),
    path('api/inspector/jobs/<int:pk>/agreement/', inspector_agreement),
    path('api/inspector/jobs/', inspector_jobs),
    path('api/inspector/jobs/<int:pk>/', inspector_jobs),
    path('api/inspector-registration/', inspector_registration, name='inspector-registration'),
    path('api/clients/<int:pk>/', client_detail, name='client-detail'),
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

from django.urls import path
from . import views

urlpatterns = [
    path("import/", views.import_bids, name="import-bids"),
    path("", views.bids, name="bids"),
    path("inspectors/", views.inspectors, name="bid-inspectors"),
    path("<int:pk>/", views.bid_detail, name="bid-detail"),
    path("<int:pk>/agreement/", views.bid_agreement, name="bid-agreement"),
]

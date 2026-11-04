from django.contrib import admin
from .models import Bid, Inspector
from .models import Client

admin.site.register(Client)
admin.site.register(Bid)
@admin.register(Inspector)
class InspectorAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'zipCode', 'city', 'state', 'is_active']
    search_fields = ['name', 'email', 'zipCode', 'city']
    list_filter = ['is_active', 'state', 'focus']
from .models import BidSettings
admin.site.register(BidSettings)

from .models import Job
admin.site.register(Job)

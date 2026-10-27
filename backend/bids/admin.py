from django.contrib import admin
from .models import Bid, Inspector
from .models import Client

admin.site.register(Client)
admin.site.register(Bid)
admin.site.register(Inspector)
from .models import BidSettings
admin.site.register(BidSettings)

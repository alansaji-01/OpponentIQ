"""OpponentIQ URL Configuration"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Dedicated Namespaced App Routing
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.teams.urls')),
    path('api/', include('apps.matches.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.ml_engine.urls')),
    path('api/', include('apps.intelligence.urls')),
    path('api/', include('apps.vision.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

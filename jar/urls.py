from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('user_auth.urls')),
    path('api/driver/', include('driver_verification.urls')),
    path('api/trips/', include('trips.urls')),
   path('api/simple/', include('simple_trips.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)




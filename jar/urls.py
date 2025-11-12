from django.contrib import admin
from django.urls import path, include
from simple_trips.views import SearchNearbyView
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('user_auth.urls')),
    path('api/driver/', include('driver_verification.urls')),
    path('api/trips/', include('simple_trips.urls')),
    # legacy front-end path used by mirror.html
    path('api/search/nearby/', SearchNearbyView.as_view()),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('user_auth.urls')),
    path('api/driver/', include('driver_verification.urls')),]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LocationViewSet, ZoneMapViewSet, LocationHistoryViewSet

app_name = 'trips'

router = DefaultRouter()
router.register(r'location', LocationViewSet, basename='location')
router.register(r'zones', ZoneMapViewSet, basename='zones')
router.register(r'location-history', LocationHistoryViewSet, basename='location-history')

urlpatterns = [
    path('', include(router.urls)),
]

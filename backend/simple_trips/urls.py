from django.urls import path
from .views import SearchNearbyView, PrebookRideView, RequestRideView

app_name = 'simple_trips'

urlpatterns = [
    path('search/nearby/', SearchNearbyView.as_view(), name='search_nearby'),
    path('prebook/', PrebookRideView.as_view(), name='prebook_ride'),
    path('request/', RequestRideView.as_view(), name='request_ride'),
]

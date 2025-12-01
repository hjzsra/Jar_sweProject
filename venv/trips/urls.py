from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LocationViewSet, ZoneMapViewSet, LocationHistoryViewSet
from .views import RideViewSet
from .views import RideViewSet,BookingRequestViewSet , MyBookingViewSet 


app_name = 'trips'
router = DefaultRouter()

router.register(r'location', LocationViewSet, basename='location')
router.register(r'zones', ZoneMapViewSet, basename='zones')
router.register(r'location-history', LocationHistoryViewSet, basename='location-history')

urlpatterns = [
    path('', include(router.urls)),
]
router.register(r'rides', RideViewSet, basename='ride')

urlpatterns = [path('api/', include(router.urls)),
path('api/rides/<int:pk>/join_ride/', 
         RideViewSet.as_view({'post': 'join_ride'}), 
         name='ride-join'),
]
router = DefaultRouter()
router.register(r'rides', RideViewSet, basename='ride')
router.register(r'booking-requests', BookingRequestViewSet, basename='booking-request')
router.register(r'my-bookings', MyBookingViewSet, basename='my-booking')

urlpatterns = [ path('api/', include(router.urls)),path('api/rides/<int:pk>/join_ride/', 
         RideViewSet.as_view({'post': 'join_ride'}), 
         name='ride-join'),
         path('api/booking-requests/<int:pk>/approve/', 
         BookingRequestViewSet.as_view({'post': 'approve'}), 
         name='booking-approve'),
         path('api/booking-requests/<int:pk>/reject/', 
         BookingRequestViewSet.as_view({'post': 'reject'}), 
         name='booking-reject'),
]
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
   
    LocationViewSet, 
    ZoneMapViewSet, 
    LocationHistoryViewSet,
    
   
    BookRideView,
    JoinRideView,
    ShareRideView,
    AvailableRidesMapView,
    AcceptPassengerView,
    RejectPassengerView,
    TripDetailView,
    StartTripView,
    CompleteTripView,
    CancelTripView,
    MyTripsView
    
)


app_name = 'trips'

router = DefaultRouter()
router.register(r'location', LocationViewSet, basename='location')
router.register(r'zones', ZoneMapViewSet, basename='zones')
router.register(r'location-history', LocationHistoryViewSet, basename='location-history')

urlpatterns = [
    path('', include(router.urls)),
     path('book/', BookRideView.as_view(), name='book_ride'),
    
    
    path('<str:trip_id>/join/', JoinRideView.as_view(), name='join_ride'),
    
   
    path('create/', ShareRideView.as_view(), name='create_trip'),
    path('share/', ShareRideView.as_view(), name='share_ride'), 
    
   
    path('map/available/', AvailableRidesMapView.as_view(), name='available_rides_map'),
    
   
    path('<str:trip_id>/', TripDetailView.as_view(), name='trip_detail'),
    
    
    path('<str:trip_id>/passengers/<int:passenger_id>/accept/', 
         AcceptPassengerView.as_view(), 
         name='accept_passenger'),
    
   
    path('<str:trip_id>/passengers/<int:passenger_id>/reject/', 
         RejectPassengerView.as_view(), 
         name='reject_passenger'),
    
    path('<str:trip_id>/start/', StartTripView.as_view(), name='start_trip'),
    
    
    path('<str:trip_id>/complete/', CompleteTripView.as_view(), name='complete_trip'),
    
    
    path('<str:trip_id>/cancel/', CancelTripView.as_view(), name='cancel_trip'),
    
    path('my-trips/', MyTripsView.as_view(), name='my_trips'),
]


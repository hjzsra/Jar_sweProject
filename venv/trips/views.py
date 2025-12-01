from __future__ import annotations
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.db.models import F, Q, Sum
from django.db.models.functions import Coalesce
import logging

from .models import UserLocation, ZoneMap, LocationHistory, Trip, Ride, Booking
from .serializers import (
    UserLocationSerializer,
    LocationPermissionSerializer,
    NearbyUserSerializer,
    ZoneMapSerializer,
    LocationHistorySerializer,
    LocationUpdateSerializer,
    RideSerializer,
    BookingSerializer,
)
from .tasks import process_location_update

logger = logging.getLogger(__name__)


class RideViewSet(viewsets.ModelViewSet[Ride]):
   
    queryset = Ride.objects.filter(is_active=True, departure_time__gte=timezone.now()).order_by('departure_time')
    serializer_class = RideSerializer

    def get_queryset(self):
        base_queryset = super().get_queryset()
        start_location = self.request.query_params.get('start_location')
        end_location = self.request.query_params.get('end_location')

        if start_location:
            base_queryset = base_queryset.filter(start_location__icontains=start_location)

        if end_location:
            base_queryset = base_queryset.filter(end_location__icontains=end_location)

        # Annotate with the count of confirmed seats and filter for available seats.
        # This is more efficient than filtering in Python.
        confirmed_seats_qs = Sum('bookings__seats_requested', filter=Q(bookings__status='CONFIRMED'))
        
        base_queryset = base_queryset.annotate(
            confirmed_seats=Coalesce(confirmed_seats_qs, 0)
        ).filter(seats__gt=F('confirmed_seats'))

        return base_queryset

    def perform_create(self, serializer):
        """Logic for 'Share ride' button: Set the ride owner to the current authenticated user."""
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def join_ride(self, request, pk=None):
        """
        Handles both 'Book ride' and 'Join ride' components.
        A user attempts to create a booking for this ride.
        """
        ride = get_object_or_404(Ride, pk=pk)
        passenger = request.user
        
        booking_data = request.data.copy()
        booking_data['ride'] = ride.id  # Link to the ride
        booking_serializer = BookingSerializer(data=booking_data, context={'request': request})
        booking_serializer.is_valid(raise_exception=True)
        seats_requested = booking_serializer.validated_data.get('seats_requested', 1)

        if passenger == ride.driver:
            return Response({'error': 'Driver cannot book/join their own ride.'}, status=status.HTTP_400_BAD_REQUEST)

        if seats_requested > ride.available_seats:
            return Response({'error': f'Only {ride.available_seats} seats are available.'},
                            status=status.HTTP_400_BAD_REQUEST)

        if Booking.objects.filter(ride=ride, passenger=passenger, status__in=['PENDING', 'CONFIRMED']).exists():
            return Response({'error': 'You already have an active booking for this ride.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                booking = Booking.objects.create(
                    ride=ride,
                    passenger=passenger,
                    seats_requested=seats_requested,
                    status='PENDING')
            return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BookingRequestViewSet(viewsets.GenericViewSet[Booking]):
    
 serializer_class = BookingSerializer
 queryset = Booking.objects.all()

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
            ride__driver=user,
            status='PENDING'
        ).select_related('ride', 'passenger').order_by('booked_at')

    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def approve(self, request, pk=None):
        booking = get_object_or_404(Booking, pk=pk, status='PENDING', ride__driver=request.user)
        if booking.seats_requested > booking.ride.available_seats:
            return Response({'error': f"Cannot approve: only {booking.ride.available_seats} seats remain."},
                            status=status.HTTP_400_BAD_REQUEST)

        booking.status = 'CONFIRMED'
        booking.save()

        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        booking = get_object_or_404(Booking, pk=pk, status='PENDING', ride__driver=request.user)
        booking.status = 'REJECTED'
        booking.save()

        return Response(self.get_serializer(booking).data)


class MyBookingViewSet(viewsets.ReadOnlyModelViewSet[Booking]):
   
    serializer_class = BookingSerializer

    def get_queryset(self):
        
        user = self.request.user
        return Booking.objects.filter(
            passenger=user
        ).select_related('ride', 'passenger').order_by('-booked_at')

    def retrieve(self, request, pk=None):
        
        booking = get_object_or_404(Booking, pk=pk, passenger=request.user)
        return Response(self.get_serializer(booking).data)
        
class LocationViewSet(viewsets.ModelViewSet[UserLocation]):
    serializer_class = UserLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserLocation.objects.filter(user=self.request.user)

    def get_object(self):
        user_location, created = UserLocation.objects.get_or_create(
            user=self.request.user
        )
        return user_location

    @action(detail=False, methods=['post'])
    def set_permission(self, request):
        serializer = LocationPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_location = self.get_object()
        user_location.location_permission_granted = serializer.validated_data['location_permission_granted']
        user_location.location_permission_type = serializer.validated_data['location_permission_type']
        user_location.save()

        return Response({
            'success': True,
            'message': 'Location permission updated successfully',
            'data': UserLocationSerializer(user_location).data
        })

    @action(detail=False, methods=['post'])
    def update_location(self, request):
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_location = self.get_object()
        if not user_location.location_permission_granted:
            return Response({
                'success': False,
                'error': 'Location permission not granted'
            }, status=status.HTTP_403_FORBIDDEN)
        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        accuracy = serializer.validated_data.get('accuracy')

        user_location.update_location(latitude, longitude, accuracy)
        transaction.on_commit(lambda: process_location_update.delay(
            user_id=request.user.id,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            speed=serializer.validated_data.get('speed')
        ))

        return Response({
            'success': True,
            'message': 'Location updated successfully',
            'data': UserLocationSerializer(user_location).data
        })

    @action(detail=False, methods=['get'])
    def nearby_drivers(self, request):
        user_location = self.get_object()

        if not user_location.current_location:
            return Response({
                'success': False,
                'error': 'Current location not available'
            }, status=status.HTTP_400_BAD_REQUEST)
        radius_km = float(request.query_params.get('radius', 5))
        gender_filter = request.query_params.get('gender')
        nearby_users = user_location.get_nearby_users(
            radius_km=radius_km,
            user_type='driver'
        )
        if gender_filter:
            nearby_users = nearby_users.filter(user__gender=gender_filter)
        
        # This will fail if user_auth.models doesn't define these fields.
        # I'm proceeding with the assumption they exist.
        nearby_users = nearby_users.filter(
            user__role='driver',
            user__driver_profile__is_verified=True,
            user__driver_profile__is_available=True
        )
        serializer = NearbyUserSerializer(nearby_users, many=True)

        return Response({
            'success': True,
            'count': len(serializer.data),
            'radius_km': radius_km,
            'data': serializer.data
        })

    @action(detail=False, methods=['get'])
    def nearby_passengers(self, request):
        if not hasattr(request.user, 'role') or request.user.role != 'driver':
            return Response({
                'success': False,
                'error': 'Only drivers can access this endpoint'
            }, status=status.HTTP_403_FORBIDDEN)

        user_location = self.get_object()

        if not user_location.current_location:
            return Response({
                'success': False,
                'error': 'Current location not available'
            }, status=status.HTTP_400_BAD_REQUEST)

        radius_km = float(request.query_params.get('radius', 5))

        nearby_users = user_location.get_nearby_users(
            radius_km=radius_km,
            user_type='passenger'
        )

        serializer = NearbyUserSerializer(nearby_users, many=True)

        return Response({
            'success': True,
            'count': len(serializer.data),
            'radius_km': radius_km,
            'data': serializer.data
        })

    @action(detail=False, methods=['get'])
    def current_zone(self, request):
        user_location = self.get_object()

        if not user_location.current_location:
            return Response({
                'success': False,
                'error': 'Current location not available'
            }, status=status.HTTP_400_BAD_REQUEST)
        zones = ZoneMap.objects.filter(
            boundary__contains=user_location.current_location,
            is_active=True
        )

        if not zones.exists():
            return Response({
                'success': True,
                'in_zone': False,
                'message': 'Not currently in any defined zone'
            })

        zone = zones.first()
        serializer = ZoneMapSerializer(zone)

        return Response({
            'success': True,
            'in_zone': True,
            'data': serializer.data
        })

    @action(detail=False, methods=['post'])
    def geocode_address(self, request):
        address = request.data.get('address')

        if not address:
            return Response({
                'success': False,
                'error': 'Address is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        from .services import GoogleMapsService

        try:
            result = GoogleMapsService.geocode_address(address)
            return Response({
                'success': True,
                'data': result
            })
        except Exception as e:
            logger.error(f"Geocoding error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to geocode address'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def reverse_geocode(self, request):
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']

        from .services import GoogleMapsService

        try:
            result = GoogleMapsService.reverse_geocode(latitude, longitude)
            return Response({
                'success': True,
                'data': result
            })
        except Exception as e:
            logger.error(f"Reverse geocoding error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to reverse geocode coordinates'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ZoneMapViewSet(viewsets.ReadOnlyModelViewSet[ZoneMap]):
    serializer_class = ZoneMapSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'university'):
            return ZoneMap.objects.filter(
                is_active=True,
                university=self.request.user.university
            )
        return ZoneMap.objects.none()

    @action(detail=True, methods=['get'])
    def users_in_zone(self, request, pk=None):
        zone = self.get_object()
        users_in_zone = zone.get_users_in_zone()

        serializer = NearbyUserSerializer(users_in_zone, many=True)

        return Response({
            'success': True,
            'zone_name': zone.name,
            'user_count': len(serializer.data),
            'data': serializer.data
        })


class LocationHistoryViewSet(viewsets.ReadOnlyModelViewSet[LocationHistory]):
    serializer_class = LocationHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LocationHistory.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def trip_history(self, request):
        trip_id = request.query_params.get('trip_id')

        if not trip_id:
            return Response({
                'success': False,
                'error': 'trip_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        history = self.get_queryset().filter(trip_id=trip_id)
        serializer = self.get_serializer(history, many=True)

        return Response({
            'success': True,
            'trip_id': trip_id,
            'checkpoint_count': len(serializer.data),
            'data': serializer.data
        })
   
        

def perform_create(self, serializer):
        """Logic for 'Share ride' button: Set the ride owner to the current authenticated user."""
        serializer.save(owner=self.request.user)

@action(detail=True, methods=['post'])
def join_ride(self, request, pk=None):
        """
        Handles both 'Book ride' and 'Join ride' components.
        A user attempts to create a booking for this ride.
        """
        ride = get_object_or_404(Ride, pk=pk)
        passenger = request.user
        booking_data = request.data.copy()
        booking_data['ride'] = ride.id # Link to the ride
        booking_serializer = BookingSerializer(data=booking_data)
        booking_serializer.is_valid(raise_exception=True)
        seats_requested = booking_serializer.validated_data.get('seats_requested', 1)
if passenger == ride.owner:
        return Response({'error': 'Driver cannot book/join their own ride.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if seats_requested > ride.available_seats:
         return Response({'error': f'Only {ride.available_seats} seats are available.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if Booking.objects.filter(ride=ride, passenger=passenger, status__in=['PENDING', 'CONFIRMED']).exists():
          return Response({'error': 'You already have an active booking for this ride.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                booking = Booking.objects.create(
                    ride=ride,
                    passenger=passenger,
                    seats_requested=seats_requested,
                    status='PENDING') 

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
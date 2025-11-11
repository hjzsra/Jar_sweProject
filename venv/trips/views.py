from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import response
from rest_framework.permissions import IsAuthenticated 
from django.contrib.gis.geos import Point 
from django.contrib.gis.measure import D 
from django.utils import timezone
from django.db import transaction
from .models import UserLocation, ZoneMap, LocationHistory, Trip
from .serializers import (
    UserLocationSerializer,
    LocationPermissionSerializer,
    NearbyUserSerializer,
    ZoneMapSerializer,
    LocationHistorySerializer,
    LocationUpdateSerializer
)
from .tasks import process_location_update, check_route_deviation
import logging

logger = logging.getLogger(__name__)

class BookRideView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = TripRequestSerializer(data=request.data)
        
        if serializer.is_valid():
           
            trip_request = serializer.save(passenger=request.user)
            
            
            matching_trips = TripService.search_available_trips(
                pickup_lat=trip_request.pickup_latitude,
                pickup_lng=trip_request.pickup_longitude,
                dropoff_lat=trip_request.dropoff_latitude,
                dropoff_lng=trip_request.dropoff_longitude,
                departure_time=trip_request.requested_departure_time,
                max_distance_km=5
            )
            
            return Response({
                'success': True,
                'message': 'Trip request created successfully',
                'trip_request': TripRequestSerializer(trip_request).data,
                'matching_trips': [
                    {
                        'trip_id': trip.trip_id,
                        'driver': {
                            'name': trip.driver.get_full_name(),
                            'rating': str(trip.driver.rating),
                            'profile_picture': trip.driver.profile_picture.url if trip.driver.profile_picture else None
                        },
                        'pickup_location': trip.pickup_location_name,
                        'dropoff_location': trip.dropoff_location_name,
                        'departure_time': trip.scheduled_departure_time,
                        'available_seats': trip.available_seats,
                        'fare_per_passenger': str(trip.fare_per_passenger),
                        'pickup_distance_km': trip.pickup_distance,
                        'dropoff_distance_km': trip.dropoff_distance
                    }
                    for trip in matching_trips
                ]
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JoinRideView(APIView):
   
    permission_classes = [IsAuthenticated]
    
    def post(self, request, trip_id):
       
        try:
            trip = Trip.objects.select_related('driver', 'driver__driver_profile').get(trip_id=trip_id)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
       
        if trip.status != 'scheduled':
            return Response({
                'success': False,
                'message': 'Trip is not available for joining'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        seats_requested = request.data.get('seats_requested', 1)
        
        if trip.available_seats < seats_requested:
            return Response({
                'success': False,
                'message': f'Only {trip.available_seats} seats available'
            }, status=status.HTTP_400_BAD_REQUEST)
        
       
        if TripPassenger.objects.filter(trip=trip, passenger=request.user).exists():
            return Response({
                'success': False,
                'message': 'You have already joined this trip'
            }, status=status.HTTP_400_BAD_REQUEST)
        
       
        trip_passenger = TripPassenger.objects.create(
            trip=trip,
            passenger=request.user,
            seats_requested=seats_requested,
            pickup_location_name=request.data.get('pickup_location_name'),
            pickup_latitude=request.data.get('pickup_latitude'),
            pickup_longitude=request.data.get('pickup_longitude'),
            fare_amount=trip.fare_per_passenger * seats_requested,
            status='pending'
        )
        
      
        try:
            from notifications.services import NotificationService
            NotificationService.send_join_request_notification(
                trip.driver, 
                request.user, 
                trip
            )
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'Join request sent to driver',
            'trip_passenger_id': trip_passenger.id,
            'status': trip_passenger.status,
            'fare_amount': str(trip_passenger.fare_amount)
        }, status=status.HTTP_201_CREATED)


class ShareRideView(APIView):
   
    permission_classes = [IsAuthenticated, IsApprovedDriver]
    
    def post(self, request):
        
        serializer = TripSerializer(data=request.data)
        
        if serializer.is_valid():
            
            distance_km = serializer.validated_data['total_distance_km']
            available_seats = serializer.validated_data['available_seats']
            
            base_fare = 10.00 
            per_km_rate = 2.00  
            total_fare = base_fare + (distance_km * per_km_rate)
            fare_per_passenger = total_fare / available_seats
            
           
            trip = serializer.save(
                driver=request.user,
                total_fare=total_fare,
                fare_per_passenger=fare_per_passenger,
                status='scheduled'
            )
            
            
            try:
                matched_requests = TripService.match_pending_requests(trip)
                
               
                from notifications.services import NotificationService
                for trip_request in matched_requests:
                    try:
                        NotificationService.send_trip_match_notification(
                            trip_request.passenger,
                            trip
                        )
                    except Exception as e:
                        logger.error(f"Failed to send match notification: {str(e)}")
            except Exception as e:
                logger.error(f"Failed to match pending requests: {str(e)}")
                matched_requests = []
            
            return Response({
                'success': True,
                'message': 'Ride shared successfully',
                'trip': {
                    'trip_id': trip.trip_id,
                    'pickup_location': trip.pickup_location_name,
                    'dropoff_location': trip.dropoff_location_name,
                    'departure_time': trip.scheduled_departure_time,
                    'available_seats': trip.available_seats,
                    'fare_per_passenger': str(trip.fare_per_passenger),
                    'status': trip.status
                },
                'matched_requests_count': len(matched_requests)
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        class AvailableRidesMapView(APIView):
   
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
       
        try:
            user_lat = float(request.query_params.get('latitude', 0))
            user_lng = float(request.query_params.get('longitude', 0))
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'Invalid latitude or longitude'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        radius_km = float(request.query_params.get('radius_km', 10))
        departure_time = request.query_params.get('departure_time')
        
        
        trips_query = Trip.objects.filter(
            status='scheduled',
            available_seats__gt=0
        ).select_related(
            'driver',
            'driver__driver_profile'
        ).prefetch_related('trip_passengers')
        
        
        if departure_time:
            from datetime import datetime, timedelta
            try:
                departure_dt = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                time_window_start = departure_dt - timedelta(hours=2)
                time_window_end = departure_dt + timedelta(hours=2)
                trips_query = trips_query.filter(
                    scheduled_departure_time__range=(time_window_start, time_window_end)
                )
            except ValueError:
                pass
        
       
        nearby_trips = []
        
        for trip in trips_query:
            distance = TripService.calculate_distance(
                user_lat, user_lng,
                float(trip.pickup_latitude), float(trip.pickup_longitude)
            )
            
            if distance <= radius_km:
                nearby_trips.append({
                    'trip_id': trip.trip_id,
                    'pickup_location': {
                        'name': trip.pickup_location_name,
                        'latitude': float(trip.pickup_latitude),
                        'longitude': float(trip.pickup_longitude)
                    },
                    'dropoff_location': {
                        'name': trip.dropoff_location_name,
                        'latitude': float(trip.dropoff_latitude),
                        'longitude': float(trip.dropoff_longitude)
                    },
                    'driver': {
                        'name': trip.driver.get_full_name(),
                        'rating': float(trip.driver.rating),
                        'profile_picture': trip.driver.profile_picture.url if trip.driver.profile_picture else None
                    },
                    'vehicle': {
                        'make': trip.driver.driver_profile.vehicle_make,
                        'model': trip.driver.driver_profile.vehicle_model,
                        'color': trip.driver.driver_profile.vehicle_color,
                        'plate_number': trip.driver.driver_profile.vehicle_plate_number
                    } if hasattr(trip.driver, 'driver_profile') else None,
                    'scheduled_departure_time': trip.scheduled_departure_time,
                    'estimated_arrival_time': trip.estimated_arrival_time,
                    'available_seats': trip.available_seats,
                    'fare_per_passenger': float(trip.fare_per_passenger),
                    'distance_from_user_km': round(distance, 2),
                    'allows_luggage': trip.allows_luggage,
                    'allows_pets': trip.allows_pets,
                    'trip_notes': trip.trip_notes
                })
        
        
        nearby_trips.sort(key=lambda x: x['distance_from_user_km'])
        
        return Response({
            'success': True,
            'count': len(nearby_trips),
            'trips': nearby_trips,
            'search_params': {
                'user_location': {
                    'latitude': user_lat,
                    'longitude': user_lng
                },
                'radius_km': radius_km
            }
        })
        class AcceptPassengerView(APIView):
   
    permission_classes = [IsAuthenticated, IsTripDriver]
    
    def post(self, request, trip_id, passenger_id):
        try:
            trip = Trip.objects.get(trip_id=trip_id, driver=request.user)
            trip_passenger = TripPassenger.objects.get(
                trip=trip,
                passenger_id=passenger_id,
                status='pending'
            )
        except (Trip.DoesNotExist, TripPassenger.DoesNotExist):
            return Response({
                'success': False,
                'message': 'Trip or passenger request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
       
        trip_passenger.status = 'accepted'
        trip_passenger.accepted_at = timezone.now()
        trip_passenger.save()
        
       
        trip.available_seats -= trip_passenger.seats_requested
        trip.save()
        
       
        try:
            from notifications.services import NotificationService
            NotificationService.send_acceptance_notification(
                trip_passenger.passenger,
                trip
            )
        except Exception as e:
            logger.error(f"Failed to send acceptance notification: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'Passenger accepted',
            'available_seats': trip.available_seats
        })


class RejectPassengerView(APIView):
   
    permission_classes = [IsAuthenticated, IsTripDriver]
    
    def post(self, request, trip_id, passenger_id):
        try:
            trip = Trip.objects.get(trip_id=trip_id, driver=request.user)
            trip_passenger = TripPassenger.objects.get(
                trip=trip,
                passenger_id=passenger_id,
                status='pending'
            )
        except (Trip.DoesNotExist, TripPassenger.DoesNotExist):
            return Response({
                'success': False,
                'message': 'Trip or passenger request not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
       
        trip_passenger.status = 'rejected'
        trip_passenger.save()
        
       
        try:
            from notifications.services import NotificationService
            NotificationService.send_rejection_notification(
                trip_passenger.passenger,
                trip
            )
        except Exception as e:
            logger.error(f"Failed to send rejection notification: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'Passenger request rejected'
        })


class TripDetailView(APIView):
   
    permission_classes = [IsAuthenticated]
    
    def get(self, request, trip_id):
        try:
            trip = Trip.objects.select_related(
                'driver',
                'driver__driver_profile'
            ).prefetch_related(
                'trip_passengers__passenger'
            ).get(trip_id=trip_id)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        
        is_driver = trip.driver == request.user
        is_passenger = trip.passengers.filter(id=request.user.id).exists()
        
        if not (is_driver or is_passenger):
            
            serializer = TripSerializer(trip)
        else:
           
            serializer = TripDetailSerializer(trip)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'user_role': 'driver' if is_driver else 'passenger' if is_passenger else 'viewer'
        })


class StartTripView(APIView):

    permission_classes = [IsAuthenticated, IsTripDriver]
    
    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(trip_id=trip_id, driver=request.user)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if trip.status != 'scheduled':
            return Response({
                'success': False,
                'message': 'Trip cannot be started'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        
        if not trip.trip_passengers.filter(status='accepted').exists():
            return Response({
                'success': False,
                'message': 'No passengers have been accepted for this trip'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        
        trip.status = 'active'
        trip.actual_departure_time = timezone.now()
        trip.save()
        
       
        try:
            from notifications.services import NotificationService
            NotificationService.send_trip_started_notification(trip)
        except Exception as e:
            logger.error(f"Failed to send trip started notifications: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'Trip started successfully',
            'trip_status': trip.status,
            'departure_time': trip.actual_departure_time
        })


class CompleteTripView(APIView):
   
    permission_classes = [IsAuthenticated, IsTripDriver]
    
    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(trip_id=trip_id, driver=request.user)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if trip.status != 'active':
            return Response({
                'success': False,
                'message': 'Trip is not active'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        
        trip.status = 'completed'
        trip.actual_arrival_time = timezone.now()
        trip.save()
        
        
        request.user.total_trips += 1
        request.user.save()
        
        for trip_passenger in trip.trip_passengers.filter(status='accepted'):
            passenger = trip_passenger.passenger
            passenger.total_trips += 1
            passenger.save()
        
        
        try:
            from payments.services import PaymentService
            PaymentService.process_trip_payments(trip)
        except Exception as e:
            logger.error(f"Failed to process payments: {str(e)}")
        
        
        try:
            from notifications.services import NotificationService
            NotificationService.send_rating_request(trip)
        except Exception as e:
            logger.error(f"Failed to send rating requests: {str(e)}")
        
        return Response({
            'success': True,
            'message': 'Trip completed successfully',
            'trip_status': trip.status,
            'arrival_time': trip.actual_arrival_time
        })


class CancelTripView(APIView):
   
    permission_classes = [IsAuthenticated]
    
    def post(self, request, trip_id):
        try:
            trip = Trip.objects.get(trip_id=trip_id)
        except Trip.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Trip not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        is_driver = trip.driver == request.user
        is_passenger = trip.passengers.filter(id=request.user.id).exists()
        
        if not (is_driver or is_passenger):
            return Response({
                'success': False,
                'message': 'You are not part of this trip'
            }, status=status.HTTP_403_FORBIDDEN)
        
        cancellation_reason = request.data.get('reason', '')
        
        if is_driver:
            
            trip.status = 'cancelled'
            trip.cancelled_at = timezone.now()
            trip.cancellation_reason = cancellation_reason
            trip.save()
            
           
            try:
                from notifications.services import NotificationService
                NotificationService.send_trip_cancelled_notification(trip)
            except Exception as e:
                logger.error(f"Failed to send cancellation notifications: {str(e)}")
            
            message = 'Trip cancelled successfully'
        else:
           
            try:
                trip_passenger = TripPassenger.objects.get(trip=trip, passenger=request.user)
                
                if trip_passenger.status == 'accepted':
                   
                    trip.available_seats += trip_passenger.seats_requested
                    trip.save()
                
                trip_passenger.status = 'cancelled'
                trip_passenger.cancelled_at = timezone.now()
                trip_passenger.cancellation_reason = cancellation_reason
                trip_passenger.save()
                
                
                try:
                    from notifications.services import NotificationService
                    NotificationService.send_passenger_cancelled_notification(trip, request.user)
                except Exception as e:
                    logger.error(f"Failed to send cancellation notification: {str(e)}")
                
                message = 'You have left the trip'
            except TripPassenger.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'You are not part of this trip'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'message': message
        })


class MyTripsView(APIView):
  
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        role = request.query_params.get('role', 'all')  
        trip_status = request.query_params.get('status') 
        trips_as_driver = []
        trips_as_passenger = []
        
        if role in ['driver', 'all']:
            driver_trips = Trip.objects.filter(
                driver=request.user
            ).select_related('driver').prefetch_related('trip_passengers__passenger')
            
            if trip_status:
                driver_trips = driver_trips.filter(status=trip_status)
            
            trips_as_driver = TripSerializer(driver_trips, many=True).data
        
        if role in ['passenger', 'all']:
            passenger_trips = Trip.objects.filter(
                passengers=request.user
            ).select_related('driver').prefetch_related('trip_passengers__passenger')
            
            if trip_status:
                passenger_trips = passenger_trips.filter(status=trip_status)
            
            trips_as_passenger = TripSerializer(passenger_trips, many=True).data
        
        return Response({
            'success': True,
            'trips_as_driver': trips_as_driver,
            'trips_as_passenger': trips_as_passenger,
            'total_count': len(trips_as_driver) + len(trips_as_passenger)
        })

class LocationViewSet(viewsets.ModelViewSet):
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
          from user_auth.models import User
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
       if request.user.role != 'driver':
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


class ZoneMapViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ZoneMapSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ZoneMap.objects.filter(
            is_active=True,
            university=self.request.user.university
        )
    
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


class LocationHistoryViewSet(viewsets.ReadOnlyModelViewSet):
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
      

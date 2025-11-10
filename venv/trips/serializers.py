from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from rest_framework.routers import DefaultRouter
from .views import RideViewSet, BookingRequestViewSet
from .models import UserLocation, ZoneMap, LocationHistory, Trip
from user_auth.models import User
from django.utils import timezone
from .models import * 



class RideSerializer(serializers.ModelSerializer):
    """
    Serializer for the Ride model.
    Used for creating (Share ride) and listing (Click map to view available rides) rides.
    """
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    available_seats = serializers.ReadOnlyField() 
    
class Meta:
        model = Ride
        fields = [
            'id', 
            'owner',
            'owner_username', 
            'start_location', 
            'end_location', 
            'departure_time', 
            'max_passengers', 
            'is_active',
            'available_seats' 
        ]
        read_only_fields = ['owner'] 

def validate_departure_time(self, value):
        """Check that the departure time is not in the past."""
        if value < timezone.now():
            raise serializers.ValidationError("Departure time cannot be in the past.")
        return value

def validate_max_passengers(self, value):
        """Check that max passengers is a positive number."""
        if value <= 0:
            raise serializers.ValidationError("A ride must allow at least one passenger.")
        return value

class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for the Booking model.
    Used when a user submits data via the 'Join ride' action and for driver requests list.
    """
    passenger_username = serializers.CharField(source='passenger.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    ride_start_location = serializers.CharField(source='ride.start_location', read_only=True)
    ride_end_location = serializers.CharField(source='ride.end_location', read_only=True)
    ride_departure_time = serializers.DateTimeField(source='ride.departure_time', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 
            'ride', 
            'passenger', 
            'passenger_username', 
            'seats_requested', 
            'status',
            'status_display',
            'booked_at',
            'ride_start_location', 
            'ride_end_location', 
            'ride_departure_time',
        ]
        read_only_fields = ['passenger', 'ride', 'status'] 
        
    def validate_seats_requested(self, value):
        """Check that the number of seats requested is valid."""
        if value <= 0:
            raise serializers.ValidationError("You must request at least one seat.")
        return value

        

class PointSerializer(serializers.Field):
    def to_representation(self, value):
        if value:
            return {
                'latitude': value.y,
                'longitude': value.x
            }
        return None
    
    def to_internal_value(self, data):
        try:
            latitude = float(data.get('latitude'))
            longitude = float(data.get('longitude'))
            return Point(longitude, latitude)
        except (ValueError, TypeError, AttributeError):
            raise serializers.ValidationError(
                "Invalid location format. Expected {latitude: float, longitude: float}"
            )
class UserLocationSerializer(serializers.ModelSerializer):
     current_location = PointSerializer()
     distance = serializers.FloatField(read_only=True, required=False)
    
     class Meta:
        model = UserLocation
        fields = [
            'id',
            'user',
            'current_location',
            'location_permission_granted',
            'location_permission_type',
            'last_location_update',
            'location_accuracy',
            'share_location_with_drivers',
            'formatted_address',
            'city',
            'zone_name',
            'distance',
        ]
        read_only_fields = ['user', 'last_location_update']
    
     def update(self, instance, validated_data):
       
        location_data = validated_data.pop('current_location', None)
        
        if location_data:
            instance.current_location = location_data
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class LocationPermissionSerializer(serializers.Serializer):
    location_permission_granted = serializers.BooleanField(required=True)
    location_permission_type = serializers.ChoiceField(
        choices=['ALWAYS', 'WHILE_USING', 'DENIED'],
        required=True
    )
    
    def validate(self, data):
        if data['location_permission_granted'] and data['location_permission_type'] == 'DENIED':
            raise serializers.ValidationError(
                "Cannot grant permission with DENIED type"
            )
        return data


class NearbyUserSerializer(serializers.ModelSerializer):
   
    current_location = PointSerializer()
    distance = serializers.FloatField(read_only=True)
    user_info = serializers.SerializerMethodField()
    
    class Meta:
        model = UserLocation
        fields = [
            'id',
            'current_location',
            'distance',
            'user_info',
            'last_location_update'
        ]
    
    def get_user_info(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'name': user.get_full_name(),
            'role': user.role,
            'gender': user.gender,
            'is_verified': user.is_verified,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
        }


class ZoneMapSerializer(GeoFeatureModelSerializer):
    center_point = PointSerializer()
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ZoneMap
        geo_field = 'boundary'
        fields = [
            'id',
            'name',
            'university',
            'boundary',
            'center_point',
            'radius_meters',
            'is_active',
            'max_capacity',
            'zone_type',
            'user_count',
        ]
    
    def get_user_count(self, obj):
        return obj.get_users_in_zone().count()


class LocationHistorySerializer(serializers.ModelSerializer):
     location = PointSerializer()
    
     class Meta:
        model = LocationHistory
        fields = [
            'id',
            'location',
            'trip',
            'recorded_at',
            'accuracy',
            'speed',
            'is_deviation',
            'deviation_distance'
        ]
        read_only_fields = ['recorded_at']


class LocationUpdateSerializer(serializers.Serializer):
    latitude = serializers.FloatField(
        min_value=-90,
        max_value=90,
        required=True
    )
    longitude = serializers.FloatField(
        min_value=-180,
        max_value=180,
        required=True
    )
    accuracy = serializers.FloatField(
        min_value=0,
        required=False,
        allow_null=True
    )
    speed = serializers.FloatField(
        min_value=0,
        required=False,
        allow_null=True
    )
    
    def validate(self, data):
        latitude = data['latitude']
        longitude = data['longitude']
        if not (16 <= latitude <= 32 and 34 <= longitude <= 56):
            raise serializers.ValidationError(
                 )
        
        return data
class RideSerializer(serializers.ModelSerializer):
    """
    Serializer for the Ride model.
    Used for creating (Share ride) and listing (Click map to view available rides) rides.
    """
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    available_seats = serializers.ReadOnlyField() 
    
    class Meta:
        model = Ride
        fields = [
            'id', 
            'owner',
            'owner_username', 
            'start_location', 
            'end_location', 
            'departure_time', 
            'max_passengers', 
            'is_active',
            'available_seats']
        read_only_fields = ['owner'] 

    def validate_departure_time(self, value):
        """Check that the departure time is not in the past."""
        if value < timezone.now():
            raise serializers.ValidationError("Departure time cannot be in the past.")
        return value

    def validate_max_passengers(self, value):
        """Check that max passengers is a positive number."""
        if value <= 0:
            raise serializers.ValidationError("A ride must allow at least one passenger.")
        return value

class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for the Booking model.
    Used when a user submits data via the 'Join ride' action.
    """
    passenger_username = serializers.CharField(source='passenger.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 
            'ride', 
            'passenger', 
            'passenger_username', 
            'seats_requested', 
            'status',
            'status_display',
            'booked_at'
        ]
        read_only_fields = ['passenger', 'ride', 'status'] 
        
    def validate_seats_requested(self, value):
        """Check that the number of seats requested is valid."""
        if value <= 0:
            raise serializers.ValidationError("You must request at least one seat.")
        return value
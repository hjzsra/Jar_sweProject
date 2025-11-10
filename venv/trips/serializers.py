from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import UserLocation, ZoneMap, LocationHistory, Trip
from user_auth.models import User

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

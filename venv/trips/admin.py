from django.contrib import admin
from django.contrib.gis.admin import OSMGeoAdmin
from .models import UserLocation, ZoneMap, LocationHistory, Trip


@admin.register(UserLocation)
class UserLocationAdmin(OSMGeoAdmin):
   list_display = [
        'user',
        'location_permission_granted',
        'location_permission_type',
        'last_location_update',
        'zone_name',
        'city'
    ]
list_filter = [
        'location_permission_granted',
        'location_permission_type',
        'city',
        'zone_name'
    ]
search_fields = ['user__email', 'user__first_name', 'user__last_name']
readonly_fields = ['last_location_update', 'created_at', 'updated_at']

default_lon = 46.6753  
default_lat = 24.7136
default_zoom = 12


@admin.register(ZoneMap)
class ZoneMapAdmin(OSMGeoAdmin): 
    list_display = [
        'name',
        'university',
        'zone_type',
        'is_active',
        'max_capacity',
        'radius_meters'
    ]
list_filter = ['university', 'zone_type', 'is_active']
search_fields = ['name']
    
default_lon = 46.6753
default_lat = 24.7136
default_zoom = 12


@admin.register(LocationHistory)
class LocationHistoryAdmin(OSMGeoAdmin):
    list_display = [
        'user',
        'trip',
        'recorded_at',
        'is_deviation',
        'deviation_distance',
        'speed'
    ]
    list_filter = ['is_deviation', 'recorded_at']
    search_fields = ['user__email', 'trip__id']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'recorded_at'
    
    default_lon = 46.6753
    default_lat = 24.7136
    default_zoom = 12     
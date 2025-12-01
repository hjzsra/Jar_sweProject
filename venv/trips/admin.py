from django.contrib.gis.admin import GISModelAdmin
from django.contrib import admin
from .models import (
    UserLocation, ZoneMap, LocationHistory, Trip
)

@admin.register(UserLocation)
class UserLocationAdmin(GISModelAdmin):
    list_display = [
        'user',
        'location_permission_granted',
        'location_permission_type',
        'last_location_update',
        'city',
        'zone_name'
    ]
    list_filter = [
        'location_permission_granted',
        'location_permission_type',
        'city',
        'zone_name'
    ]
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'city', 'zone_name']
    readonly_fields = ['last_location_update', 'created_at', 'updated_at']
    
    default_lon = 46.6753
    default_lat = 24.7136
    default_zoom = 12


@admin.register(ZoneMap)
class ZoneMapAdmin(GISModelAdmin):
    list_display = ('name', 'university')
    list_filter = ('university',)
    search_fields = ['name', 'university__username']
    
    default_lon = 46.6753
    default_lat = 24.7136
    default_zoom = 12


@admin.register(LocationHistory)
class LocationHistoryAdmin(GISModelAdmin):
    list_display = ('get_user', 'trip', 'recorded_at', 'is_deviation')
    search_fields = ('user__username', 'trip__id')
    list_filter = ('is_deviation', 'recorded_at')
    readonly_fields = ('recorded_at',)
    date_hierarchy = 'recorded_at'

    @admin.display(description='User')
    def get_user(self, obj: LocationHistory) -> str:
        return obj.user.username  # type: ignore
    
    default_lon = 46.6753
    default_lat = 24.7136
    default_zoom = 12


@admin.register(Trip)
class TripAdmin(GISModelAdmin):
    list_display = ('id', 'passenger', 'driver', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('passenger__username', 'driver__username', 'id')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'

    default_lon = 46.6753
    default_lat = 24.7136
    default_zoom = 12
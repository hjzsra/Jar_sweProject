from django.contrib import admin
# NOTE: Removed dependency on django.contrib.gis.admin.OSMGeoAdmin
# We are using admin.ModelAdmin instead since GIS was disabled in models.py
from django.utils.html import format_html
from django.urls import reverse
from .models import Trip, TripPassenger, TripRequest, TripRating, SafetyReport, UserLocation, ZoneMap, LocationHistory


@admin.register(UserLocation)
class UserLocationAdmin(admin.ModelAdmin): # Changed from OSMGeoAdmin
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
    search_fields = ['user_email', 'userfirst_name', 'user_last_name']
    readonly_fields = ['last_location_update', 'created_at', 'updated_at']

    # NOTE: GIS defaults removed since we are using regular Admin
    # default_lon = 46.6753
    # default_lat = 24.7136
    # default_zoom = 12


@admin.register(ZoneMap)
class ZoneMapAdmin(admin.ModelAdmin): # Changed from OSMGeoAdmin
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

    # NOTE: GIS defaults removed
    # default_lon = 46.6753
    # default_lat = 24.7136
    # default_zoom = 12


@admin.register(LocationHistory)
class LocationHistoryAdmin(admin.ModelAdmin): # Changed from OSMGeoAdmin
    list_display = [
        'user',
        'trip',
        'recorded_at',
        'is_deviation',
        'deviation_distance',
        'speed'
    ]
    list_filter = ['is_deviation', 'recorded_at']
    search_fields = ['user_email', 'trip_id']
    readonly_fields = ['recorded_at']
    date_hierarchy = 'recorded_at'

    # NOTE: GIS defaults removed
    # default_lon = 46.6753
    # default_lat = 24.7136
    # default_zoom = 12


@admin.register(Trip) # Changed to register(Trip) for clarity
class TripAdmin(admin.ModelAdmin): # Changed from OSMGeoAdmin
    list_display = [
        'trip_id',
        'driver_link',
        'pickup_location_name',
        'dropoff_location_name',
        'scheduled_departure_time',
        'available_seats',
        'passenger_count',
        'status_badge',
        'fare_per_passenger',
        'created_at'
    ]

    list_filter = [
        'status',
        'scheduled_departure_time',
        'allows_luggage',
        'allows_pets',
        'created_at'
    ]

    search_fields = [
        'trip_id',
        'driver__email',
        'driver__first_name',
        'driver__last_name',
        'pickup_location_name',
        'dropoff_location_name'
    ]

    readonly_fields = [
        'trip_id',
        'created_at',
        'updated_at',
        'passenger_count',
        'duration_display'
    ]

    # NOTE: Removed GIS fields from fieldsets since they were removed from models.py
    fieldsets = (
        ('Trip Information', {
            'fields': ('trip_id', 'driver', 'status', 'created_at', 'updated_at')
        }),
        ('Pickup Location', {
            'fields': ('pickup_location_name', ) # Removed pickup_location, pickup_address
        }),
        ('Dropoff Location', {
            'fields': ('dropoff_location_name', ) # Removed dropoff_location, dropoff_address
        }),
        ('Schedule', {
            'fields': (
                'scheduled_departure_time',
                'actual_departure_time',
                'estimated_arrival_time',
                'actual_arrival_time',
                'duration_display'
            )
        }),
        ('Trip Details', {
            'fields': (
                'available_seats',
                'passenger_count',
                'total_distance_km',
                'estimated_duration_minutes'
            )
        }),
        ('Pricing', {
            'fields': ('total_fare', 'fare_per_passenger')
        }),
        ('Additional Info', {
            'fields': ('trip_notes', 'allows_luggage', 'allows_pets')
        }),
        ('Tracking', {
            'fields': ('current_latitude', 'current_longitude', 'last_location_update') # Updated to use lat/long fields
        }),
        ('Cancellation', {
            'fields': ('cancelled_at', 'cancellation_reason'),
            'classes': ('collapse',)
        })
    )

    def driver_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.driver.id])
        return format_html('<a href="{}">{}</a>', url, obj.driver.get_full_name())
    driver_link.short_description = 'Driver'

    def status_badge(self, obj):
        colors = {
            'pending': 'gray',
            'scheduled': 'blue',
            'active': 'green',
            'completed': 'darkgreen',
            'cancelled': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def passenger_count(self, obj):
        return obj.trip_passengers.filter(status='accepted').count()
    passenger_count.short_description = 'Passengers'

    def duration_display(self, obj):
        # NOTE: Assumed 'duration_minutes' is a method or property not shown, replaced with simpler check
        if obj.actual_arrival_time and obj.actual_departure_time:
            duration = obj.actual_arrival_time - obj.actual_departure_time
            return f"{int(duration.total_seconds() / 60)} minutes"
        return "N/A"
    duration_display.short_description = 'Actual Duration'


@admin.register(TripPassenger)
class TripPassengerAdmin(admin.ModelAdmin):
    list_display = [
        'trip_link',
        'passenger_link',
        'seats_requested',
        'fare_amount',
        'status_badge',
        'payment_status_badge',
        'requested_at'
    ]

    list_filter = [
        'status',
        'payment_status',
        'requested_at'
    ]

    search_fields = [
        'trip__trip_id',
        'passenger__email',
        'passenger__first_name',
        'passenger__last_name'
    ]

    readonly_fields = ['requested_at', 'accepted_at', 'cancelled_at']

    def trip_link(self, obj):
        url = reverse('admin:trips_trip_change', args=[obj.trip.id])
        return format_html('<a href="{}">{}</a>', url, obj.trip.trip_id)
    trip_link.short_description = 'Trip'

    def passenger_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.passenger.id])
        return format_html('<a href="{}">{}</a>', url, obj.passenger.get_full_name())
    passenger_link.short_description = 'Passenger'

    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'accepted': 'green',
            'rejected': 'red',
            'cancelled': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def payment_status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'paid': 'green',
            'refunded': 'blue'
        }
        color = colors.get(obj.payment_status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_payment_status_display()
        )
    payment_status_badge.short_description = 'Payment'


@admin.register(TripRequest)
class TripRequestAdmin(admin.ModelAdmin): # Changed from OSMGeoAdmin
    list_display = [
        'request_id',
        'passenger_link',
        'pickup_location_name',
        'dropoff_location_name',
        'requested_departure_time',
        'passengers_count',
        'status_badge',
        'matched_trip_link',
        'created_at'
    ]

    list_filter = [
        'status',
        'requested_departure_time',
        'created_at'
    ]

    search_fields = [
        'request_id',
        'passenger__email',
        'passenger__first_name',
        'passenger__last_name'
    ]

    readonly_fields = ['request_id', 'created_at']

    def passenger_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.passenger.id])
        return format_html('<a href="{}">{}</a>', url, obj.passenger.get_full_name())
    passenger_link.short_description = 'Passenger'

    def matched_trip_link(self, obj):
        if obj.matched_trip:
            url = reverse('admin:trips_trip_change', args=[obj.matched_trip.id])
            return format_html('<a href="{}">{}</a>', url, obj.matched_trip.trip_id)
        return "Not matched"
    matched_trip_link.short_description = 'Matched Trip'

    def status_badge(self, obj):
        colors = {
            'searching': 'blue',
            'matched': 'green',
            'accepted': 'darkgreen',
            'expired': 'gray',
            'cancelled': 'red'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(TripRating)
class TripRatingAdmin(admin.ModelAdmin):
    list_display = [
        'trip_link',
        'rater_link',
        'rated_user_link',
        'rating_stars',
        'is_visible',
        'is_reported',
        'created_at'
    ]

    list_filter = [
        'rating',
        'is_visible',
        'is_reported',
        'created_at'
    ]

    search_fields = [
        'trip__trip_id',
        'rater__email',
        'rated_user__email',
        'comment'
    ]

    readonly_fields = ['created_at']

    def trip_link(self, obj):
        url = reverse('admin:trips_trip_change', args=[obj.trip.id])
        return format_html('<a href="{}">{}</a>', url, obj.trip.trip_id)
    trip_link.short_description = 'Trip'

    def rater_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.rater.id])
        return format_html('<a href="{}">{}</a>', url, obj.rater.get_full_name())
    rater_link.short_description = 'Rater'

    def rated_user_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.rated_user.id])
        return format_html('<a href="{}">{}</a>', url, obj.rated_user.get_full_name())
    rated_user_link.short_description = 'Rated User'

    def rating_stars(self, obj):
        stars = '⭐' * obj.rating
        return format_html('<span style="font-size: 16px;">{}</span>', stars)
    rating_stars.short_description = 'Rating'


@admin.register(SafetyReport)
class SafetyReportAdmin(admin.ModelAdmin):
    list_display = [
        'report_id',
        'reporter_link',
        'reported_user_link',
        'trip_link',
        'report_type',
        'status_badge',
        'created_at'
    ]

    list_filter = [
        'report_type',
        'status',
        'created_at'
    ]

    search_fields = [
        'report_id',
        'reporter__email',
        'reported_user__email',
        'description'
    ]

    readonly_fields = ['report_id', 'created_at', 'resolved_at']

    fieldsets = (
        ('Report Information', {
            'fields': ('report_id', 'reporter', 'reported_user', 'trip', 'report_type')
        }),
        ('Details', {
            'fields': ('description', 'evidence_files')
        }),
        ('Status', {
            'fields': ('status', 'created_at', 'resolved_at')
        }),
        ('Admin Actions', {
            'fields': ('admin_notes', 'resolution')
        })
    )

    def reporter_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.reporter.id])
        return format_html('<a href="{}">{}</a>', url, obj.reporter.get_full_name())
    reporter_link.short_description = 'Reporter'

    def reported_user_link(self, obj):
        url = reverse('admin:user_auth_user_change', args=[obj.reported_user.id])
        return format_html('<a href="{}">{}</a>', url, obj.reported_user.get_full_name())
    reported_user_link.short_description = 'Reported User'

    def trip_link(self, obj):
        if obj.trip:
            url = reverse('admin:trips_trip_change', args=[obj.trip.id])
            return format_html('<a href="{}">{}</a>', url, obj.trip.trip_id)
        return "N/A"
    trip_link.short_description = 'Trip'

    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'under_investigation': 'blue',
            'resolved': 'green',
            'dismissed': 'gray'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
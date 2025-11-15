from django.db import models
from django.contrib.gis.db import models as gis_models
from django.conf import settings
from django.core.validators import MinValueValidator , MaxValueValidator

class UserLocation(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location'
    )
    current_location = gis_models.PointField(
        geography=True,
        null=True,
        blank=True,
        help_text="Current GPS coordinates (longitude, latitude)"
    )
    location_permission_granted = models.BooleanField(
        default=False,
        help_text="Has user granted location access"
    )
     location_permission_type = models.CharField(
        max_length=20,
        choices=[
            ('ALWAYS', 'Always Allow'),
            ('WHILE_USING', 'While Using App'),
            ('DENIED', 'Denied'),
        ],
        default='DENIED'
    )
     last_location_update = models.DateTimeField(auto_now=True)
    location_accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text="Location accuracy in meters"
    )
    share_location_with_drivers = models.BooleanField(default=True)
    share_location_in_zone_chat = models.BooleanField(default=False)
    formatted_address = models.CharField(max_length=500, blank=True)
    city = models.CharField(max_length=100, blank=True)
    zone_name = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

     class Meta:
        db_table = 'user_locations'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['last_location_update']),
        ]
        def __str__(self):
        return f"{self.user.email} - {self.current_location}"
    
    def update_location(self, latitude, longitude, accuracy=None):
       
        from django.contrib.gis.geos import Point
        
        self.current_location = Point(longitude, latitude)
        if accuracy:
            self.location_accuracy = accuracy
        self.save()
    
    def get_nearby_users(self, radius_km=5, user_type=None):
        from django.contrib.gis.measure import D
        from django.contrib.gis.db.models.functions import Distance
        
        queryset = UserLocation.objects.filter(
            location_permission_granted=True,
            current_location__isnull=False
        ).exclude(user=self.user)
        
        if user_type:
            queryset = queryset.filter(user__role=user_type)
        
        return queryset.filter(
            current_location__distance_lte=(self.current_location, D(km=radius_km))
        ).annotate(
            distance=Distance('current_location', self.current_location)
        ).order_by('distance')

class ZoneMap(models.Model):
    name = models.CharField(max_length=200)
    university = models.ForeignKey(
        'user_auth.University',
        on_delete=models.CASCADE,
        related_name='zones'
    )
     boundary = gis_models.PolygonField(
        geography=True,
        help_text="Zone geographic boundary"
    )
    center_point = gis_models.PointField(
        geography=True,
        help_text="Center point of the zone"
    )
    radius_meters = models.IntegerField(
        default=1000,
        validators=[MinValueValidator(100), MaxValueValidator(10000)]
    )
    is_active = models.BooleanField(default=True)
    max_capacity = models.IntegerField(
        default=50,
        help_text="Maximum simultaneous users in zone"
    )
    zone_type = models.CharField(
        max_length=20,
        choices=[
            ('CAMPUS', 'Campus Zone'),
            ('RESIDENTIAL', 'Residential Area'),
            ('COMMERCIAL', 'Commercial Area'),
            ('TRANSIT', 'Transit Hub'),
        ],
        default='CAMPUS'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'zone_maps'
        unique_together = ['name', 'university']
    
    def __str__(self):
        return f"{self.name} - {self.university.name}"
    
    def is_point_in_zone(self, point):
        return self.boundary.contains(point)
    
    def get_users_in_zone(self):
         return UserLocation.objects.filter(
            location_permission_granted=True,
            current_location__within=self.boundary
        )


class LocationHistory(models.Model):
     user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location_history'
    )
    
    location = gis_models.PointField(geography=True)
    trip = models.ForeignKey(
        'Trip',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='location_checkpoints'
    )
    
    recorded_at = models.DateTimeField(auto_now_add=True)
    accuracy = models.FloatField(null=True, blank=True)
    speed = models.FloatField(
        null=True,
        blank=True,
        help_text="Speed in km/h"
    )
     is_deviation = models.BooleanField(default=False)
    deviation_distance = models.FloatField(
        null=True,
        blank=True,
        help_text="Distance from expected route in meters"
    )
    
    class Meta:
        db_table = 'location_history'
        indexes = [
            models.Index(fields=['user', 'recorded_at']),
            models.Index(fields=['trip', 'recorded_at']),
        ]
        ordering = ['-recorded_at']
    
    def __str__(self):
        return f"{self.user.email} at {self.recorded_at}"


class Trip(models.Model):
   
    trip_id = models.CharField(max_length=20, unique=True, editable=False)
     
  
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trips_as_driver',
        limit_choices_to={'user_type': 'driver'}
    )
    passengers = models.ManyToManyField(
        User,
        through='TripPassenger',
        related_name='trips_as_passenger'
    )
    
   
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('scheduled', 'Scheduled'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
   
    pickup_location_name = models.CharField(max_length=255)
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
    
    dropoff_location_name = models.CharField(max_length=255)
    dropoff_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
   
    scheduled_departure_time = models.DateTimeField()
    actual_departure_time = models.DateTimeField(null=True, blank=True)
    estimated_arrival_time = models.DateTimeField()
    actual_arrival_time = models.DateTimeField(null=True, blank=True)
    
    
    available_seats = models.IntegerField()
    total_distance_km = models.DecimalField(max_digits=6, decimal_places=2)
    estimated_duration_minutes = models.IntegerField()
    
    
    total_fare = models.DecimalField(max_digits=8, decimal_places=2)
    fare_per_passenger = models.DecimalField(max_digits=8, decimal_places=2)
    
    
    trip_notes = models.TextField(null=True, blank=True)
    allows_luggage = models.BooleanField(default=True)
    allows_pets = models.BooleanField(default=False)
    
    
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    
   
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'trips'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['driver', 'status']),
            models.Index(fields=['scheduled_departure_time']),
            models.Index(fields=['status', 'available_seats']),
        ]
    
    def __str__(self):
        return f"{self.trip_id} - {self.pickup_location_name} to {self.dropoff_location_name}"
    
    def save(self, *args, **kwargs):
        if not self.trip_id:
            from django.utils.crypto import get_random_string
            self.trip_id = f"TR{get_random_string(8).upper()}"
        super().save(*args, **kwargs)


class TripRequest(models.Model):
   
    request_id = models.CharField(max_length=20, unique=True, editable=False)
    passenger = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trip_requests')
    
   
    pickup_location_name = models.CharField(max_length=255)
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_location_name = models.CharField(max_length=255)
    dropoff_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    requested_departure_time = models.DateTimeField()
    passengers_count = models.IntegerField(default=1)
    
   
    matched_trip = models.ForeignKey(
        Trip,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_requests'
    )
    
    
    STATUS_CHOICES = [
        ('searching', 'Searching'),
        ('matched', 'Matched'),
        ('accepted', 'Accepted'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='searching')
    
    
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    
    class Meta:
        db_table = 'trip_requests'
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.request_id:
            from django.utils.crypto import get_random_string
            self.request_id = f"RQ{get_random_string(8).upper()}"
        super().save(*args, **kwargs)


class TripPassenger(models.Model):
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='trip_passengers')
    passenger = models.ForeignKey(User, on_delete=models.CASCADE, related_name='passenger_trips')
    
    
    seats_requested = models.IntegerField(default=1)
    pickup_location_name = models.CharField(max_length=255, null=True, blank=True)
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
   
    REQUEST_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=REQUEST_STATUS_CHOICES, default='pending')
    
    
    fare_amount = models.DecimalField(max_digits=8, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('paid', 'Paid'),
            ('refunded', 'Refunded'),
        ],
        default='pending'
    )
    
    
    requested_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'trip_passengers'
        unique_together = ['trip', 'passenger']
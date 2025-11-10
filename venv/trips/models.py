from django.db import models
from django.contrib.gis.db import models as gis_models
from django.conf import settings
from django.core.validators import MinValueValidator , MaxValueValidator
from django.conf import settings 
from django.utils import timezone 


User = settings.AUTH_USER_MODEL
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
           """Update user's current location"""
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
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='passenger_trips'
    )
    
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='driver_trips'
    )
    pickup_location = gis_models.PointField(geography=True)
    dropoff_location = gis_models.PointField(geography=True)
    
    pickup_address = models.CharField(max_length=500)
    dropoff_address = models.CharField(max_length=500)
    current_location = gis_models.PointField(
        geography=True,
        null=True,
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('REQUESTED', 'Requested'),
            ('ACCEPTED', 'Accepted'),
            ('PICKUP', 'En Route to Pickup'),
            ('STARTED', 'Trip Started'),
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled'),
        ],
        default='REQUESTED'
    )
    route_deviation_count = models.IntegerField(default=0)
    last_location_update = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trips'
    
    def __str__(self):
        return f"Trip #{self.id} - {self.passenger.email}"

class Ride(models.Model):
 owner = models.ForeignKey(User, related_name='offered_rides', on_delete=models.CASCADE)
 start_location = models.CharField(max_length=255, help_text="Starting point of the ride.")
 end_location = models.CharField(max_length=255, help_text="Destination of the ride.")
 departure_time = models.DateTimeField(help_text="Scheduled departure date and time.")
 max_passengers = models.IntegerField(default=1, help_text="Maximum number of passengers allowed.")
 is_active = models.BooleanField(default=True, help_text="Is the ride currently available for booking/joining?")
created_at = models.DateTimeField(auto_now_add=True)

def __str__(self):
        return f"Ride from {self.start_location} to {self.end_location} on {self.departure_time.strftime('%Y-%m-%d %H:%M')}"

@property
def available_seats(self):
     """Calculates the number of seats remaining."""
booked_count = self.bookings.filter(status__in=['CONFIRMED', 'PENDING']).count()
return self.max_passengers - booked_count 


class Booking(models.Model):"""
    Represents a passenger's request to join a specific ride.
    Corresponds to the "Book ride" and "Join ride" components.
    """
STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('CONFIRMED', 'Confirmed'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]
ride = models.ForeignKey(Ride, related_name='bookings', on_delete=models.CASCADE)
passenger = models.ForeignKey(User, related_name='my_bookings', on_delete=models.CASCADE)
status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
seats_requested = models.IntegerField(default=1)
booked_at = models.DateTimeField(auto_now_add=True)
class Meta:
    unique_together = ('ride', 'passenger')
def __str__(self):
        return f"Booking by {self.passenger.username} for {self.ride}"
 
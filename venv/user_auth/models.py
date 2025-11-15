from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = (
        ('superadmin', 'Super Admin'),('customUser','Custom'),)
    first_name = models.CharField(max_length=50) 
    middle_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True),
    national_id = models.CharField(max_length=20, unique=True)
    phone_number = models.CharField(max_length=15, unique=True, help_text="Supports Saudi numbers (+966)")
    university = models.CharField(max_length=100) 
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')])
    role = models.CharField(max_length=10, choices=[('DRIVER', 'Driver'), ('PASSENGER', 'Passenger')], default='Passenger')
    USERNAME_FIELD = 'email'  
    REQUIRED_FIELDS = ['username'] 
    
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
    location_permission_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When location permission was first requested"
    )
    location_permission_granted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When location permission was granted"
    )
    is_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
    
    def get_full_name(self):
        """Return full name including middle name"""
        parts = [self.first_name, self.middle_name, self.last_name]
        return ' '.join(filter(None, parts))
    
    def is_driver(self):
        """Check if user is a driver"""
        return self.role == 'DRIVER'
    
    def is_passenger(self):
        """Check if user is a passenger"""
        return self.role == 'PASSENGER'
    
    def has_location_permission(self):
        """Check if user has granted location permission"""
        return self.location_permission_granted and self.location_permission_type != 'DENIED'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.username})"
    

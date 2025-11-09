from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    first_name = models.CharField(max_length=50) 
    middle_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50)

    national_id = models.CharField(max_length=20, unique=True)
    phone_number = models.CharField(max_length=15, unique=True, help_text="Supports Saudi numbers (+966)")
    university = models.CharField(max_length=100) 
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')])
    role = models.CharField(max_length=10, choices=[('DRIVER', 'Driver'), ('PASSENGER', 'Passenger')], default='DRIVER')

    
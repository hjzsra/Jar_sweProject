from django.db import models
from django.conf import settings
from trips.models import Trip

class PaymentMethod(models.TextChoices):
    PAYPAL = 'paypal', 'PayPal'
    CARD = 'card', 'Card'
    APPLE_PAY = 'apple_pay', 'Apple Pay'
    CASH = 'cash', 'Cash'
    

class PaymentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    PAID = 'paid', 'Paid'
    FAILED = 'failed', 'Failed'


class Payment(models.Model):
    trip = models.OneToOneField(Trip, on_delete=models.CASCADE, related_name='payment')
    total_amount = models.DecimalField(max_digits=8, decimal_places=2)
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.PAYPAL)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    is_symbolic_fare = models.BooleanField(default=False)
    currency = models.CharField(max_length=3, default='SAR')
    driver_currency = models.CharField(max_length=3, default='SAR')
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    driver_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment #{self.id} for Trip {self.trip_id}"


class CostShare(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='shares')
    passenger = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.passenger} - {self.amount}"
    

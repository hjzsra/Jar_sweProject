
# payments/admin.py
from django.contrib import admin
from .models import Payment, PaymentMethod

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('paymentID', 'trip', 'totalAmount', 'driverEarning', 'paymentStatus', 'methodID')
    list_filter = ('paymentStatus', 'methodID')
    search_fields = ('paymentID', 'trip__tripID')

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('userID', 'methodName')

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


from django.contrib import admin
from .models import Order

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'amount', 'selected_payment_method', 'status', 'created_at']
    list_filter = ['status', 'selected_payment_method', 'created_at']
    search_fields = ['user__username', 'transaction_id']
    readonly_fields = ['created_at']
    fieldsets = (
        (None, {
            'fields': ('user', 'amount', 'status', 'selected_payment_method')
        }),
        ('Timestamp', {
            'fields': ('created_at',),
        }),
    )
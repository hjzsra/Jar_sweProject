from django.urls import path
from .views import TripPaymentInitView, PaymentPayView

app_name = 'payments'

urlpatterns = [
    path('trips/<int:trip_id>/init/', TripPaymentInitView.as_view(), name='payment_init'),
    path('<int:payment_id>/pay/', PaymentPayView.as_view(), name='payment_pay'),
]
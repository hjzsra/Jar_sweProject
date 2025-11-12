
# payments/serializers.py
from rest_framework import serializers
from .models import Payment, PaymentMethod

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ('methodName', 'externalToken')
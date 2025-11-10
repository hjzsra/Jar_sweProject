from django.urls import path
from .views import RegistrationAPIView, OTPVerificationAPIView


urlpatterns = [path('register/', RegistrationAPIView.as_view(), name='register'),path('verify-otp/', OTPVerificationAPIView.as_view(), name='verify-otp'), 
]

#login
from django.urls import path
from .views import RegistrationAPIView, OTPVerificationAPIView, LoginView

urlpatterns = [
    path('register/', RegistrationAPIView.as_view(), name='register'),
    path('verify-otp/', OTPVerificationAPIView.as_view(), name='verify-otp'),
    path('login/', LoginView.as_view(), name='login'),   # <— هذا الجديد
]
import requests
from django.utils import timezone
from datetime import timedelta
from .models import User, VerificationToken

def call_ilm_verification(user_instance):
    print(f"ILM Api call :attempting to verify usestudentr {user_instance.national_id}...")
    ILM_API_ENDPOINT="https://api.ilm-platform.sa/verify-student"

    payload={
        "national_id":user_instance.national_id,
        "university_id":user_instance.university_id,
        "email":user_instance.email,
    }

    headers={
        "Authorization":"Bearer YOUR_SECURE_ILM_API_KEY",
        "contrent-Type":"application/json",
    }


    try:
        response=requests.post(ILM_API_ENDPOINT,json=payload,headers=headers)
        response.raise_for_status()

        data=response.json()

        if data.get('VerificationStatus')=="SUCCESS":
            return True
        else:
            return False
    except requests.exceptions.RequestException as e:
        print(f"ILM API call failed: {e}")
        return False

def send_email_otp(user, token):
    print(f"DEBUG: Mock sending email OTP {token} to {user.email}")
    return True

def send_sms_otp(user, token):
    print(f"DEBUG: Mock sending SMS OTP {token} to {user.phone_number}")
    return True
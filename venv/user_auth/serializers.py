from rest_framework import serializers
from .models import User, VerificationToken
from .services import send_email_otp, send_sms_otp

class UserRegistrationSerializer(serializers.ModelSerializer):
 
    password = serializers.CharField(write_only=True, required=True)
    email=serializers.EmailField(required=True,)

    class Meta:
        model = User
        fields = (
            'username', 'email', 'password', 'role'
        )
        extra_kwargs = {'role': {'read_only': True}}
        
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        validated_data['role'] = 'PASSENGER'
        username = validated_data.get('username') or validated_data['first_name']
        university_name="Imam Mohammad bin Saud Islamic university"
        user = User.objects.create_user(
            username=validate_data.get('username') or validated_data['first_name'],
            email=validated_data['email'],
            password=validated_data['password'],
            
            first_name=validated_data['first_name'],
            middle_name=validated_data.get('middle_name', ''), # Middle name is optional
            last_name=validated_data['last_name'],
            national_id=validated_data['national_id'],
            
            phone_number=validated_data['phone_number'],
            gender=validated_data['gender'],
            role=validated_data['role'],
            university=university_name # Drivers don't require University, but the field exists
        )

        token = VerificationToken.objects.create(user=user)
        token.generate_email_otp()
        token.generate_phone_otp()
        send_email_otp(user, token.email_otp)
        send_sms_otp(user, token.phone_otp)
        
        return user
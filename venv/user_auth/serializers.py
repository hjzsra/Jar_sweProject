from rest_framework import serializers
from .models import User, VerificationToken
from .services import send_email_otp, send_sms_otp
class UserRegistrationSerializer(serializers.ModelSerializer):
    # Confirm password is used for front-end validation, not needed in serializer model
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = (
            'username', 'email', 'password',
            'first_name', 'middle_name', 'last_name', 'national_id',
            'phone_number', 'gender', 'role'
        )
        extra_kwargs = {'role': {'read_only': True}}
        
    def create(self, validated_data):
        # 1. Set the role explicitly to DRIVER
        validated_data['role'] = 'DRIVER' 
        
        # 2. **CRITICAL ADJUSTMENT:** Since the Driver form is missing the 'university' field, 
        #    we inject a sensible default or null value here, or ideally, raise an error 
        #    and ask the front-end developer to ADD the field.
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
            university='N/A' # Drivers don't require University, but the field exists
        )
        
    
        token = VerificationToken.objects.create(user=user)
        token.generate_email_otp()
        token.generate_phone_otp()
        send_email_otp(user, token.email_otp)
        send_sms_otp(user, token.phone_otp)
        
        return user
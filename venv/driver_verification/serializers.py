
from rest_framework import serializers
from .models import DriverDocument

class DriverDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverDocument
        
        fields = ['driver_id', 'document_file', 'verification_status', 'upload_date']
        
        read_only_fields = ['verification_status', 'upload_date']
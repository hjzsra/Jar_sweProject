
from rest_framework import serializers
from .models import DriverDocument

class DriverDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverDocument
        
        fields = ['driver', 'document_file', 'verification_status', 'upload_date']
        
        read_only_fields = ['driver','verification_status', 'upload_date']
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import DriverDocument
from .serializers import DriverDocumentSerializer
from django.conf import settings
from PIL import Image
import pytesseract
import os
from django.core.files.storage import default_storage


def call_naql_verification(license_number):
    """Placeholder for the real Naql API call."""
    print(f"--- Simulating Naql Verification for License: {license_number} ---")
    
    if license_number=="OCR_FAILED_TO_FIND_LICENSE":
        return False,"OCR failed to read license number clearly."
    return True,""



class DriverDocumentViewSet(viewsets.ModelViewSet):
    queryset = DriverDocument.objects.all()
    serializer_class = DriverDocumentSerializer

    def get_queryset(self):
        return self.queryset.filter(driver=self.request.user)
    

    def perform_create(self, serializer):
        document_instance = serializer.save(
            driver=self.request.user,
            verification_status='OCR_PROCESSING'
            )
        file_path = os.path.join(settings.MEDIA_ROOT, document_instance.document_file.name)
        extracted_text = ""


        try:
            extracted_text = pytesseract.image_to_string(Image.open(file_path))
            
            import re
            license_pattern=r'[A-Z]{2}\d{7,10}'
            match=re.search(license_pattern,extracted_text)
            if match:
                license_number=match.group(0).strip()
            
            elif "License No:" in extracted_text:
                license_number = extracted_text.split("License No:")[1].split('\n')[0].strip()
            else:
                license_number = "UNKNOWN_LICENSE"

            document_instance.extracted_license_number = license_number
            document_instance.verification_status = 'OCR_SUCCESS'
            verification_success, rejection_reason = call_naql_verification(license_number)
            if verification_success:
                document_instance.verification_status = 'NAQL_VERIFIED'
            else:
                document_instance.verification_status = 'REJECTED'
                document_instance.naql_rejection_reason = rejection_reason
            
            document_instance.save()


        
        except Exception as e:
            print(f"OCR or Naql error: {document_instance.document_file.name}:{e}")
            document_instance.verification_status = 'REJECTED'
            document_instance.save()
        
        finally:
            
            pass
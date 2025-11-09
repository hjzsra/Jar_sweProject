from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import DriverDocument
from .serializers import DriverDocumentSerializer
from django.conf import settings
from PIL import Image
import pytesseract
import os

def call_naql_verification(license_number):
    """Placeholder for the real Naql API call."""
    print(f"--- Simulating Naql Verification for License: {license_number} ---")
    return True

class DriverDocumentViewSet(viewsets.ModelViewSet):
    queryset = DriverDocument.objects.all()
    serializer_class = DriverDocumentSerializer


    def perform_create(self, serializer):
        document_instance = serializer.save(verification_status='OCR_PROCESSING')
        file_path = os.path.join(settings.MEDIA_ROOT, document_instance.document_file.name)
        extracted_text = ""


        try:
            extracted_text = pytesseract.image_to_string(Image.open(file_path))
            # --- CUSTOM EXTRACTION LOGIC ---
            # This is where you write code to find the license number in the text.
            # Example (highly simplified):
            if "License No:" in extracted_text:
                license_number = extracted_text.split("License No:")[1].split('\n')[0].strip()
            else:
                license_number = "UNKNOWN_LICENSE"

            document_instance.extracted_license_number = license_number
            document_instance.verification_status = 'OCR_SUCCESS'
            document_instance.save()

            if call_naql_verification(license_number):
                document_instance.verification_status = 'NAQL_VERIFIED'
            else:
                document_instance.verification_status = 'REJECTED'
            
            document_instance.save()
        except Exception as e:
            print(f"OCR or Naql error: {e}")
            document_instance.verification_status = 'REJECTED'
            document_instance.save()
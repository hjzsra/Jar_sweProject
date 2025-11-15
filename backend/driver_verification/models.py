from django.db import models
from user_auth.models import User

class DriverDocument(models.Model):
    driver = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'DRIVER'}, # Optional: ensures only DRIVER roles are linked
        related_name='driver_documents'
    )

    document_file = models.ImageField(upload_to='driver_docs/%Y/%m/%d/')
    upload_date = models.DateTimeField(auto_now_add=True)
    extracted_license_number = models.CharField(max_length=50, blank=True, null=True)
    verification_status = models.CharField(
        max_length=20, 
        default='PENDING_UPLOAD',
        choices=[
            ('PENDING_UPLOAD', 'Pending Upload'),
            ('OCR_SUCCESS', 'OCR Success'),
            ('NAQL_VERIFIED', 'Naql Verified'),
            ('REJECTED', 'Rejected'),
        ]
    )
    naql_rejection_reasons = models.TextField(blank=True, null=True)

    
    def __str__(self):
        return f"{self.driver.username} - {self.document_file.name}"
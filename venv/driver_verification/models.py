from django.db import models 





class DriverDocument(models.Model):
    document_file = models.ImageField(upload_to='driver_docs/%Y/%m/%d/')
    driver_id = models.CharField(max_length=15)
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

    def __str__(self):
        return f"{self.driver_id} - {self.document_file.name}" 


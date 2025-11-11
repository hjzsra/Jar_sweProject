from django.db import models
from django.conf import settings
from django.utils import timezone


class EmailOTP(models.Model):
    """Simple model to store email verification OTPs."""
    # Use the AUTH_USER_MODEL string so migrations do not require importing the user model at import-time
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='email_otps')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["user", "code"])]
        ordering = ["-created_at"]

    def __str__(self):
        return f"OTP {self.code} for {self.user} ({'used' if self.used else 'new'})"

    def is_valid(self, expiry_seconds: int = 600) -> bool:
        """Return True if OTP is not used and not older than expiry_seconds (default 10 minutes)."""
        if self.used:
            return False
        age = timezone.now() - self.created_at
        return age.total_seconds() <= expiry_seconds

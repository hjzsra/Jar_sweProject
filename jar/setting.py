from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INSTALLED_APPS = [
    'rest_framework',
    'driver_verification',
    'user_auth',  
    'trips',
]
AUTH_USER_MODEL = 'user_auth.User'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


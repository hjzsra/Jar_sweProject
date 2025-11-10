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

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',  
    
   
    'rest_framework',
    'rest_framework_gis',  
    'corsheaders',
    
   
    'user_auth',
    'trips',
]


DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',  
        'NAME': 'jar_rideshare',
        'USER': 'your_db_user',
        'PASSWORD': 'your_db_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}


AUTH_USER_MODEL = 'user_auth.User'


GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_TIMEZONE = 'Asia/Riyadh'


from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-old-location-history': {
        'task': 'trips.tasks.cleanup_old_location_history',
        'schedule': crontab(hour=2, minute=0),  
    },
}


REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}


LOCATION_UPDATE_INTERVAL_SECONDS = 10
NEARBY_SEARCH_DEFAULT_RADIUS_KM = 5
ROUTE_DEVIATION_THRESHOLD_METERS = 500
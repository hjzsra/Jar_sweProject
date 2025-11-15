import os
from pathlib import Path
from datetime import timedelta

#from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent
import sys
sys.path.insert(0, str(BASE_DIR / 'backend'))


SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'your-insecure-default-key-REPLACE-IN-PRODUCTION')
DEBUG =os.getenv('DJANGO_DEBUG', 'True') == 'True'
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', os.getenv('HOST_IP', '')]

INSTALLED_APPS = [
     'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    #'django.contrib.gis',  
    
    #'rest_framework',
   # 'rest_framework_gis',  
    'corsheaders',



    'backend.driver_verification.apps.DriverVerificationConfig',
    'backend.user_auth.apps.UserAuthConfig',  
    'backend.trips.apps.TripsConfig',
    'backend.simple_trips.apps.SimpleTripsConfig',]


MIDDLEWARE = [
    
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'jar.urls'

TEMPLATES = [
{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
}
]


WSGI_APPLICATION = 'jar.wsgi.application'
ASGI_APPLICATION = 'jar.asgi.application'

DATABASES = {
    'default':{
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR/'db.sqlite3',
    }
}


AUTH_PASSWORD_VALIDATORS = [{

}]

AUTH_USER_MODEL = 'user_auth.User'

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Riyadh'
USE_I18N = True
USE_TZ = True



REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
}

CORS_ALLOW_ALL_ORIGINS = True


CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_TIMEZONE = 'Asia/Riyadh'




#CELERY_BEAT_SCHEDULE = {
    #'cleanup-old-location-history': {
        #'task': 'trips.tasks.cleanup_old_location_history',
        #'schedule': crontab(hour=2, minute=0),  
   # },
#}
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')
LOCATION_UPDATE_INTERVAL_SECONDS = 10
NEARBY_SEARCH_DEFAULT_RADIUS_KM = 5
ROUTE_DEVIATION_THRESHOLD_METERS = 500
# settings.py

import os 
TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
import os

GDAL_BIN_DIR = "C:/OSGeo4W64/bin"
os.environ['PATH'] = GDAL_BIN_DIR + os.pathsep + os.environ['PATH']
GDAL_LIBRARY_PATH = os.path.join(GDAL_BIN_DIR, "gdal307.dll")
GEOS_LIBRARY_PATH = os.path.join(GDAL_BIN_DIR,"geos_c.dll")
from rest_framework.routers import DefaultRouter
from .views import DriverDocumentViewSet
router = DefaultRouter()
router.register(r'driver_documents', DriverDocumentViewSet) 

urlpatterns = router.urls
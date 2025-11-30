from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PackageMasterViewSet,
    PackagePricingViewSet,
)

router = DefaultRouter()
router.register(r'packages', PackageMasterViewSet, basename='package')
router.register(r'package-pricings', PackagePricingViewSet, basename='package-pricing')

urlpatterns = [
    path('', include(router.urls)),
]


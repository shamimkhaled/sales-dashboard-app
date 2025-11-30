from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceMasterViewSet,
    InvoiceDetailsViewSet,
    CustomerEntitlementMasterViewSet,
    CustomerEntitlementDetailsViewSet,
)

router = DefaultRouter()
router.register(r'invoices', InvoiceMasterViewSet, basename='invoice')
router.register(r'invoice-details', InvoiceDetailsViewSet, basename='invoice-detail')
router.register(r'entitlements', CustomerEntitlementMasterViewSet, basename='entitlement')
router.register(r'entitlement-details', CustomerEntitlementDetailsViewSet, basename='entitlement-detail')

urlpatterns = [
    path('', include(router.urls)),
]


from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceMasterViewSet,
    InvoiceDetailsViewSet,
)

router = DefaultRouter()
router.register(r'invoices', InvoiceMasterViewSet, basename='invoice')
router.register(r'invoice-details', InvoiceDetailsViewSet, basename='invoice-detail')

urlpatterns = [
    path('', include(router.urls)),
]


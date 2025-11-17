from django.urls import path
from .views import (
    ProspectListCreateView,
    ProspectDetailView,
    CustomerListCreateView,
    CustomerDetailView,
    CustomerImportView,
    CustomerExportView,
    RevenueCalculationView,
    ProspectConvertToCustomerView,
)

urlpatterns = [
    path('prospects/', ProspectListCreateView.as_view(), name='prospects-list-create'),
    path('prospects/<int:pk>/', ProspectDetailView.as_view(), name='prospects-detail'),
    path('prospects/<int:prospect_id>/convert/', ProspectConvertToCustomerView.as_view(), name='prospects-convert'),
    path('', CustomerListCreateView.as_view(), name='customers-list-create'),
    path('<int:pk>/', CustomerDetailView.as_view(), name='customers-detail'),
    path('import/', CustomerImportView.as_view(), name='customers-import'),
    path('export/', CustomerExportView.as_view(), name='customers-export'),
    path('revenue/', RevenueCalculationView.as_view(), name='customers-revenue'),
]



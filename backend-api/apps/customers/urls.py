from django.urls import path
from .views import (
    ProspectListCreateView,
    ProspectDetailView,
    ProspectImportView,
    ProspectExportView,
   
)

urlpatterns = [
    path('prospects/', ProspectListCreateView.as_view(), name='prospects-list-create'),
    path('prospects/<int:pk>/', ProspectDetailView.as_view(), name='prospects-detail'),
    path('prospects/import/', ProspectImportView.as_view(), name='prospects-import'),
    path('prospects/export/', ProspectExportView.as_view(), name='prospects-export'),
    # path('prospects/<int:prospect_id>/convert/', ProspectConvertToCustomerView.as_view(), name='prospects-convert'),

]



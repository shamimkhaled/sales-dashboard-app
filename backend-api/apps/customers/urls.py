from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    KAMMasterListView,
    KAMMasterDetailView,
    CustomerMasterViewSet,
    ProspectListCreateView,
    ProspectDetailView,
    ProspectImportView,
    ProspectExportView,
)


router = DefaultRouter()
router.register(r'', CustomerMasterViewSet, basename='customer')

urlpatterns = [
    # Prospects endpoints
    path('prospects/', ProspectListCreateView.as_view(), name='prospects-list-create'),
    path('prospects/<int:pk>/', ProspectDetailView.as_view(), name='prospects-detail'),
    path('prospects/import/', ProspectImportView.as_view(), name='prospects-import'),
    path('prospects/export/', ProspectExportView.as_view(), name='prospects-export'),
    
    # KAM Master endpoints (GET only)
    path('kam/', KAMMasterListView.as_view(), name='kam-list'),
    path('kam/<int:pk>/', KAMMasterDetailView.as_view(), name='kam-detail'),
    
    # Customer endpoints (via router)
    path('', include(router.urls)),
]

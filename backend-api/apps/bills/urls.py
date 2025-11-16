from django.urls import path
from .views import BillListCreateView, BillDetailView, BillImportView, BillExportView

urlpatterns = [
    path('', BillListCreateView.as_view(), name='bills-list-create'),
    path('<int:pk>/', BillDetailView.as_view(), name='bills-detail'),
    path('import/', BillImportView.as_view(), name='bills-import'),
    path('export/', BillExportView.as_view(), name='bills-export'),
]



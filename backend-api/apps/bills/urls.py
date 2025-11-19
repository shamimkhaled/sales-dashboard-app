from django.urls import path
from .views import (
    BillListCreateView,
    BillDetailView,
    BillImportView,
    BillExportView,
    PricingPeriodListCreateView,
    PricingPeriodDetailView,
    PricingPeriodsByBillView,
    DailyBillAmountListCreateView,
    DailyBillAmountDetailView,
    DailyBillAmountsByBillView,
    CalculateDailyAmountsView,
    FinalizeBillRecordView,
)

urlpatterns = [
    # Bill Record endpoints
    path('', BillListCreateView.as_view(), name='bills-list-create'),
    path('<int:pk>/', BillDetailView.as_view(), name='bills-detail'),
    path('import/', BillImportView.as_view(), name='bills-import'),
    path('export/', BillExportView.as_view(), name='bills-export'),
    
    # Pricing Period endpoints
    path('pricing-periods/', PricingPeriodListCreateView.as_view(), name='pricing-periods-list-create'),
    path('pricing-periods/<int:pk>/', PricingPeriodDetailView.as_view(), name='pricing-periods-detail'),
    path('<int:bill_id>/pricing-periods/', PricingPeriodsByBillView.as_view(), name='pricing-periods-by-bill'),
    
    # Daily Bill Amount endpoints
    path('daily-amounts/', DailyBillAmountListCreateView.as_view(), name='daily-amounts-list-create'),
    path('daily-amounts/<int:pk>/', DailyBillAmountDetailView.as_view(), name='daily-amounts-detail'),
    path('<int:bill_id>/daily-amounts/', DailyBillAmountsByBillView.as_view(), name='daily-amounts-by-bill'),
    
    # Utility endpoints
    path('<int:bill_id>/calculate-daily-amounts/', CalculateDailyAmountsView.as_view(), name='calculate-daily-amounts'),
    path('<int:bill_id>/finalize/', FinalizeBillRecordView.as_view(), name='finalize-bill-record'),
]



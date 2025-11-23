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
    # MAC/SOHO Billing Views
    PackageListCreateView,
    PackageDetailView,
    MACPartnerListCreateView,
    MACPartnerDetailView,
    MACEndCustomerListCreateView,
    MACEndCustomerDetailView,
    MACEndCustomersByPartnerView,
    MACBillListCreateView,
    MACBillDetailView,
    MACBillsByPartnerView,
    CalculateMACBillView,
    SOHOCustomerListCreateView,
    SOHOCustomerDetailView,
    SOHOBillListCreateView,
    SOHOBillDetailView,
    SOHOBillsByCustomerView,
    PaymentRecordListCreateView,
    PaymentRecordDetailView,
    RevenueByCustomerTypeView,
    DailyRevenueAnalyticsView,
    WeeklyRevenueAnalyticsView,
    MonthlyRevenueAnalyticsView,
    YearlyRevenueAnalyticsView,
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
    
    # Package endpoints
    path('packages/', PackageListCreateView.as_view(), name='packages-list-create'),
    path('packages/<int:pk>/', PackageDetailView.as_view(), name='packages-detail'),
    
    # MAC Partner endpoints
    path('mac-partners/', MACPartnerListCreateView.as_view(), name='mac-partners-list-create'),
    path('mac-partners/<int:pk>/', MACPartnerDetailView.as_view(), name='mac-partners-detail'),
    
    # MAC End Customer endpoints
    path('mac-end-customers/', MACEndCustomerListCreateView.as_view(), name='mac-end-customers-list-create'),
    path('mac-end-customers/<int:pk>/', MACEndCustomerDetailView.as_view(), name='mac-end-customers-detail'),
    path('mac-partners/<int:partner_id>/end-customers/', MACEndCustomersByPartnerView.as_view(), name='mac-end-customers-by-partner'),
    
    # MAC Bill endpoints
    path('mac-bills/', MACBillListCreateView.as_view(), name='mac-bills-list-create'),
    path('mac-bills/<int:pk>/', MACBillDetailView.as_view(), name='mac-bills-detail'),
    path('mac-partners/<int:partner_id>/bills/', MACBillsByPartnerView.as_view(), name='mac-bills-by-partner'),
    path('mac-partners/<int:partner_id>/calculate-bill/', CalculateMACBillView.as_view(), name='calculate-mac-bill'),
    
    # SOHO Customer endpoints
    path('soho-customers/', SOHOCustomerListCreateView.as_view(), name='soho-customers-list-create'),
    path('soho-customers/<int:pk>/', SOHOCustomerDetailView.as_view(), name='soho-customers-detail'),
    
    # SOHO Bill endpoints
    path('soho-bills/', SOHOBillListCreateView.as_view(), name='soho-bills-list-create'),
    path('soho-bills/<int:pk>/', SOHOBillDetailView.as_view(), name='soho-bills-detail'),
    path('soho-customers/<int:customer_id>/bills/', SOHOBillsByCustomerView.as_view(), name='soho-bills-by-customer'),
    
    # Payment Record endpoints
    path('payments/', PaymentRecordListCreateView.as_view(), name='payments-list-create'),
    path('payments/<int:pk>/', PaymentRecordDetailView.as_view(), name='payments-detail'),
    
    # Revenue Analytics endpoints
    path('revenue/by-customer-type/', RevenueByCustomerTypeView.as_view(), name='revenue-by-customer-type'),
    path('revenue/daily/', DailyRevenueAnalyticsView.as_view(), name='revenue-daily'),
    path('revenue/weekly/', WeeklyRevenueAnalyticsView.as_view(), name='revenue-weekly'),
    path('revenue/monthly/', MonthlyRevenueAnalyticsView.as_view(), name='revenue-monthly'),
    path('revenue/yearly/', YearlyRevenueAnalyticsView.as_view(), name='revenue-yearly'),
]



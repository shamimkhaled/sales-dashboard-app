from django.urls import path
from . import views

urlpatterns = [
    path('kpis/', views.DashboardKPIsView.as_view(), name='dashboard-kpis'),
    path('weekly-revenue/', views.WeeklyRevenueView.as_view(), name='weekly-revenue'),
    path('monthly-revenue/', views.MonthlyRevenueView.as_view(), name='monthly-revenue'),
    path('yearly-revenue/', views.YearlyRevenueView.as_view(), name='yearly-revenue'),
    path('customer-wise-revenue/', views.CustomerWiseRevenueView.as_view(), name='customer-wise-revenue'),
    path('kam-performance/', views.KAMPerformanceView.as_view(), name='kam-performance'),
]
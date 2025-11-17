from django.urls import path
from .views import (
    InvoiceListCreateView,
    InvoiceDetailView,
    GenerateInvoiceFromBillView,
    InvoiceByBillView,
    InvoiceMarkAsIssuedView,
    InvoiceMarkAsPaidView,
    InvoiceListByCustomerView,
    BillsWithoutInvoiceView,
    GenerateInvoicesForCustomerBillsView,
)

urlpatterns = [
    path('', InvoiceListCreateView.as_view(), name='invoices-list-create'),
    path('<int:pk>/', InvoiceDetailView.as_view(), name='invoices-detail'),
    path('generate-from-bill/', GenerateInvoiceFromBillView.as_view(), name='invoices-generate-from-bill'),
    path('generate-for-customer-bills/', GenerateInvoicesForCustomerBillsView.as_view(), name='invoices-generate-for-customer'),
    path('by-bill/<int:bill_id>/', InvoiceByBillView.as_view(), name='invoices-by-bill'),
    path('by-customer/<int:customer_id>/', InvoiceListByCustomerView.as_view(), name='invoices-by-customer'),
    path('bills-without-invoice/', BillsWithoutInvoiceView.as_view(), name='invoices-bills-without-invoice'),
    path('<int:pk>/mark-as-issued/', InvoiceMarkAsIssuedView.as_view(), name='invoices-mark-issued'),
    path('<int:pk>/mark-as-paid/', InvoiceMarkAsPaidView.as_view(), name='invoices-mark-paid'),
]


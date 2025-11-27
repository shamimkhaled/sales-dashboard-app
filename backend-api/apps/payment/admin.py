from django.contrib import admin
from .models import PaymentMaster, PaymentDetails


@admin.register(PaymentMaster)
class PaymentMasterAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment_date', 'payment_method', 'invoice_master_id', 'status', 'created_at']
    list_filter = ['payment_method', 'status', 'payment_date', 'created_at']
    search_fields = ['invoice_master_id__invoice_number', 'customer_entitlement_master_id__bill_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PaymentDetails)
class PaymentDetailsAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment_master_id', 'pay_amount', 'transaction_id', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['transaction_id', 'payment_master_id__id']
    readonly_fields = ['created_at', 'updated_at']


from django.contrib import admin
from .models import CustomerEntitlementMaster, CustomerEntitlementDetails, InvoiceMaster, InvoiceDetails


@admin.register(CustomerEntitlementMaster)
class CustomerEntitlementMasterAdmin(admin.ModelAdmin):
    list_display = ['id', 'bill_number', 'customer_master_id', 'activation_date', 'total_bill', 'created_at']
    list_filter = ['created_at', 'activation_date']
    search_fields = ['bill_number', 'customer_master_id__customer_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CustomerEntitlementDetails)
class CustomerEntitlementDetailsAdmin(admin.ModelAdmin):
    list_display = ['id', 'cust_entitlement_id', 'type', 'start_date', 'end_date', 'status', 'is_active']
    list_filter = ['type', 'status', 'is_active', 'created_at']
    search_fields = ['cust_entitlement_id__bill_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(InvoiceMaster)
class InvoiceMasterAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice_number', 'customer_entitlement_master_id', 'issue_date', 'status', 'total_bill_amount']
    list_filter = ['status', 'issue_date', 'created_at']
    search_fields = ['invoice_number', 'customer_entitlement_master_id__bill_number', 'customer_entitlement_master_id__customer_master_id__customer_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(InvoiceDetails)
class InvoiceDetailsAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice_master_id', 'sub_total', 'vat_rate', 'created_at']
    list_filter = ['created_at']
    search_fields = ['invoice_master_id__invoice_number']
    readonly_fields = ['created_at']


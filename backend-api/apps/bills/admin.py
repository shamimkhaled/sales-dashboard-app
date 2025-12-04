from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from .models import CustomerEntitlementMaster, CustomerEntitlementDetails, InvoiceMaster, InvoiceDetails


class CustomerEntitlementDetailsInline(admin.TabularInline):
    """Inline admin for entitlement details"""
    model = CustomerEntitlementDetails
    extra = 1
    fields = [
        'type', 'start_date', 'end_date', 'mbps', 'unit_price', 
        'custom_mac_percentage_share', 'package_pricing_id', 'status', 
        'is_active', 'last_changes_updated_date'
    ]
    readonly_fields = ['created_at', 'updated_at', 'last_changes_updated_date']
    ordering = ['-created_at']


@admin.register(CustomerEntitlementMaster)
class CustomerEntitlementMasterAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'bill_number', 'customer_master_id', 'customer_type', 
        'activation_date', 'total_bill', 'details_count', 'created_by', 'created_at'
    ]
    list_filter = ['activation_date', 'created_at', 'customer_master_id__customer_type']
    search_fields = [
        'bill_number', 'customer_master_id__customer_name', 
        'customer_master_id__customer_number', 'customer_master_id__email'
    ]
    ordering = ['-created_at']
    readonly_fields = ['bill_number', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = ['customer_master_id', 'created_by', 'updated_by']
    inlines = [CustomerEntitlementDetailsInline]
    
    fieldsets = (
        ('Entitlement Information', {
            'fields': ('customer_master_id', 'activation_date', 'total_bill')
        }),
        ('NTTN Information', {
            'fields': ('nttn_company', 'nttn_capacity', 'link_id', 'nttn_uses'),
            'classes': ('collapse',)
        }),
        ('Home Package Information', {
            'fields': ('type_of_bw', 'type_of_connection', 'connected_pop'),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_type(self, obj):
        """Display customer type"""
        return obj.customer_master_id.get_customer_type_display()
    customer_type.short_description = 'Customer Type'
    
    def details_count(self, obj):
        """Display count of entitlement details"""
        count = obj.details.count()
        return format_html('<span style="color: blue; font-weight: bold;">{}</span>', count)
    details_count.short_description = 'Details Count'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('customer_master_id', 'created_by', 'updated_by').prefetch_related('details')


@admin.register(CustomerEntitlementDetails)
class CustomerEntitlementDetailsAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cust_entitlement_id', 'customer_name', 'type', 'start_date', 
        'end_date', 'mbps', 'unit_price', 'custom_mac_percentage_share', 
        'line_total', 'status', 'is_active', 'last_changes_updated_date', 'created_at'
    ]
    list_filter = ['type', 'status', 'is_active', 'created_at', 'start_date', 'end_date']
    search_fields = [
        'cust_entitlement_id__bill_number', 
        'cust_entitlement_id__customer_master_id__customer_name'
    ]
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'last_changes_updated_date', 'created_by', 'updated_by']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = ['cust_entitlement_id__customer_master_id', 'package_pricing_id', 'created_by', 'updated_by']
    
    fieldsets = (
        ('Entitlement Information', {
            'fields': ('cust_entitlement_id', 'type', 'start_date', 'end_date', 'package_pricing_id')
        }),
        ('Bandwidth/Channel Partner Details', {
            'fields': ('mbps', 'unit_price', 'custom_mac_percentage_share'),
            'description': 'For Bandwidth and Channel Partner customers'
        }),
        ('Status', {
            'fields': ('status', 'is_active', 'last_changes_updated_date')
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        """Display customer name"""
        return obj.cust_entitlement_id.customer_master_id.customer_name
    customer_name.short_description = 'Customer'
    
    def line_total(self, obj):
        """Calculate and display line total"""
        if obj.mbps and obj.unit_price:
            total = float(obj.mbps * obj.unit_price)
            total_formatted = f"{total:.2f}"
            return format_html('<span style="color: green; font-weight: bold;">{}</span>', total_formatted)
        return '-'
    line_total.short_description = 'Line Total'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'cust_entitlement_id__customer_master_id', 
            'package_pricing_id', 
            'created_by', 
            'updated_by'
        )


class InvoiceDetailsInline(admin.TabularInline):
    """Inline admin for invoice details"""
    model = InvoiceDetails
    extra = 1
    fields = [
        'entitlement_details_id', 'sub_total', 'vat_rate', 
        'sub_discount_rate', 'remarks'
    ]
    readonly_fields = ['created_at']
    ordering = ['-created_at']


@admin.register(InvoiceMaster)
class InvoiceMasterAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'invoice_number', 'customer_name', 'bill_number', 
        'issue_date', 'total_bill_amount', 'total_paid_amount', 
        'total_balance_due', 'payment_status', 'status', 'created_at'
    ]
    list_filter = ['status', 'issue_date', 'created_at', 'information_master_id']
    search_fields = [
        'invoice_number', 
        'customer_entitlement_master_id__bill_number',
        'customer_entitlement_master_id__customer_master_id__customer_name',
        'customer_entitlement_master_id__customer_master_id__customer_number'
    ]
    ordering = ['-created_at']
    readonly_fields = [
        'invoice_number', 'created_by', 'updated_by', 'created_at', 'updated_at', 
        # 'total_bill_amount', 'total_paid_amount', 'total_balance_due', 'total_vat_amount', 
        # 'total_discount_amount'
    ]
    date_hierarchy = 'issue_date'
    list_per_page = 25
    list_select_related = [
        'customer_entitlement_master_id__customer_master_id',
        'information_master_id',
        'created_by'
    ]
    inlines = [InvoiceDetailsInline]
    
    fieldsets = (
        ('Invoice Information', {
            'fields': (
                'customer_entitlement_master_id', 
                'issue_date', 'information_master_id', 'status'
            )
        }),
        ('Amounts', {
            'fields': (
                'total_bill_amount', 'total_paid_amount', 'total_balance_due',
                'total_vat_amount', 'total_discount_amount'
            ),
            'classes': ('collapse',)
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        """Display customer name"""
        return obj.customer_entitlement_master_id.customer_master_id.customer_name
    customer_name.short_description = 'Customer'
    
    def bill_number(self, obj):
        """Display bill number"""
        return obj.customer_entitlement_master_id.bill_number
    bill_number.short_description = 'Bill Number'
    
    def payment_status(self, obj):
        """Display payment status with color coding"""
        if obj.total_balance_due == 0:
            return format_html(
                '<span style="color: green; font-weight: bold;">PAID</span>'
            )
        elif obj.total_paid_amount > 0:
            return format_html(
                '<span style="color: orange; font-weight: bold;">PARTIAL</span>'
            )
        else:
            return format_html(
                '<span style="color: red; font-weight: bold;">UNPAID</span>'
            )
    payment_status.short_description = 'Payment Status'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'customer_entitlement_master_id__customer_master_id',
            'information_master_id',
            'created_by'
        ).prefetch_related('details')


@admin.register(InvoiceDetails)
class InvoiceDetailsAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'invoice_number', 'customer_name', 'entitlement_type', 
        'sub_total', 'vat_rate', 'vat_amount', 'sub_discount_rate', 
        'discount_amount', 'line_total', 'created_at'
    ]
    list_filter = ['created_at', 'vat_rate', 'sub_discount_rate']
    search_fields = [
        'invoice_master_id__invoice_number',
        'entitlement_details_id__cust_entitlement_id__bill_number'
    ]
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = [
        'invoice_master_id__customer_entitlement_master_id__customer_master_id',
        'entitlement_details_id'
    ]
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_master_id', 'entitlement_details_id')
        }),
        ('Amounts', {
            'fields': ('sub_total', 'vat_rate', 'sub_discount_rate')
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def invoice_number(self, obj):
        """Display invoice number"""
        return obj.invoice_master_id.invoice_number
    invoice_number.short_description = 'Invoice Number'
    
    def customer_name(self, obj):
        """Display customer name"""
        return obj.invoice_master_id.customer_entitlement_master_id.customer_master_id.customer_name
    customer_name.short_description = 'Customer'
    
    def entitlement_type(self, obj):
        """Display entitlement type"""
        if obj.entitlement_details_id:
            return obj.entitlement_details_id.get_type_display()
        return '-'
    entitlement_type.short_description = 'Type'
    
    def vat_amount(self, obj):
        """Calculate VAT amount"""
        vat = float(obj.sub_total * (obj.vat_rate / 100))
        vat_formatted = f"{vat:.2f}"
        return format_html('<span style="color: blue;">{}</span>', vat_formatted)
    vat_amount.short_description = 'VAT Amount'
    
    def discount_amount(self, obj):
        """Calculate discount amount"""
        discount = float(obj.sub_total * (obj.sub_discount_rate / 100))
        discount_formatted = f"{discount:.2f}"
        return format_html('<span style="color: orange;">{}</span>', discount_formatted)
    discount_amount.short_description = 'Discount Amount'
    
    def line_total(self, obj):
        """Calculate line total"""
        sub_total = float(obj.sub_total)
        vat = float(obj.sub_total * (obj.vat_rate / 100))
        discount = float(obj.sub_total * (obj.sub_discount_rate / 100))
        total = sub_total + vat - discount
        total_formatted = f"{total:.2f}"
        return format_html('<span style="color: green; font-weight: bold;">{}</span>', total_formatted)
    line_total.short_description = 'Line Total'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'invoice_master_id__customer_entitlement_master_id__customer_master_id',
            'entitlement_details_id'
        )

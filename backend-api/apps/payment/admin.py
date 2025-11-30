from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from .models import PaymentMaster, PaymentDetails


class PaymentDetailsInline(admin.TabularInline):
    """Inline admin for payment details"""
    model = PaymentDetails
    extra = 1
    fields = [
        'pay_amount', 'transaction_id', 'status', 
        'received_by', 'remarks'
    ]
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(PaymentMaster)
class PaymentMasterAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'payment_date', 'payment_method', 'customer_name', 
        'invoice_number', 'total_paid', 'status', 'received_by', 'created_at'
    ]
    list_filter = ['payment_method', 'status', 'payment_date', 'created_at']
    search_fields = [
        'invoice_master_id__invoice_number',
        'customer_entitlement_master_id__bill_number',
        'customer_entitlement_master_id__customer_master_id__customer_name',
        'customer_entitlement_master_id__customer_master_id__customer_number'
    ]
    ordering = ['-payment_date']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'payment_date'
    list_per_page = 25
    list_select_related = [
        'customer_entitlement_master_id__customer_master_id',
        'invoice_master_id',
        'received_by',
        'created_by'
    ]
    inlines = [PaymentDetailsInline]
    
    fieldsets = (
        ('Payment Information', {
            'fields': (
                'payment_date', 'payment_method', 'status',
                'customer_entitlement_master_id', 'invoice_master_id'
            )
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('Metadata', {
            'fields': ('received_by', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        """Display customer name"""
        return obj.customer_entitlement_master_id.customer_master_id.customer_name
    customer_name.short_description = 'Customer'
    
    def invoice_number(self, obj):
        """Display invoice number"""
        return obj.invoice_master_id.invoice_number
    invoice_number.short_description = 'Invoice Number'
    
    def total_paid(self, obj):
        """Calculate total paid from all payment details"""
        total = obj.details.aggregate(total=Sum('pay_amount'))['total']
        if total:
            total_formatted = f"{float(total):.2f}"
            return format_html(
                '<span style="color: green; font-weight: bold;">{}</span>', 
                total_formatted
            )
        return format_html('<span style="color: red;">0.00</span>')
    total_paid.short_description = 'Total Paid'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'customer_entitlement_master_id__customer_master_id',
            'invoice_master_id',
            'received_by',
            'created_by'
        ).prefetch_related('details')


@admin.register(PaymentDetails)
class PaymentDetailsAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'payment_master_id', 'customer_name', 'invoice_number', 
        'pay_amount', 'transaction_id', 'status', 'received_by', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = [
        'transaction_id', 
        'payment_master_id__id',
        'payment_master_id__invoice_master_id__invoice_number'
    ]
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = [
        'payment_master_id__customer_entitlement_master_id__customer_master_id',
        'payment_master_id__invoice_master_id',
        'received_by',
        'created_by'
    ]
    
    fieldsets = (
        ('Payment Detail Information', {
            'fields': ('payment_master_id', 'pay_amount', 'transaction_id', 'status')
        }),
        ('Additional Information', {
            'fields': ('remarks',)
        }),
        ('Metadata', {
            'fields': ('received_by', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        """Display customer name"""
        return obj.payment_master_id.customer_entitlement_master_id.customer_master_id.customer_name
    customer_name.short_description = 'Customer'
    
    def invoice_number(self, obj):
        """Display invoice number"""
        return obj.payment_master_id.invoice_master_id.invoice_number
    invoice_number.short_description = 'Invoice Number'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related(
            'payment_master_id__customer_entitlement_master_id__customer_master_id',
            'payment_master_id__invoice_master_id',
            'received_by',
            'created_by'
        )

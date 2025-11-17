from django.contrib import admin
from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    fields = ['service_name', 'description', 'quantity', 'unit_price', 'line_total']
    readonly_fields = ['line_total']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number',
        'invoice_format',
        'customer_name',
        'bill_record',
        'issue_date',
        'due_date',
        'status',
        'total_amount',
        'paid_amount',
        'balance_due',
        'created_at'
    ]
    list_filter = ['status', 'invoice_format', 'issue_date', 'created_at']
    search_fields = ['invoice_number', 'bill_record__customer__name', 'bill_record__customer__company_name']
    ordering = ['-created_at']
    readonly_fields = ['invoice_number', 'created_at', 'updated_at', 'issued_at', 'paid_at', 'balance_due']
    date_hierarchy = 'issue_date'
    inlines = [InvoiceItemInline]
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_number', 'invoice_format', 'bill_record', 'status')
        }),
        ('Dates', {
            'fields': ('issue_date', 'due_date', 'issued_at', 'paid_at')
        }),
        ('Financial Information', {
            'fields': ('subtotal', 'tax_amount', 'discount_amount', 'total_amount', 'paid_amount', 'balance_due')
        }),
        ('Additional Information', {
            'fields': ('notes', 'terms', 'created_by')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customer_name(self, obj):
        return obj.bill_record.customer.name if obj.bill_record and obj.bill_record.customer else 'N/A'
    customer_name.short_description = 'Customer'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('bill_record', 'bill_record__customer', 'created_by')


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'service_name', 'quantity', 'unit_price', 'line_total']
    list_filter = ['service_type', 'invoice__invoice_format']
    search_fields = ['service_name', 'invoice__invoice_number']
    readonly_fields = ['line_total']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('invoice')


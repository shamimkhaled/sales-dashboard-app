from django.contrib import admin
from django.utils.html import format_html
from .models import (
    BillRecord, PricingPeriod, DailyBillAmount, Package,
    MACPartner, MACEndCustomer, SOHOCustomer,
    MACBill, SOHOBill, PaymentRecord
)


@admin.register(BillRecord)
class BillRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'billing_date', 'status', 'total_bill', 'total_received', 
                   'total_due', 'created_at']
    list_filter = ['status', 'billing_date', 'created_at']
    search_fields = ['customer__name', 'customer__company_name', 'customer__email', 
                    'nttn_cap', 'nttn_com', 'remarks']
    ordering = ['-billing_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'total_bill', 'total_due']
    date_hierarchy = 'billing_date'
    list_per_page = 25
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('customer',)
        }),
        ('Connection Details', {
            'fields': ('nttn_cap', 'nttn_com')
        }),
        ('Dates', {
            'fields': ('active_date', 'billing_date', 'termination_date')
        }),
        ('IPT Services', {
            'fields': ('ipt', 'ipt_price'),
            'classes': ('collapse',)
        }),
        ('FNA Services', {
            'fields': ('fna', 'fna_price'),
            'classes': ('collapse',)
        }),
        ('GGC Services', {
            'fields': ('ggc', 'ggc_price'),
            'classes': ('collapse',)
        }),
        ('CDN Services', {
            'fields': ('cdn', 'cdn_price'),
            'classes': ('collapse',)
        }),
        ('NIX Services', {
            'fields': ('nix', 'nix_price'),
            'classes': ('collapse',)
        }),
        ('Baishan Services', {
            'fields': ('baishan', 'baishan_price'),
            'classes': ('collapse',)
        }),
        ('Financial Summary', {
            'fields': ('discount', 'total_bill', 'total_received', 'total_due')
        }),
        ('Status & Notes', {
            'fields': ('status', 'remarks')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('customer')
    
    def get_readonly_fields(self, request, obj=None):
        readonly = list(self.readonly_fields)
        # Allow editing totals if needed, or keep them readonly for auto-calculation
        return readonly
    
    def save_model(self, request, obj, form, change):
        # Auto-calculate totals if not set
        if not obj.total_bill or obj.total_bill == 0:
            component_total = (
                (obj.ipt or 0) * (obj.ipt_price or 0) +
                (obj.fna or 0) * (obj.fna_price or 0) +
                (obj.ggc or 0) * (obj.ggc_price or 0) +
                (obj.cdn or 0) * (obj.cdn_price or 0) +
                (obj.nix or 0) * (obj.nix_price or 0) +
                (obj.baishan or 0) * (obj.baishan_price or 0)
            )
            obj.total_bill = component_total - (obj.discount or 0)
            obj.total_due = obj.total_bill - (obj.total_received or 0)
        super().save_model(request, obj, form, change)


@admin.register(PricingPeriod)
class PricingPeriodAdmin(admin.ModelAdmin):
    list_display = ['id', 'bill_record', 'start_day', 'end_day', 'get_period_total', 'created_at']
    list_filter = ['created_at', 'start_day', 'end_day']
    search_fields = ['bill_record__bill_number', 'bill_record__customer__name', 'notes']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    
    fieldsets = (
        ('Bill Record', {
            'fields': ('bill_record',)
        }),
        ('Period Definition', {
            'fields': ('start_day', 'end_day')
        }),
        ('Usage/Quantity', {
            'fields': ('ipt', 'fna', 'ggc', 'cdn', 'nix', 'baishan'),
            'classes': ('collapse',)
        }),
        ('Pricing', {
            'fields': ('ipt_price', 'fna_price', 'ggc_price', 'cdn_price', 'nix_price', 'baishan_price'),
            'classes': ('collapse',)
        }),
        ('Discount & Notes', {
            'fields': ('discount', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('bill_record', 'bill_record__customer')
    
    def get_period_total(self, obj):
        return f"${float(obj.get_period_total()):.2f}"
    get_period_total.short_description = 'Period Total'


@admin.register(DailyBillAmount)
class DailyBillAmountAdmin(admin.ModelAdmin):
    list_display = ['id', 'bill_record', 'date', 'day_number', 'daily_amount', 'is_calculated', 'created_at']
    list_filter = ['date', 'is_calculated', 'created_at']
    search_fields = ['bill_record__bill_number', 'bill_record__customer__name']
    ordering = ['-date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'daily_amount']
    date_hierarchy = 'date'
    list_per_page = 25
    
    fieldsets = (
        ('Bill Record & Period', {
            'fields': ('bill_record', 'pricing_period')
        }),
        ('Date Information', {
            'fields': ('date', 'day_number')
        }),
        ('Usage (Optional Override)', {
            'fields': ('ipt', 'fna', 'ggc', 'cdn', 'nix', 'baishan'),
            'classes': ('collapse',)
        }),
        ('Amount & Breakdown', {
            'fields': ('daily_amount', 'service_breakdown', 'is_calculated', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('bill_record', 'bill_record__customer', 'pricing_period')


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'mbps', 'rate', 'is_active', 'created_at']
    list_filter = ['type', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['type', 'name']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 25
    
    fieldsets = (
        ('Package Information', {
            'fields': ('name', 'type', 'mbps', 'rate', 'description', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MACPartner)
class MACPartnerAdmin(admin.ModelAdmin):
    list_display = ['id', 'mac_cust_name', 'mac_partner_number', 'email', 'phone', 'percentage_share', 'is_active', 'total_client', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['mac_cust_name', 'email', 'phone', 'mac_partner_number', 'contact_person']
    ordering = ['mac_cust_name']
    readonly_fields = ['created_at', 'updated_at', 'mac_partner_number', 'total_client']
    list_per_page = 25
    
    fieldsets = (
        ('Partner Information', {
            'fields': ('mac_cust_name', 'mac_partner_number', 'email', 'phone', 'address')
        }),
        ('Business Details', {
            'fields': ('percentage_share', 'contact_person', 'is_active')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'total_client'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MACEndCustomer)
class MACEndCustomerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'mac_partner', 'package', 'effective_rate', 'activation_date', 'status', 'created_at']
    list_filter = ['status', 'activation_date', 'created_at', 'mac_partner']
    search_fields = ['name', 'email', 'phone', 'mac_end_customer_number']
    ordering = ['mac_partner', 'name']
    readonly_fields = ['created_at', 'updated_at', 'mac_end_customer_number', 'effective_rate']
    list_per_page = 25
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('mac_partner', 'name', 'mac_end_customer_number', 'email', 'phone', 'address')
        }),
        ('Package & Pricing', {
            'fields': ('package', 'custom_rate', 'effective_rate')
        }),
        ('Dates & Status', {
            'fields': ('activation_date', 'bill_date', 'status')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('mac_partner', 'package')


@admin.register(SOHOCustomer)
class SOHOCustomerAdmin(admin.ModelAdmin):
    list_display = ['id', 'cust_name', 'soho_customer_number', 'email', 'phone', 'package', 'rate', 'activation_date', 'status', 'created_at']
    list_filter = ['status', 'activation_date', 'created_at', 'package']
    search_fields = ['cust_name', 'email', 'phone', 'soho_customer_number']
    ordering = ['cust_name']
    readonly_fields = ['created_at', 'updated_at', 'soho_customer_number']
    list_per_page = 25
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('cust_name', 'soho_customer_number', 'email', 'phone', 'address')
        }),
        ('Package & Pricing', {
            'fields': ('package', 'rate')
        }),
        ('Dates & Status', {
            'fields': ('activation_date', 'status')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('package')


@admin.register(MACBill)
class MACBillAdmin(admin.ModelAdmin):
    list_display = ['id', 'mac_partner', 'bill_date', 'total_client', 'total_revenue', 'commission', 'total_bill', 'total_received', 'total_due', 'status', 'created_at']
    list_filter = ['status', 'bill_date', 'created_at']
    search_fields = ['mac_partner__mac_cust_name', 'notes']
    ordering = ['-bill_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'total_client', 'total_revenue', 'commission', 'total_bill', 'total_due']
    date_hierarchy = 'bill_date'
    list_per_page = 25
    
    fieldsets = (
        ('Partner & Date', {
            'fields': ('mac_partner', 'bill_date')
        }),
        ('Revenue & Commission', {
            'fields': ('total_client', 'total_revenue', 'percentage_share', 'commission')
        }),
        ('Financial Summary', {
            'fields': ('total_bill', 'total_received', 'total_due', 'status')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('mac_partner')


@admin.register(SOHOBill)
class SOHOBillAdmin(admin.ModelAdmin):
    list_display = ['id', 'soho_customer', 'bill_date', 'package', 'rate', 'total_bill', 'total_received', 'total_due', 'status', 'created_at']
    list_filter = ['status', 'bill_date', 'created_at']
    search_fields = ['soho_customer__cust_name', 'notes']
    ordering = ['-bill_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'total_due']
    date_hierarchy = 'bill_date'
    list_per_page = 25
    
    fieldsets = (
        ('Customer & Date', {
            'fields': ('soho_customer', 'bill_date')
        }),
        ('Package & Pricing', {
            'fields': ('package', 'rate')
        }),
        ('Financial Summary', {
            'fields': ('total_bill', 'total_received', 'total_due', 'status')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('soho_customer', 'package')


@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment_date', 'amount', 'payment_type', 'payment_method', 'get_bill_reference', 'created_by', 'created_at']
    list_filter = ['payment_type', 'payment_method', 'payment_date', 'created_at']
    search_fields = ['notes', 'reference_number', 'created_by__username']
    ordering = ['-payment_date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    date_hierarchy = 'payment_date'
    list_per_page = 25
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_date', 'amount', 'payment_type', 'payment_method', 'reference_number')
        }),
        ('Bill Reference', {
            'fields': ('bill_record', 'mac_bill', 'soho_bill'),
            'description': 'Link to one of the bill types'
        }),
        ('Additional Information', {
            'fields': ('notes', 'created_by')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('bill_record', 'bill_record__customer', 'mac_bill', 'mac_bill__mac_partner', 
                                'soho_bill', 'soho_bill__soho_customer', 'created_by')
    
    def get_bill_reference(self, obj):
        if obj.bill_record:
            return f"BillRecord #{obj.bill_record.id}"
        elif obj.mac_bill:
            return f"MACBill #{obj.mac_bill.id}"
        elif obj.soho_bill:
            return f"SOHOBill #{obj.soho_bill.id}"
        return "N/A"
    get_bill_reference.short_description = 'Bill Reference'
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


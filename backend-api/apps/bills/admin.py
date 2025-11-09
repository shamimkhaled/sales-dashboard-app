from django.contrib import admin
from django.utils.html import format_html
from .models import BillRecord


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
        ('IIG Services', {
            'fields': ('iig_qt', 'iig_qt_price'),
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
        ('BDIX Services', {
            'fields': ('bdix', 'bdix_price'),
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
                (obj.iig_qt or 0) * (obj.iig_qt_price or 0) +
                (obj.fna or 0) * (obj.fna_price or 0) +
                (obj.ggc or 0) * (obj.ggc_price or 0) +
                (obj.cdn or 0) * (obj.cdn_price or 0) +
                (obj.bdix or 0) * (obj.bdix_price or 0) +
                (obj.baishan or 0) * (obj.baishan_price or 0)
            )
            obj.total_bill = component_total - (obj.discount or 0)
            obj.total_due = obj.total_bill - (obj.total_received or 0)
        super().save_model(request, obj, form, change)


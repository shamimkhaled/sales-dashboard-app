from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, Count
from .models import Prospect, ProspectStatusHistory, ProspectFollowUp, ProspectAttachment, CustomerMaster, KAMMaster


@admin.register(KAMMaster)
class KAMMasterAdmin(admin.ModelAdmin):
    list_display = ['id', 'kam_name', 'email', 'phone', 'address', 'is_active', 'customers_count', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['kam_name', 'email', 'phone', 'address']
    ordering = ['kam_name']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 25
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('kam_name', 'email', 'phone', 'address')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def customers_count(self, obj):
        """Display count of assigned customers"""
        count = obj.customers.count()
        return format_html('<span style="color: green; font-weight: bold;">{}</span>', count)
    customers_count.short_description = 'Assigned Customers'


@admin.register(CustomerMaster)
class CustomerMasterAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'customer_number', 'customer_name', 'company_name', 'customer_type', 
        'email', 'phone', 'kam_id', 'status', 'is_active', 'last_bill_invoice_date', 
        'created_at'
    ]
    list_filter = ['customer_type', 'status', 'is_active', 'kam_id', 'created_at']
    search_fields = [
        'customer_name', 'company_name', 'email', 'phone', 
        'customer_number', 'contact_person'
    ]
    ordering = ['-created_at']
    readonly_fields = ['customer_number', 'created_at', 'updated_at', 'created_by', 'updated_by']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = ['kam_id', 'created_by']
    
    fieldsets = (
        ('Customer Information', {
            'fields': ('customer_number', 'customer_name', 'company_name', 'customer_type', 'contact_person')
        }),
        ('Contact Details', {
            'fields': ('email', 'phone', 'address')
        }),
        ('Sales Information', {
            'fields': ('kam_id', 'status', 'is_active', 'last_bill_invoice_date')
        }),
        ('Channel Partner Specific', {
            'fields': (
                'total_client', 'total_active_client', 'previous_total_client', 
                'free_giveaway_client', 'default_percentage_share'
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('kam_id', 'created_by', 'updated_by').prefetch_related('entitlements')
    
    def save_model(self, request, obj, form, change):
        """Override save_model to pass request to model's save method"""
        # Set created_by on first creation if not already set
        if not change and not obj.created_by:
            obj.created_by = request.user
        # Always update updated_by
        obj.updated_by = request.user
        obj.save(request=request)


class ProspectStatusHistoryInline(admin.TabularInline):
    model = ProspectStatusHistory
    extra = 0
    readonly_fields = ['changed_at', 'changed_by']
    fields = ['from_status', 'to_status', 'changed_at', 'changed_by', 'notes']
    ordering = ['-changed_at']


class ProspectFollowUpInline(admin.TabularInline):
    model = ProspectFollowUp
    extra = 1
    fields = ['follow_up_date', 'notes', 'completed']
    ordering = ['-follow_up_date']


class ProspectAttachmentInline(admin.TabularInline):
    model = ProspectAttachment
    extra = 0
    readonly_fields = ['uploaded_at', 'uploaded_by']
    fields = ['file', 'uploaded_at', 'uploaded_by']


@admin.register(Prospect)
class ProspectAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'company_name', 'email', 'phone', 'status', 'potential_revenue', 
        'kam', 'follow_up_date', 'created_at'
    ]
    list_filter = ['status', 'source', 'kam', 'created_at']
    search_fields = ['name', 'company_name', 'email', 'phone', 'contact_person']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    inlines = [ProspectStatusHistoryInline, ProspectFollowUpInline, ProspectAttachmentInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'company_name', 'contact_person')
        }),
        ('Contact Details', {
            'fields': ('email', 'phone', 'address')
        }),
        ('Sales Information', {
            'fields': ('kam', 'source', 'potential_revenue', 'status')
        }),
        ('Follow-up', {
            'fields': ('follow_up_date', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('kam')


@admin.register(ProspectStatusHistory)
class ProspectStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ['prospect', 'from_status', 'to_status', 'changed_by', 'changed_at']
    list_filter = ['to_status', 'changed_at']
    search_fields = ['prospect__name', 'prospect__company_name', 'notes']
    ordering = ['-changed_at']
    readonly_fields = ['changed_at', 'changed_by']
    date_hierarchy = 'changed_at'
    
    fieldsets = (
        ('Status Change', {
            'fields': ('prospect', 'from_status', 'to_status', 'changed_by', 'changed_at')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.changed_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProspectFollowUp)
class ProspectFollowUpAdmin(admin.ModelAdmin):
    list_display = ['prospect', 'follow_up_date', 'completed', 'created_at']
    list_filter = ['completed', 'follow_up_date', 'created_at']
    search_fields = ['prospect__name', 'prospect__company_name', 'notes']
    ordering = ['-follow_up_date']
    readonly_fields = ['created_at']
    date_hierarchy = 'follow_up_date'
    
    fieldsets = (
        ('Follow-up Information', {
            'fields': ('prospect', 'follow_up_date', 'completed')
        }),
        ('Notes', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProspectAttachment)
class ProspectAttachmentAdmin(admin.ModelAdmin):
    list_display = ['prospect', 'file', 'uploaded_by', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['prospect__name', 'prospect__company_name', 'file']
    ordering = ['-uploaded_at']
    readonly_fields = ['uploaded_at', 'uploaded_by']
    date_hierarchy = 'uploaded_at'
    
    fieldsets = (
        ('Attachment Information', {
            'fields': ('prospect', 'file')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'uploaded_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)

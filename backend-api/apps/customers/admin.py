from django.contrib import admin
from django.utils.html import format_html
from .models import Prospect, ProspectStatusHistory, ProspectFollowUp, ProspectAttachment, Customer


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
    list_display = ['name', 'company_name', 'email', 'phone', 'status', 'potential_revenue', 
                   'sales_person', 'follow_up_date', 'created_at']
    list_filter = ['status', 'source', 'sales_person', 'created_at']
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
            'fields': ('sales_person', 'source', 'potential_revenue', 'status')
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
        return qs.select_related('sales_person')


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


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_name', 'email', 'phone', 'assigned_sales_person', 
                   'monthly_revenue', 'link_id', 'created_at']
    list_filter = ['assigned_sales_person', 'created_at']
    search_fields = ['name', 'company_name', 'email', 'phone']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'company_name')
        }),
        ('Contact Details', {
            'fields': ('email', 'phone', 'address')
        }),
        ('Sales Information', {
            'fields': ('assigned_sales_person', 'potential_revenue', 'monthly_revenue')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('assigned_sales_person')

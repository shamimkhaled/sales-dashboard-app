from django.contrib import admin
from .models import UtilityInformationMaster, UtilityDetails


@admin.register(UtilityInformationMaster)
class UtilityInformationMasterAdmin(admin.ModelAdmin):
    list_display = ['id', 'vat_rate', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(UtilityDetails)
class UtilityDetailsAdmin(admin.ModelAdmin):
    list_display = ['id', 'utility_master_id', 'type', 'name', 'number', 'is_active']
    list_filter = ['type', 'is_active', 'created_at']
    search_fields = ['name', 'number']
    readonly_fields = ['created_at', 'updated_at']


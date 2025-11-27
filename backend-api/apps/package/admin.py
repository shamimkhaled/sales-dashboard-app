from django.contrib import admin
from .models import PackageMaster, PackagePricing


@admin.register(PackageMaster)
class PackageMasterAdmin(admin.ModelAdmin):
    list_display = ['id', 'package_name', 'package_type', 'is_active', 'created_at']
    list_filter = ['package_type', 'is_active', 'created_at']
    search_fields = ['package_name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PackagePricing)
class PackagePricingAdmin(admin.ModelAdmin):
    list_display = ['id', 'package_master_id', 'rate', 'val_start_at', 'val_end_at', 'is_active']
    list_filter = ['is_active', 'val_start_at', 'val_end_at']
    search_fields = ['package_master_id__package_name']
    readonly_fields = ['created_at', 'updated_at']


from rest_framework import serializers
from django.db import models
from decimal import Decimal
from .models import (
    Prospect,
    ProspectStatusHistory,
    ProspectFollowUp,
    ProspectAttachment,
    KAMMaster,
    CustomerMaster,
)


class ProspectSerializer(serializers.ModelSerializer):
    kam_details = serializers.SerializerMethodField()

    class Meta:
        model = Prospect
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'kam']

    def get_kam_details(self, obj):
        if obj.kam:
            return {
                'id': obj.kam.id,
                'username': getattr(obj.kam, 'username', ''),
                'email': obj.kam.email,
                'first_name': getattr(obj.kam, 'first_name', ''),
                'last_name': getattr(obj.kam, 'last_name', ''),
            }
        return None

    def validate_follow_up_date(self, value):
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError('Follow-up date cannot be in the past')
        return value


class ProspectStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProspectStatusHistory
        fields = '__all__'
        read_only_fields = ['changed_at', 'changed_by']


class ProspectFollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProspectFollowUp
        fields = '__all__'
        read_only_fields = ['created_at']


class ProspectAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProspectAttachment
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'uploaded_by']


# ==================== KAM Master Serializers ====================

class KAMMasterSerializer(serializers.ModelSerializer):
    assigned_customers_count = serializers.SerializerMethodField()
    
    class Meta:
        model = KAMMaster
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_assigned_customers_count(self, obj):
        return obj.customers.count()


# ==================== Customer Master Serializers ====================

class CustomerMasterSerializer(serializers.ModelSerializer):
    kam_details = serializers.SerializerMethodField()
    total_billed = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_due = serializers.SerializerMethodField()
    active_entitlements_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerMaster
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'customer_number', 'last_bill_invoice_date']
    
    def get_kam_details(self, obj):
        if obj.kam_id:
            return {
                'id': obj.kam_id.id,
                'name': obj.kam_id.kam_name,
                'email': obj.kam_id.email,
                'phone': obj.kam_id.phone,
            }
        return None
    
    def get_total_billed(self, obj):
        """Calculate total billed amount from all invoices"""
        from apps.bills.models import InvoiceMaster
        total = InvoiceMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=obj
        ).aggregate(total=models.Sum('total_bill_amount'))['total']
        return float(total) if total else 0.0
    
    def get_total_paid(self, obj):
        """Calculate total paid amount from all payments"""
        from apps.payment.models import PaymentMaster
        total = PaymentMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=obj
        ).aggregate(total=models.Sum('details__pay_amount'))['total']
        return float(total) if total else 0.0
    
    def get_total_due(self, obj):
        """Calculate total due amount"""
        return self.get_total_billed(obj) - self.get_total_paid(obj)
    
    def get_active_entitlements_count(self, obj):
        """Count active entitlements"""
        return obj.entitlements.filter(
            details__is_active=True,
            details__status='active'
        ).distinct().count()



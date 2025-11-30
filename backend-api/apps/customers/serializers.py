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
from apps.bills.models import CustomerEntitlementMaster, CustomerEntitlementDetails


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


# ==================== Customer Entitlement Serializers ====================

class CustomerEntitlementDetailsSerializer(serializers.ModelSerializer):
    package_name = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    bandwidth_type = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerEntitlementDetails
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'timestamp']
    
    def get_package_name(self, obj):
        if obj.package_pricing_id:
            return obj.package_pricing_id.package_master_id.package_name
        return None
    
    def get_line_total(self, obj):
        """Calculate line total: mbps * unit_price"""
        if obj.mbps and obj.unit_price:
            return float(obj.mbps * obj.unit_price)
        return 0.0
    
    def get_bandwidth_type(self, obj):
        """Extract bandwidth type from remarks (ipt, gcc, cdn, nix, baishan)"""
        if obj.type == 'bw' and obj.remarks:
            # Remarks format: "IPT - ..." or "GCC - ..." etc.
            remarks_upper = obj.remarks.upper()
            for bw_type in ['IPT', 'GCC', 'CDN', 'NIX', 'BAISHAN']:
                if remarks_upper.startswith(bw_type):
                    return bw_type.lower()
        return None
    
    def validate(self, data):
        """Validate based on customer type"""
        if 'cust_entitlement_id' in data:
            entitlement = data['cust_entitlement_id']
            customer = entitlement.customer_master_id
            
            # For bandwidth customers, mbps and unit_price are required
            if customer.customer_type == 'bw':
                if not data.get('mbps') or not data.get('unit_price'):
                    raise serializers.ValidationError(
                        "mbps and unit_price are required for bandwidth customers"
                    )
            
            # For channel partner, custom_percentage_share is required
            if customer.customer_type == 'channel_partner':
                if not data.get('custom_mac_percentage_share'):
                    raise serializers.ValidationError(
                        "custom_mac_percentage_share is required for channel partner customers"
                    )
        
        return data


class CustomerEntitlementMasterSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer_master_id.customer_name', read_only=True)
    customer_type = serializers.CharField(source='customer_master_id.customer_type', read_only=True)
    details = CustomerEntitlementDetailsSerializer(many=True, read_only=True)
    details_count = serializers.SerializerMethodField()
    total_entitlement_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerEntitlementMaster
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_details_count(self, obj):
        return obj.details.count()
    
    def get_total_entitlement_amount(self, obj):
        """Calculate total from all entitlement details"""
        total = Decimal('0')
        for detail in obj.details.all():
            if detail.mbps and detail.unit_price:
                total += detail.mbps * detail.unit_price
        return float(total)


# ==================== Bulk Entitlement Details Serializers ====================

class BandwidthEntitlementDetailSerializer(serializers.Serializer):
    """Serializer for creating multiple bandwidth entitlement details at once"""
    bandwidth_type = serializers.ChoiceField(choices=['ipt', 'gcc', 'cdn', 'nix', 'baishan'], help_text="Bandwidth type: ipt, gcc, cdn, nix, or baishan")
    mbps = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    package_pricing_id = serializers.IntegerField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    status = serializers.ChoiceField(choices=['active', 'inactive', 'expired'], default='active')
    remarks = serializers.CharField(required=False, allow_blank=True)


class ChannelPartnerEntitlementDetailSerializer(serializers.Serializer):
    """Serializer for creating multiple channel partner entitlement details at once"""
    mbps = serializers.DecimalField(max_digits=10, decimal_places=2)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    custom_mac_percentage_share = serializers.DecimalField(max_digits=5, decimal_places=2)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    package_pricing_id = serializers.IntegerField(required=False, allow_null=True)
    is_active = serializers.BooleanField(default=True)
    status = serializers.ChoiceField(choices=['active', 'inactive', 'expired'], default='active')
    remarks = serializers.CharField(required=False, allow_blank=True)


class BulkEntitlementDetailsCreateSerializer(serializers.Serializer):
    """Serializer for bulk creating entitlement details"""
    entitlement_master_id = serializers.IntegerField()
    bandwidth_details = BandwidthEntitlementDetailSerializer(many=True, required=False)
    channel_partner_details = ChannelPartnerEntitlementDetailSerializer(many=True, required=False)

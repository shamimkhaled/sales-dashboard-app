"""
Serializers for Bills App - Invoice Master and Details
"""
from rest_framework import serializers
from django.db import models
from django.utils import timezone
from decimal import Decimal
from .models import (
    CustomerEntitlementMaster,
    CustomerEntitlementDetails,
    InvoiceMaster,
    InvoiceDetails,
)
from apps.customers.serializers import CustomerMasterSerializer


class InvoiceDetailsSerializer(serializers.ModelSerializer):
    entitlement_type = serializers.CharField(source='entitlement_details_id.type', read_only=True)
    entitlement_mbps = serializers.DecimalField(
        source='entitlement_details_id.mbps',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    line_total = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceDetails
        fields = '__all__'
        read_only_fields = ['created_at']
    
    def get_line_total(self, obj):
        """Calculate line total with VAT and discount"""
        sub_total = obj.sub_total
        vat_amount = sub_total * (obj.vat_rate / Decimal('100'))
        discount_amount = sub_total * (obj.sub_discount_rate / Decimal('100'))
        return float(sub_total + vat_amount - discount_amount)


class InvoiceMasterSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source='customer_entitlement_master_id.customer_master_id.customer_name',
        read_only=True
    )
    customer_id = serializers.IntegerField(
        source='customer_entitlement_master_id.customer_master_id.id',
        read_only=True
    )
    bill_number = serializers.CharField(
        source='customer_entitlement_master_id.bill_number',
        read_only=True
    )
    details = InvoiceDetailsSerializer(many=True, read_only=True)
    details_count = serializers.SerializerMethodField()
    utility_info = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceMaster
        fields = '__all__'
        read_only_fields = [
            'created_at', 'updated_at', 'invoice_number',
            'total_bill_amount', 'total_paid_amount', 'total_balance_due',
            'total_vat_amount', 'total_discount_amount'
        ]
    
    def get_details_count(self, obj):
        return obj.details.count()
    
    def get_utility_info(self, obj):
        if obj.information_master_id:
            return {
                'id': obj.information_master_id.id,
                'vat_rate': float(obj.information_master_id.vat_rate),
                'terms_condition': obj.information_master_id.terms_condition,
            }
        return None
    
    def get_payment_status(self, obj):
        """Determine payment status based on amounts"""
        if obj.total_balance_due == 0:
            return 'paid'
        elif obj.total_paid_amount > 0:
            return 'partial'
        else:
            return 'unpaid'
    
    def validate(self, data):
        """Validate invoice data"""
        if 'customer_entitlement_master_id' in data:
            entitlement = data['customer_entitlement_master_id']
            # Check if invoice already exists for this entitlement (1:1 relationship)
            if self.instance is None:  # Creating new
                if InvoiceMaster.objects.filter(
                    customer_entitlement_master_id=entitlement
                ).exists():
                    raise serializers.ValidationError(
                        "Invoice already exists for this entitlement"
                    )
        return data


class InvoiceMasterCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoice with auto-calculation"""
    auto_calculate = serializers.BooleanField(default=True, write_only=True)
    
    class Meta:
        model = InvoiceMaster
        fields = '__all__'
        read_only_fields = [
            'created_at', 'updated_at', 'invoice_number',
            'total_bill_amount', 'total_paid_amount', 'total_balance_due',
            'total_vat_amount', 'total_discount_amount'
        ]
    
    def create(self, validated_data):
        auto_calculate = validated_data.pop('auto_calculate', True)
        entitlement = validated_data['customer_entitlement_master_id']
        
        # Auto-generate invoice number
        if not validated_data.get('invoice_number'):
            last_invoice = InvoiceMaster.objects.order_by('-id').first()
            next_num = (last_invoice.id + 1) if last_invoice else 1
            validated_data['invoice_number'] = f'INV{timezone.now().year}{next_num:05d}'
        
        invoice = InvoiceMaster.objects.create(**validated_data)
        
        if auto_calculate:
            # Auto-calculate totals from entitlement details
            self._calculate_invoice_totals(invoice, entitlement)
        
        # Update customer's last_bill_invoice_date
        customer = entitlement.customer_master_id
        customer.last_bill_invoice_date = timezone.now()
        customer.save(update_fields=['last_bill_invoice_date'])
        
        return invoice
    
    def _calculate_invoice_totals(self, invoice, entitlement):
        """Calculate invoice totals from entitlement details"""
        from django.utils import timezone
        from datetime import date
        
        details = entitlement.details.filter(is_active=True, status='active')
        utility = invoice.information_master_id
        
        total_subtotal = Decimal('0')
        total_vat = Decimal('0')
        total_discount = Decimal('0')
        
        # Create invoice details for each entitlement detail
        for ent_detail in details:
            # Calculate line subtotal
            if ent_detail.mbps and ent_detail.unit_price:
                line_subtotal = ent_detail.mbps * ent_detail.unit_price
            else:
                # For home packages, use package pricing rate
                if ent_detail.package_pricing_id and ent_detail.package_pricing_id.rate:
                    line_subtotal = ent_detail.package_pricing_id.rate
                else:
                    line_subtotal = Decimal('0')
            
            total_subtotal += line_subtotal
            
            # Get VAT rate from utility or default
            vat_rate = utility.vat_rate if utility else Decimal('0')
            vat_amount = line_subtotal * (vat_rate / Decimal('100'))
            total_vat += vat_amount
            
            # Discount (can be customized)
            discount_rate = Decimal('0')  # Default no discount
            discount_amount = line_subtotal * (discount_rate / Decimal('100'))
            total_discount += discount_amount
            
            # Create invoice detail
            InvoiceDetails.objects.create(
                invoice_master_id=invoice,
                entitlement_details_id=ent_detail,
                sub_total=line_subtotal,
                vat_rate=vat_rate,
                sub_discount_rate=discount_rate,
                remarks=f'Invoice detail for {ent_detail.type}'
            )
        
        # Update invoice totals
        invoice.total_bill_amount = total_subtotal + total_vat - total_discount
        invoice.total_vat_amount = total_vat
        invoice.total_discount_amount = total_discount
        invoice.total_balance_due = invoice.total_bill_amount - invoice.total_paid_amount
        invoice.save()


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


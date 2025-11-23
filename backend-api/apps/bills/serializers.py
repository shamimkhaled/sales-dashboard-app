from rest_framework import serializers
from .models import (
    BillRecord, PricingPeriod, DailyBillAmount,
    Package, MACPartner, MACEndCustomer, SOHOCustomer,
    MACBill, SOHOBill, PaymentRecord
)


class BillRecordSerializer(serializers.ModelSerializer):
    # Include customer details in the response
    customer_details = serializers.SerializerMethodField()
    customer_name = serializers.ReadOnlyField()

    class Meta:
        model = BillRecord
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'bill_number', 'customer_name']

    def get_customer_details(self, obj):
        """Return customer details"""
        if obj.customer:
            return {
                'id': obj.customer.id,
                'name': obj.customer.name,
                'company_name': obj.customer.company_name,
                'email': obj.customer.email,
                'phone': obj.customer.phone,
                'address': obj.customer.address,
                'customer_type': obj.customer.customer_type,
            }
        return None

    def validate(self, attrs):
        """Validate customer is required and compute totals"""
        # Customer is required
        if not attrs.get('customer') and not (self.instance and self.instance.customer):
            raise serializers.ValidationError({'customer': 'Customer is required'})
        
        # Compute totals from components if not explicitly provided
        def d(name):
            val = attrs.get(name, getattr(self.instance, name, 0) if self.instance else 0)
            return val or 0

        component_total = (
            d('ipt') * d('ipt_price') +
            d('fna') * d('fna_price') +
            d('ggc') * d('ggc_price') +
            d('cdn') * d('cdn_price') +
            d('nix') * d('nix_price') +
            d('baishan') * d('baishan_price')
        )
        discount = d('discount')
        total_bill = component_total - discount
        total_received = d('total_received')
        total_due = total_bill - total_received

        attrs['total_bill'] = total_bill
        attrs['total_due'] = total_due
        return attrs


class PricingPeriodSerializer(serializers.ModelSerializer):
    """Serializer for PricingPeriod model"""
    bill_record_details = serializers.SerializerMethodField()
    period_total = serializers.SerializerMethodField()
    days_in_period = serializers.SerializerMethodField()
    
    class Meta:
        model = PricingPeriod
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_bill_record_details(self, obj):
        """Return bill record basic info"""
        if obj.bill_record:
            return {
                'id': obj.bill_record.id,
                'bill_number': obj.bill_record.bill_number,
                'billing_date': obj.bill_record.billing_date,
                'customer_name': obj.bill_record.customer.name if obj.bill_record.customer else None,
            }
        return None
    
    def get_period_total(self, obj):
        """Calculate and return period total"""
        return float(obj.get_period_total())
    
    def get_days_in_period(self, obj):
        """Get number of days in period"""
        return obj.get_days_in_period()
    
    def validate(self, attrs):
        """Validate that start_day <= end_day"""
        start_day = attrs.get('start_day', self.instance.start_day if self.instance else None)
        end_day = attrs.get('end_day', self.instance.end_day if self.instance else None)
        
        if start_day and end_day and start_day > end_day:
            raise serializers.ValidationError({
                'end_day': 'End day must be greater than or equal to start day'
            })
        
        return attrs


class DailyBillAmountSerializer(serializers.ModelSerializer):
    """Serializer for DailyBillAmount model"""
    bill_record_details = serializers.SerializerMethodField()
    pricing_period_details = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyBillAmount
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_bill_record_details(self, obj):
        """Return bill record basic info"""
        if obj.bill_record:
            return {
                'id': obj.bill_record.id,
                'bill_number': obj.bill_record.bill_number,
                'billing_date': obj.bill_record.billing_date,
                'customer_name': obj.bill_record.customer.name if obj.bill_record.customer else None,
            }
        return None
    
    def get_pricing_period_details(self, obj):
        """Return pricing period basic info"""
        if obj.pricing_period:
            return {
                'id': obj.pricing_period.id,
                'start_day': obj.pricing_period.start_day,
                'end_day': obj.pricing_period.end_day,
            }
        return None


class DailyBillAmountListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing daily amounts"""
    pricing_period_info = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyBillAmount
        fields = [
            'id', 'date', 'day_number', 'daily_amount',
            'ipt', 'fna', 'ggc', 'cdn', 'nix', 'baishan',
            'pricing_period_info', 'service_breakdown',
            'is_calculated', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_pricing_period_info(self, obj):
        """Return pricing period basic info"""
        if obj.pricing_period:
            return {
                'id': obj.pricing_period.id,
                'start_day': obj.pricing_period.start_day,
                'end_day': obj.pricing_period.end_day,
            }
        return None


# ============================================================================
# MAC / SOHO Billing Serializers
# ============================================================================

class PackageSerializer(serializers.ModelSerializer):
    """Serializer for Package model"""
    
    class Meta:
        model = Package
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class MACPartnerSerializer(serializers.ModelSerializer):
    """Serializer for MAC Partner model"""
    total_client = serializers.ReadOnlyField()
    
    class Meta:
        model = MACPartner
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'total_client', 'mac_partner_number']


class MACEndCustomerSerializer(serializers.ModelSerializer):
    """Serializer for MAC End Customer model"""
    mac_partner_name = serializers.CharField(source='mac_partner.mac_cust_name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)
    effective_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = MACEndCustomer
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'effective_rate', 'mac_end_customer_number']


class MACEndCustomerListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing MAC end customers"""
    mac_partner_name = serializers.CharField(source='mac_partner.mac_cust_name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)
    effective_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = MACEndCustomer
        fields = [
            'id', 'name', 'mac_partner', 'mac_partner_name',
            'package', 'package_name', 'custom_rate', 'effective_rate',
            'activation_date', 'status', 'email', 'phone', 'mac_end_customer_number'
        ]


class MACBillSerializer(serializers.ModelSerializer):
    """Serializer for MAC Bill model"""
    mac_partner_name = serializers.CharField(source='mac_partner.mac_cust_name', read_only=True)
    
    class Meta:
        model = MACBill
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'total_client', 'total_revenue', 'commission', 'total_bill', 'total_due', 'status']


class MACBillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating MAC Bill (auto-calculates values)"""
    
    class Meta:
        model = MACBill
        fields = ['mac_partner', 'bill_date', 'notes']
    
    def create(self, validated_data):
        from .utils import generate_mac_bill
        mac_partner = validated_data['mac_partner']
        bill_date = validated_data['bill_date']
        notes = validated_data.get('notes', '')
        
        return generate_mac_bill(mac_partner, bill_date, notes)


class SOHOCustomerSerializer(serializers.ModelSerializer):
    """Serializer for SOHO Customer model"""
    package_name = serializers.CharField(source='package.name', read_only=True)
    
    class Meta:
        model = SOHOCustomer
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'soho_customer_number']


class SOHOBillSerializer(serializers.ModelSerializer):
    """Serializer for SOHO Bill model"""
    soho_customer_name = serializers.CharField(source='soho_customer.cust_name', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)
    
    class Meta:
        model = SOHOBill
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'total_due', 'status']


class PaymentRecordSerializer(serializers.ModelSerializer):
    """Serializer for Payment Record model"""
    mac_bill_info = serializers.SerializerMethodField()
    soho_bill_info = serializers.SerializerMethodField()
    bill_record_info = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = PaymentRecord
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def get_mac_bill_info(self, obj):
        """Return MAC bill basic info"""
        if obj.mac_bill:
            return {
                'id': obj.mac_bill.id,
                'bill_date': obj.mac_bill.bill_date,
                'mac_partner_name': obj.mac_bill.mac_partner.mac_cust_name,
                'total_bill': float(obj.mac_bill.total_bill),
            }
        return None
    
    def get_soho_bill_info(self, obj):
        """Return SOHO bill basic info"""
        if obj.soho_bill:
            return {
                'id': obj.soho_bill.id,
                'bill_date': obj.soho_bill.bill_date,
                'customer_name': obj.soho_bill.soho_customer.cust_name,
                'total_bill': float(obj.soho_bill.total_bill),
            }
        return None
    
    def get_bill_record_info(self, obj):
        """Return BillRecord basic info"""
        if obj.bill_record:
            return {
                'id': obj.bill_record.id,
                'bill_number': obj.bill_record.bill_number,
                'billing_date': obj.bill_record.billing_date,
                'customer_name': obj.bill_record.customer.name if obj.bill_record.customer else None,
                'total_bill': float(obj.bill_record.total_bill),
            }
        return None
    
    def create(self, validated_data):
        """Set created_by from request user"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


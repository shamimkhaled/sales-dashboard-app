from rest_framework import serializers
from .models import BillRecord, PricingPeriod, DailyBillAmount


class BillRecordSerializer(serializers.ModelSerializer):
    # Include customer details in the response
    customer_details = serializers.SerializerMethodField()
    # Dynamic status based on customer status
    status = serializers.SerializerMethodField()

    class Meta:
        model = BillRecord
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'bill_number']

    def get_customer_details(self, obj):
        """Return customer details including name and company info"""
        if obj.customer:
            return {
                'id': obj.customer.id,
                'name': obj.customer.name,
                'company_name': obj.customer.company_name,
                'email': obj.customer.email,
                'phone': obj.customer.phone,
                'address': obj.customer.address,
            }
        return None

    def get_status(self, obj):
        """Return status based on customer's status"""
        if obj.customer:
            return obj.customer.status
        return 'Inactive'  # Default if no customer

    def validate(self, attrs):
        # Compute totals from components if not explicitly provided
        def d(name):
            val = attrs.get(name, getattr(self.instance, name, 0) if self.instance else 0)
            return val or 0

        component_total = (
            d('iig_qt') * d('iig_qt_price') +
            d('fna') * d('fna_price') +
            d('ggc') * d('ggc_price') +
            d('cdn') * d('cdn_price') +
            d('bdix') * d('bdix_price') +
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
            'iig_qt', 'fna', 'ggc', 'cdn', 'bdix', 'baishan',
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


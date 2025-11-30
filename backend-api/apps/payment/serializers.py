"""
Serializers for Payment App
"""
from rest_framework import serializers
from django.db import models
from django.db.models import Sum
from decimal import Decimal
from .models import PaymentMaster, PaymentDetails


class PaymentDetailsSerializer(serializers.ModelSerializer):
    payment_method = serializers.CharField(source='payment_master_id.payment_method', read_only=True)
    payment_date = serializers.DateField(source='payment_master_id.payment_date', read_only=True)
    
    class Meta:
        model = PaymentDetails
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class PaymentMasterSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(
        source='customer_entitlement_master_id.customer_master_id.customer_name',
        read_only=True
    )
    customer_id = serializers.IntegerField(
        source='customer_entitlement_master_id.customer_master_id.id',
        read_only=True
    )
    invoice_number = serializers.CharField(
        source='invoice_master_id.invoice_number',
        read_only=True
    )
    invoice_amount = serializers.DecimalField(
        source='invoice_master_id.total_bill_amount',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    invoice_balance = serializers.DecimalField(
        source='invoice_master_id.total_balance_due',
        max_digits=12,
        decimal_places=2,
        read_only=True
    )
    details = PaymentDetailsSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    details_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentMaster
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_paid(self, obj):
        """Calculate total paid from all payment details"""
        total = obj.details.aggregate(total=Sum('pay_amount'))['total']
        return float(total) if total else 0.0
    
    def get_details_count(self, obj):
        return obj.details.count()
    
    def validate(self, data):
        """Validate payment data"""
        if 'invoice_master_id' in data and 'customer_entitlement_master_id' in data:
            invoice = data['invoice_master_id']
            entitlement = data['customer_entitlement_master_id']
            
            # Verify invoice belongs to entitlement
            if invoice.customer_entitlement_master_id != entitlement:
                raise serializers.ValidationError(
                    "Invoice does not belong to the specified entitlement"
                )
        
        return data
    
    def create(self, validated_data):
        payment = PaymentMaster.objects.create(**validated_data)
        # Update invoice paid amount
        self._update_invoice_payment(payment)
        return payment
    
    def update(self, instance, validated_data):
        payment = super().update(instance, validated_data)
        # Update invoice paid amount
        self._update_invoice_payment(payment)
        return payment
    
    def _update_invoice_payment(self, payment):
        """Update invoice paid amount and status"""
        invoice = payment.invoice_master_id
        # Calculate total paid from all payments for this invoice
        total_paid = PaymentMaster.objects.filter(
            invoice_master_id=invoice
        ).aggregate(total=Sum('details__pay_amount'))['total'] or Decimal('0')
        
        invoice.total_paid_amount = total_paid
        invoice.total_balance_due = invoice.total_bill_amount - total_paid
        
        # Update invoice status
        if invoice.total_balance_due == 0:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'partial'
        else:
            invoice.status = 'unpaid'
        
        invoice.save(update_fields=[
            'total_paid_amount', 'total_balance_due', 'status'
        ])


class PaymentDetailsCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payment details"""
    
    class Meta:
        model = PaymentDetails
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
    
    def create(self, validated_data):
        detail = PaymentDetails.objects.create(**validated_data)
        # Update payment master and invoice
        payment = detail.payment_master_id
        invoice = payment.invoice_master_id
        
        # Recalculate payment totals
        total_paid = payment.details.aggregate(total=Sum('pay_amount'))['total'] or Decimal('0')
        
        # Update invoice
        invoice.total_paid_amount = total_paid
        invoice.total_balance_due = invoice.total_bill_amount - total_paid
        
        if invoice.total_balance_due == 0:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'partial'
        
        invoice.save(update_fields=[
            'total_paid_amount', 'total_balance_due', 'status'
        ])
        
        return detail


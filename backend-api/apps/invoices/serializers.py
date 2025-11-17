from rest_framework import serializers
from .models import Invoice, InvoiceItem
from apps.bills.serializers import BillRecordSerializer


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = '__all__'
        read_only_fields = ['line_total']


class InvoiceSerializer(serializers.ModelSerializer):
    """Main invoice serializer with nested items and bill details"""
    items = InvoiceItemSerializer(many=True, read_only=True)
    bill_details = serializers.SerializerMethodField()
    customer_details = serializers.SerializerMethodField()
    customer_display_id = serializers.ReadOnlyField(help_text="Computed customer ID for invoice format display")
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = [
            'invoice_number',
            'created_at',
            'updated_at',
            'balance_due',
            'created_by',
            'customer_display_id'
        ]
    
    def get_bill_details(self, obj):
        """Get bill record details"""
        if obj.bill_record:
            return {
                'id': obj.bill_record.id,
                'billing_date': obj.bill_record.billing_date,
                'total_bill': float(obj.bill_record.total_bill),
                'total_received': float(obj.bill_record.total_received),
                'total_due': float(obj.bill_record.total_due),
                'status': obj.bill_record.status,
            }
        return None
    
    def get_customer_details(self, obj):
        """Get customer details from bill record (Invoice is based on BillRecord which belongs to Customer)"""
        if obj.bill_record and obj.bill_record.customer:
            customer = obj.bill_record.customer
            return {
                'id': customer.id,
                'name': customer.name,
                'company_name': customer.company_name,
                'email': customer.email,
                'phone': customer.phone,
                'address': customer.address,
                'link_id': customer.link_id,
                'status': customer.status,
            }
        return None
    
    def get_is_overdue(self, obj):
        """Check if invoice is overdue"""
        return obj.is_overdue


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invoices from bills"""
    bill_record_id = serializers.IntegerField(write_only=True)
    invoice_format = serializers.ChoiceField(
        choices=Invoice.INVOICE_FORMAT_CHOICES,
        default='ITS'
    )
    auto_populate_items = serializers.BooleanField(default=True, write_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'bill_record_id',
            'invoice_format',
            'issue_date',
            'due_date',
            'notes',
            'terms',
            'auto_populate_items',
            'tax_amount',
            'discount_amount',
        ]
    
    def validate_bill_record_id(self, value):
        """Validate that bill record exists and doesn't already have an invoice"""
        from apps.bills.models import BillRecord
        try:
            bill_record = BillRecord.objects.get(pk=value)
        except BillRecord.DoesNotExist:
            raise serializers.ValidationError("Bill record not found")
        
        # Check if invoice already exists
        if hasattr(bill_record, 'invoice'):
            raise serializers.ValidationError("This bill record already has an invoice")
        
        return value
    
    def create(self, validated_data):
        """Create invoice from bill record"""
        from apps.bills.models import BillRecord
        from apps.invoices.utils import create_invoice_from_bill
        
        bill_record_id = validated_data.pop('bill_record_id')
        auto_populate = validated_data.pop('auto_populate_items', True)
        invoice_format = validated_data.pop('invoice_format', 'ITS')
        
        bill_record = BillRecord.objects.get(pk=bill_record_id)
        
        # Get user from context
        created_by = self.context.get('request').user if self.context.get('request') else None
        
        # Create invoice using utility function
        invoice = create_invoice_from_bill(
            bill_record=bill_record,
            invoice_format=invoice_format,
            auto_populate_items=auto_populate,
            created_by=created_by,
            **validated_data
        )
        
        return invoice


class InvoiceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating invoices"""
    items = InvoiceItemSerializer(many=True, required=False)
    
    class Meta:
        model = Invoice
        fields = [
            'invoice_format',
            'issue_date',
            'due_date',
            'status',
            'subtotal',
            'tax_amount',
            'discount_amount',
            'total_amount',
            'paid_amount',
            'notes',
            'terms',
            'items',
        ]
        read_only_fields = ['invoice_number']
    
    def update(self, instance, validated_data):
        """Update invoice and items"""
        items_data = validated_data.pop('items', None)
        
        # Update invoice fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            
            # Create new items
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)
            
            # Recalculate totals
            instance.subtotal = sum(item.line_total for item in instance.items.all())
            instance.total_amount = instance.subtotal + instance.tax_amount - instance.discount_amount
            instance.save()
        
        return instance


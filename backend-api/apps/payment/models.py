from django.db import models
from django.conf import settings


class PaymentMaster(models.Model):
    """Payment Master - Main payment record"""
    
   

    id = models.AutoField(primary_key=True)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=50, help_text="e.g., Credit Card, Bank Transfer, Cash")
    customer_entitlement_master_id = models.ForeignKey(
        'bills.CustomerEntitlementMaster',
        on_delete=models.CASCADE,
        db_column='customer_entitlement_master_id',
        related_name='payments'
    )
    invoice_master_id = models.ForeignKey(
        'bills.InvoiceMaster',
        on_delete=models.CASCADE,
        db_column='invoice_master_id',
        related_name='payments'
    )
    remarks = models.TextField(blank=True)
    status = models.CharField(max_length=20,  default='pending')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='received_by',
        related_name='received_payments'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        db_column='created_by',
        related_name='created_payments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_master'
        ordering = ['-payment_date']

    def __str__(self):
        return f"Payment #{self.id} - {self.payment_date} - {self.payment_method}"


class PaymentDetails(models.Model):
    """Payment Details - Individual payment transactions"""
 

    id = models.AutoField(primary_key=True)
    payment_master_id = models.ForeignKey(
        PaymentMaster,
        on_delete=models.CASCADE,
        db_column='payment_master_id',
        related_name='details'
    )
    pay_amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_id = models.CharField(max_length=200, blank=True)
    remarks = models.TextField(blank=True)
    status = models.CharField(max_length=20,   default='pending')
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='received_by',
        related_name='received_payment_details'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        db_column='created_by',
        related_name='created_payment_details'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_details'
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment Detail #{self.id} - {self.pay_amount}"


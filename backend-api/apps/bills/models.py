from django.db import models
from django.conf import settings
from apps.customers.models import CustomerMaster
from apps.bills.utils import generate_bill_number


class CustomerEntitlementMaster(models.Model):
    """Customer Entitlement Master - Main billing record for a customer"""
    id = models.AutoField(primary_key=True)
    customer_master_id = models.ForeignKey(
        CustomerMaster, 
        on_delete=models.CASCADE, 
        db_column='customer_master_id',
        related_name='entitlements'
    )
    bill_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    activation_date = models.DateField(null=True, blank=True)
    nttn_company = models.CharField(max_length=200, blank=True, null=True)
    nttn_capacity = models.CharField(max_length=100, blank=True, null=True)
    link_id = models.CharField(max_length=100, blank=True, null=True)
    nttn_uses = models.CharField(max_length=100, blank=True, null=True)
    total_bill = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    type_of_bw = models.CharField(max_length=50, blank=True, null=True, help_text="Home only")
    type_of_connection = models.CharField(max_length=50, blank=True, null=True, help_text="Home only")
    connected_pop = models.CharField(max_length=100, blank=True, null=True, help_text="Home only")
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_entitlements'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_entitlements'
    )

    class Meta:
        db_table = 'customer_entitlement_master'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.bill_number} - {self.customer_master_id.customer_name}"
    

    def save(self, *args, **kwargs):
        if not self.bill_number:
            self.bill_number = generate_bill_number(self.customer_master_id.customer_name, self.pk)
        super().save(*args, **kwargs)
        # Regenerate if still None (after first save to get pk)
        if not self.bill_number:
            self.bill_number = generate_bill_number(self.customer_master_id.customer_name, self.pk)
            self.save(update_fields=['bill_number'])


class CustomerEntitlementDetails(models.Model):
    """Customer Entitlement Details - Detailed entitlement information"""
    TYPE_CHOICES = [
        ('bw', 'Bandwidth'),
        ('channel_partner', 'Channel Partner'),
        ('soho', 'SOHO/Home'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('expired', 'Expired'),
    ]

    id = models.AutoField(primary_key=True)
    cust_entitlement_id = models.ForeignKey(
        CustomerEntitlementMaster,
        on_delete=models.CASCADE,
        db_column='cust_entitlement_id',
        related_name='details'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    package_pricing_id = models.ForeignKey(
        'package.PackagePricing',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='package_pricing_id',
        related_name='entitlement_details'
    )
    mbps = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Only MAC & BW")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text="Only MAC & BW - BW bandwidth prices (ipt,gcc,cdn,nix,baishan) stored here")
    custom_mac_percentage_share = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="MAC only")
    last_changes_updated_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True, help_text="Additional remarks or notes (e.g., bandwidth type for BW customers)")
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_entitlement_details')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_entitlement_details')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_entitlement_details'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.cust_entitlement_id.bill_number} - {self.type} ({self.start_date} to {self.end_date})"


class InvoiceMaster(models.Model):
    """Invoice Master - 1:1 relationship with Customer Entitlement Master"""
 

    id = models.AutoField(primary_key=True)
    invoice_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    customer_entitlement_master_id = models.OneToOneField(
        CustomerEntitlementMaster,
        on_delete=models.CASCADE,
        db_column='customer_entitlement_master_id',
        related_name='invoice',
        unique=True
    )
    
    issue_date = models.DateField()
    total_bill_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Auto calculated")
    total_paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Auto calculated")
    total_balance_due = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Auto calculated")
    total_vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Auto calculated")
    total_discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Auto calculated")
    remarks = models.TextField(blank=True)
    information_master_id = models.ForeignKey(
        'utility.UtilityInformationMaster',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='information_master_id',
        related_name='invoices'
    )
    status = models.CharField(max_length=20, blank=True, null=True, default='draft')

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_invoices')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_invoices')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = generate_bill_number(
                self.customer_entitlement_master_id.customer_master_id.customer_name,
                self.pk,
                prefix='INV'
            )
        super().save(*args, **kwargs)
        # Regenerate if still None (after first save to get pk)
        if not self.invoice_number:
            self.invoice_number = generate_bill_number(
                self.customer_entitlement_master_id.customer_master_id.customer_name,
                self.pk,
                prefix='INV'
            )
            self.save(update_fields=['invoice_number'])

    class Meta:
        db_table = 'invoice_master'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_entitlement_master_id.customer_master_id.customer_name}"


class InvoiceDetails(models.Model):
    """Invoice Details - Line items for an invoice"""
   
    id = models.AutoField(primary_key=True)
    invoice_master_id = models.ForeignKey(
        InvoiceMaster,
        on_delete=models.CASCADE,
        db_column='invoice_master_id',
        related_name='details'
    )
    entitlement_details_id = models.ForeignKey(
        CustomerEntitlementDetails,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='entitlement_details_id',
        related_name='invoice_details'
    )
    sub_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    sub_discount_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True)
    
    class Meta:
        db_table = 'invoice_details'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_master_id.invoice_number} - Detail #{self.id}"


from django.db import models
from apps.customers.models import Customer
from .utils import generate_bill_number


class BillRecord(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bill_records')
    bill_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text='Auto-generated bill number: KTL-BL-{5 chars customer name}-{bill id}-{DDMMYYYY}'
    )
    nttn_cap = models.CharField(max_length=100, blank=True)
    nttn_com = models.CharField(max_length=100, blank=True)
    active_date = models.DateField(null=True, blank=True)
    billing_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)

    iig_qt = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    iig_qt_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fna = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fna_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ggc = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ggc_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cdn = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cdn_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bdix = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bdix_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    baishan = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    baishan_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    total_bill = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_received = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active', db_index=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bill_records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['bill_number']),
        ]

    def save(self, *args, **kwargs):
        """Auto-generate bill_number on creation if not provided"""
        if not self.bill_number and self.customer:
            # Use company_name if available, otherwise use name
            customer_name = self.customer.company_name or self.customer.name
            # Generate bill number (will use self.id after save, so we'll update it)
            if self.pk is None:
                # First save to get the ID
                super().save(*args, **kwargs)
                # Now generate with the ID
                self.bill_number = generate_bill_number(
                    customer_name=customer_name,
                    bill_id=self.id,
                    billing_date=self.billing_date
                )
                # Save again with the bill_number
                super().save(update_fields=['bill_number'])
            else:
                # If updating and bill_number is missing, generate it
                self.bill_number = generate_bill_number(
                    customer_name=customer_name,
                    bill_id=self.id,
                    billing_date=self.billing_date
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return f"BillRecord #{self.id} - {self.bill_number or 'No Number'} - Customer {self.customer_id}"



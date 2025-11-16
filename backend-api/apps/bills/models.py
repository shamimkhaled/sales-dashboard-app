from django.db import models
from apps.customers.models import Customer


class BillRecord(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bill_records')
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

    def __str__(self):
        return f"BillRecord #{self.id} - Customer {self.customer_id}"



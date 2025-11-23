from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from django.conf import settings


class Prospect(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('lost', 'Lost'),
    )

    name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(r'^\+?[0-9\-\s]{7,20}$', 'Invalid phone number')]
    )
    address = models.TextField(blank=True)
    potential_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    contact_person = models.CharField(max_length=255, blank=True)
    source = models.CharField(max_length=50, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', db_index=True)
    sales_person = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='prospects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_prospects'
        ordering = ['-created_at']

    def __str__(self):
        return self.name



class ProspectStatusHistory(models.Model):
    prospect = models.ForeignKey(Prospect, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'sales_prospect_status_history'
        ordering = ['-changed_at']


class ProspectFollowUp(models.Model):
    prospect = models.ForeignKey(Prospect, on_delete=models.CASCADE, related_name='follow_ups')
    follow_up_date = models.DateField()
    notes = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sales_prospect_followups'
        ordering = ['-follow_up_date']


class ProspectAttachment(models.Model):
    prospect = models.ForeignKey(Prospect, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='prospect_attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'sales_prospect_attachments'


class Customer(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Lost', 'Lost'),
    )
    
    CUSTOMER_TYPE_CHOICES = (
        ('Bandwidth', 'Bandwidth/Reseller Customer'),
        ('MAC', 'MAC Partner/Channel Partner/Franchise'),
        ('SOHO', 'SOHO/Home Customer'),
    )

    name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(
        max_length=20,
        validators=[RegexValidator(r'^\+?[0-9\-\s]{7,20}$', 'Invalid phone number')]
    )
    address = models.TextField(blank=True)
    customer_type = models.CharField(
        max_length=20,
        choices=CUSTOMER_TYPE_CHOICES,
        default='Bandwidth',
        db_index=True,
        help_text='Type of customer: Bandwidth/Reseller, MAC Partner, or SOHO'
    )
    assigned_sales_person = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    link_id = models.CharField(max_length=100, unique=True, null=True, blank=True, default=None)
    customer_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text='Auto-generated customer number: KTL-{8 chars customer name}-{customer id}'
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def calculated_monthly_revenue(self):
        from apps.bills.models import BillRecord
        return BillRecord.objects.filter(customer=self).aggregate(total=models.Sum('total_bill'))['total'] or 0

    class Meta:
        db_table = 'sales_customers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['customer_number']),
            models.Index(fields=['customer_type', 'status']),
        ]

    def save(self, *args, **kwargs):
        """Auto-generate customer_number on creation if not provided"""
        if not self.customer_number:
            from .utils import generate_customer_number
            # Use company_name if available, otherwise use name
            customer_name = self.company_name or self.name
            # Generate customer number (will use self.id after save, so we'll update it)
            if self.pk is None:
                # First save to get the ID
                super().save(*args, **kwargs)
                # Now generate with the ID
                self.customer_number = generate_customer_number(
                    customer_name=customer_name,
                    customer_id=self.id
                )
                # Save again with the customer_number
                super().save(update_fields=['customer_number'])
            else:
                # If updating and customer_number is missing, generate it
                self.customer_number = generate_customer_number(
                    customer_name=customer_name,
                    customer_id=self.id
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return self.name



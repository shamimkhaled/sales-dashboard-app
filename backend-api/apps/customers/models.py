from django.db import models
from django.core.validators import RegexValidator, MinValueValidator
from django.utils import timezone
from django.conf import settings
from apps.customers.utils import generate_customer_number
import re




class KAMMaster(models.Model):
    id = models.AutoField(primary_key=True)
    kam_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'kam_master'

    def __str__(self):
        return self.kam_name


class CustomerMaster(models.Model):
    CUSTOMER_TYPE_CHOICES = [
        ('bw', 'Bandwidth'),
        ('channel_partner', 'Channel Partner'),
        ('soho', 'SOHO/Home'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
    ]

    id = models.AutoField(primary_key=True)
    customer_name = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200, blank=True, null=True, help_text="Company reference ")
    email = models.EmailField(unique=True)
    phone = models.CharField(
            max_length=20,
            blank=True,
            validators=[RegexValidator(r'^\+?[0-9\-\s]{7,20}$', 'Invalid phone number')]
        )
    address = models.TextField()
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES)
    kam_id = models.ForeignKey(KAMMaster, on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    customer_number = models.CharField(max_length=50, unique=True, blank=True, help_text="Auto-generated")
    total_client = models.IntegerField(default=0, help_text="MAC only")
    total_active_client = models.IntegerField(default=0, help_text="MAC only")
    previous_total_client = models.IntegerField(default=0, help_text="MAC only")
    free_giveaway_client = models.IntegerField(default=0, help_text="MAC only")
    default_percentage_share = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="MAC only")
    contact_person = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    last_bill_invoice_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_customers', help_text="Auto-set to current user")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_customers', help_text="Auto-set to current user")

    class Meta:
        db_table = 'customer_master'

    def __str__(self):
        return self.customer_name
    

    def save(self, *args, **kwargs):
        # Get the current user from the request context if available
        request = kwargs.pop('request', None)
        if request and request.user.is_authenticated:
            # Set created_by on first creation
            if not self.pk:
                self.created_by = request.user
            # Always update updated_by
            self.updated_by = request.user
        
        # First save to get the pk if it's a new record
        super().save(*args, **kwargs)
        
        # Generate customer number after first save (so we have pk)
        if not self.customer_number and self.pk:
            self.customer_number = generate_customer_number(self.customer_name, self.pk)
            # Only save the customer_number field if it was just generated
            super().save(update_fields=['customer_number'], *args, **kwargs)







class Prospect(models.Model):
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
    status = models.CharField(max_length=50, default='', db_index=True, blank=True, help_text='Status managed by frontend (e.g., new, contacted, qualified, lost)')
    kam = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='prospects', help_text='Key Account Manager (KAM) assigned to this prospect')
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







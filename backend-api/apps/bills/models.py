from django.db import models
from django.db.models.signals import post_delete
from django.db.models import Sum
from django.dispatch import receiver
from django.conf import settings
from apps.customers.models import Customer
from .utils import generate_bill_number, calculate_bill_record_total_from_periods


class BillRecord(models.Model):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    )
    
    CUSTOMER_TYPE_CHOICES = (
        ('Bandwidth', 'Bandwidth/Reseller Customer'),
        ('MAC', 'MAC Partner/Channel Partner/Franchise'),
        ('SOHO', 'SOHO/Home Customer'),
    )

    # Customer type and references (one of these will be set based on customer_type)
    customer_type = models.CharField(
        max_length=20,
        choices=CUSTOMER_TYPE_CHOICES,
        default='Bandwidth',
        db_index=True,
        help_text='Type of customer this bill is for'
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='bill_records',
        null=True,
        blank=True,
        help_text='Bandwidth/Reseller customer (if customer_type is Bandwidth)'
    )
    mac_partner = models.ForeignKey(
        'MACPartner',
        on_delete=models.CASCADE,
        related_name='bill_records',
        null=True,
        blank=True,
        help_text='MAC Partner (if customer_type is MAC)'
    )
    soho_customer = models.ForeignKey(
        'SOHOCustomer',
        on_delete=models.CASCADE,
        related_name='bill_records',
        null=True,
        blank=True,
        help_text='SOHO Customer (if customer_type is SOHO)'
    )
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
    
    # Payment tracking fields (for existing BillRecord system)
    last_payment_date = models.DateField(null=True, blank=True, help_text='Date of last payment received', db_index=True)
    last_payment_mode = models.CharField(
        max_length=50,
        blank=True,
        help_text='Payment mode of last payment (Cash, Bank Transfer, etc.)'
    )

    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active', db_index=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bill_records'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['bill_number']),
            models.Index(fields=['customer_type', 'status']),
            models.Index(fields=['customer']),
            models.Index(fields=['mac_partner']),
            models.Index(fields=['soho_customer']),
        ]

    def save(self, *args, **kwargs):
        """Auto-generate bill_number on creation if not provided"""
        self.clean()
        
        # Get customer name based on customer_type
        customer_name = None
        if self.customer_type == 'Bandwidth' and self.customer:
            customer_name = self.customer.company_name or self.customer.name
        elif self.customer_type == 'MAC' and self.mac_partner:
            customer_name = self.mac_partner.mac_cust_name
        elif self.customer_type == 'SOHO' and self.soho_customer:
            customer_name = self.soho_customer.cust_name
        
        if not self.bill_number and customer_name:
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
        customer_ref = None
        if self.customer_type == 'Bandwidth' and self.customer:
            customer_ref = f"Customer {self.customer_id}"
        elif self.customer_type == 'MAC' and self.mac_partner:
            customer_ref = f"MAC Partner {self.mac_partner_id}"
        elif self.customer_type == 'SOHO' and self.soho_customer:
            customer_ref = f"SOHO Customer {self.soho_customer_id}"
        return f"BillRecord #{self.id} - {self.bill_number or 'No Number'} - {customer_ref or 'Unknown'}"





class PricingPeriod(models.Model):
    """
    Stores pricing periods for a BillRecord when prices and usage change during the billing period.
    Example: Days 1-10 have one set of usage/quantities and prices, days 11-31 have different values.
    """
    bill_record = models.ForeignKey(
        BillRecord,
        on_delete=models.CASCADE,
        related_name='pricing_periods',
        help_text='The bill record this pricing period belongs to'
    )
    
    # Period definition (day numbers within the billing month)
    start_day = models.IntegerField(
        help_text='Start day of the period (1-31)'
    )
    end_day = models.IntegerField(
        help_text='End day of the period (1-31)'
    )
    
    # Usage/Quantity amounts for each service component in this period
    iig_qt = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='IIG QT usage/quantity for this period')
    fna = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='FNA usage/quantity for this period')
    ggc = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='GGC usage/quantity for this period')
    cdn = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='CDN usage/quantity for this period')
    bdix = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='BDIX usage/quantity for this period')
    baishan = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Baishan usage/quantity for this period')
    
    # Pricing for each service component (can be different from BillRecord prices)
    iig_qt_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='IIG QT price per unit for this period')
    fna_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='FNA price per unit for this period')
    ggc_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='GGC price per unit for this period')
    cdn_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='CDN price per unit for this period')
    bdix_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='BDIX price per unit for this period')
    baishan_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text='Baishan price per unit for this period')
    
    # Optional: Period-specific discount
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Metadata
    notes = models.TextField(blank=True, help_text='Notes about this pricing period')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bill_pricing_periods'
        ordering = ['bill_record', 'start_day']
        indexes = [
            models.Index(fields=['bill_record', 'start_day']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_day__gte=1) & models.Q(start_day__lte=31),
                name='valid_start_day'
            ),
            models.CheckConstraint(
                check=models.Q(end_day__gte=1) & models.Q(end_day__lte=31),
                name='valid_end_day'
            ),
        ]
    
    def __str__(self):
        return f"PricingPeriod: Bill #{self.bill_record_id} - Days {self.start_day}-{self.end_day}"
    
    def clean(self):
        """Validate that start_day <= end_day"""
        from django.core.exceptions import ValidationError
        if self.start_day > self.end_day:
            raise ValidationError('start_day must be less than or equal to end_day')
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        # Update BillRecord total_bill when pricing period is saved
        self._update_bill_record_total()
    
    def _update_bill_record_total(self):
        """Update BillRecord with values from this pricing period"""
        from .utils import update_bill_record_from_period
        update_bill_record_from_period(self.bill_record, self)
    
    def get_period_total(self):
        """Calculate total amount for this pricing period"""
        total = (
            self.iig_qt * self.iig_qt_price +
            self.fna * self.fna_price +
            self.ggc * self.ggc_price +
            self.cdn * self.cdn_price +
            self.bdix * self.bdix_price +
            self.baishan * self.baishan_price
        ) - self.discount
        return total
    
    def get_days_in_period(self):
        """Get number of days in this period"""
        return self.end_day - self.start_day + 1


class DailyBillAmount(models.Model):
    """
    Stores calculated daily bill amounts for each day in the billing period.
    This allows tracking revenue on a daily basis and handling price changes mid-month.
    """
    bill_record = models.ForeignKey(
        BillRecord,
        on_delete=models.CASCADE,
        related_name='daily_amounts',
        help_text='The bill record this daily amount belongs to'
    )
    
    pricing_period = models.ForeignKey(
        PricingPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_amounts',
        help_text='The pricing period used for this day'
    )
    
    # Date information
    date = models.DateField(
        db_index=True,
        help_text='The specific date for this daily amount'
    )
    day_number = models.IntegerField(
        help_text='Day number within the billing period (1-31)'
    )
    
    # Usage amounts (from BillRecord, but can be overridden per day if needed)
    iig_qt = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fna = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ggc = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cdn = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bdix = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    baishan = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Calculated daily amount
    daily_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total bill amount for this specific day'
    )
    
    # Breakdown of daily amount by service (stored as JSON for flexibility)
    service_breakdown = models.JSONField(
        default=dict,
        blank=True,
        help_text='Breakdown of daily amount by service component'
    )
    
    # Metadata
    is_calculated = models.BooleanField(
        default=True,
        help_text='Whether this amount was auto-calculated or manually entered'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bill_daily_amounts'
        ordering = ['bill_record', 'date']
        unique_together = [['bill_record', 'date']]
        indexes = [
            models.Index(fields=['bill_record', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['bill_record', 'day_number']),
        ]
    
    def __str__(self):
        return f"DailyBillAmount: Bill #{self.bill_record_id} - {self.date} - {self.daily_amount}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate daily_amount if not provided"""
        if not self.daily_amount or self.is_calculated:
            self._calculate_daily_amount()
        super().save(*args, **kwargs)
    
    def _calculate_daily_amount(self):
        """Calculate daily amount based on usage and pricing period prices/quantities"""
        if not self.pricing_period:
            # If no pricing period, use BillRecord usage and prices
            bill = self.bill_record
            # Use daily amount's usage if set, otherwise use bill's usage
            iig_qt = self.iig_qt if self.iig_qt > 0 else bill.iig_qt or 0
            fna = self.fna if self.fna > 0 else bill.fna or 0
            ggc = self.ggc if self.ggc > 0 else bill.ggc or 0
            cdn = self.cdn if self.cdn > 0 else bill.cdn or 0
            bdix = self.bdix if self.bdix > 0 else bill.bdix or 0
            baishan = self.baishan if self.baishan > 0 else bill.baishan or 0
            
            daily_amount = (
                iig_qt * bill.iig_qt_price +
                fna * bill.fna_price +
                ggc * bill.ggc_price +
                cdn * bill.cdn_price +
                bdix * bill.bdix_price +
                baishan * bill.baishan_price
            )
            
            # Store breakdown
            self.service_breakdown = {
                'iig_qt': {
                    'usage': float(iig_qt),
                    'price': float(bill.iig_qt_price),
                    'amount': float(iig_qt * bill.iig_qt_price)
                },
                'fna': {
                    'usage': float(fna),
                    'price': float(bill.fna_price),
                    'amount': float(fna * bill.fna_price)
                },
                'ggc': {
                    'usage': float(ggc),
                    'price': float(bill.ggc_price),
                    'amount': float(ggc * bill.ggc_price)
                },
                'cdn': {
                    'usage': float(cdn),
                    'price': float(bill.cdn_price),
                    'amount': float(cdn * bill.cdn_price)
                },
                'bdix': {
                    'usage': float(bdix),
                    'price': float(bill.bdix_price),
                    'amount': float(bdix * bill.bdix_price)
                },
                'baishan': {
                    'usage': float(baishan),
                    'price': float(bill.baishan_price),
                    'amount': float(baishan * bill.baishan_price)
                },
            }
        else:
            # Use pricing period usage and prices
            period = self.pricing_period
            days_in_period = period.get_days_in_period()
            
            # Calculate daily usage (distribute period usage across days)
            # If daily amount has specific usage, use it; otherwise distribute period usage
            if self.iig_qt > 0:
                iig_qt = self.iig_qt
            else:
                iig_qt = period.iig_qt / days_in_period if days_in_period > 0 else 0
            
            if self.fna > 0:
                fna = self.fna
            else:
                fna = period.fna / days_in_period if days_in_period > 0 else 0
            
            if self.ggc > 0:
                ggc = self.ggc
            else:
                ggc = period.ggc / days_in_period if days_in_period > 0 else 0
            
            if self.cdn > 0:
                cdn = self.cdn
            else:
                cdn = period.cdn / days_in_period if days_in_period > 0 else 0
            
            if self.bdix > 0:
                bdix = self.bdix
            else:
                bdix = period.bdix / days_in_period if days_in_period > 0 else 0
            
            if self.baishan > 0:
                baishan = self.baishan
            else:
                baishan = period.baishan / days_in_period if days_in_period > 0 else 0
            
            # Calculate daily amount using period prices
            daily_amount = (
                iig_qt * period.iig_qt_price +
                fna * period.fna_price +
                ggc * period.ggc_price +
                cdn * period.cdn_price +
                bdix * period.bdix_price +
                baishan * period.baishan_price
            )
            
            # Apply period discount (proportional to day)
            if period.discount > 0:
                daily_discount = period.discount / days_in_period if days_in_period > 0 else 0
                daily_amount -= daily_discount
            
            # Store breakdown
            self.service_breakdown = {
                'iig_qt': {
                    'usage': float(iig_qt),
                    'price': float(period.iig_qt_price),
                    'amount': float(iig_qt * period.iig_qt_price)
                },
                'fna': {
                    'usage': float(fna),
                    'price': float(period.fna_price),
                    'amount': float(fna * period.fna_price)
                },
                'ggc': {
                    'usage': float(ggc),
                    'price': float(period.ggc_price),
                    'amount': float(ggc * period.ggc_price)
                },
                'cdn': {
                    'usage': float(cdn),
                    'price': float(period.cdn_price),
                    'amount': float(cdn * period.cdn_price)
                },
                'bdix': {
                    'usage': float(bdix),
                    'price': float(period.bdix_price),
                    'amount': float(bdix * period.bdix_price)
                },
                'baishan': {
                    'usage': float(baishan),
                    'price': float(period.baishan_price),
                    'amount': float(baishan * period.baishan_price)
                },
            }
        
        self.daily_amount = daily_amount


# Signal to update BillRecord when PricingPeriod is deleted
@receiver(post_delete, sender=PricingPeriod)
def update_bill_record_on_period_delete(sender, instance, **kwargs):
    """Update BillRecord when a pricing period is deleted"""
    if instance.bill_record:
        from .utils import calculate_bill_record_total_from_periods
        calculate_bill_record_total_from_periods(instance.bill_record)


# ============================================================================
# MAC / Channel Partner / Franchise & SOHO Billing Models
# ============================================================================

class Package(models.Model):
    """
    Unified package table for both MAC and SOHO packages
    """
    PACKAGE_TYPE_CHOICES = (
        ('MAC', 'MAC Package'),
        ('SOHO', 'SOHO Package'),
    )
    
    name = models.CharField(max_length=255, help_text='Package name')
    mbps = models.DecimalField(max_digits=10, decimal_places=2, help_text='Speed in Mbps')
    rate = models.DecimalField(max_digits=12, decimal_places=2, help_text='Base package price')
    type = models.CharField(max_length=10, choices=PACKAGE_TYPE_CHOICES, db_index=True, help_text='Package type: MAC or SOHO')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'packages'
        ordering = ['type', 'name']
        indexes = [
            models.Index(fields=['type', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.type}) - {self.mbps} Mbps - {self.rate}"


class MACPartner(models.Model):
    """
    MAC / Channel Partner / Franchise Partner
    Stores summary information about the MAC partner
    """
    mac_cust_name = models.CharField(max_length=255, help_text='MAC partner name')
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    mac_partner_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text='Auto-generated MAC partner number: KTL-MAC-{8 chars partner name}-{partner id}'
    )
    percentage_share = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Revenue share percentage (e.g., 20.00 for 20%)'
    )
    contact_person = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'mac_partners'
        ordering = ['mac_cust_name']
        indexes = [
            models.Index(fields=['mac_cust_name']),
            models.Index(fields=['is_active']),
            models.Index(fields=['mac_partner_number']),
        ]
    
    def __str__(self):
        return self.mac_cust_name
    
    def save(self, *args, **kwargs):
        """Auto-generate mac_partner_number on creation if not provided"""
        if not self.mac_partner_number:
            from .utils import generate_mac_partner_number
            # Generate MAC partner number (will use self.id after save, so we'll update it)
            if self.pk is None:
                # First save to get the ID
                super().save(*args, **kwargs)
                # Now generate with the ID
                self.mac_partner_number = generate_mac_partner_number(
                    partner_name=self.mac_cust_name,
                    partner_id=self.id
                )
                # Save again with the mac_partner_number
                super().save(update_fields=['mac_partner_number'])
            else:
                # If updating and mac_partner_number is missing, generate it
                self.mac_partner_number = generate_mac_partner_number(
                    partner_name=self.mac_cust_name,
                    partner_id=self.id
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
    
    @property
    def total_client(self):
        """Auto-calculate total active clients"""
        return self.end_customers.filter(status='Active').count()


class MACEndCustomer(models.Model):
    """
    End-customers under a MAC partner
    Each MAC partner can have many end-customers with different packages, rates, activation dates, and bill dates
    """
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended'),
    )
    
    mac_partner = models.ForeignKey(
        MACPartner,
        on_delete=models.CASCADE,
        related_name='end_customers',
        help_text='MAC partner this customer belongs to'
    )
    name = models.CharField(max_length=255, help_text='End customer name')
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    mac_end_customer_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text='Auto-generated MAC end customer number: KTL-MACEC-{8 chars customer name}-{customer id}'
    )
    package = models.ForeignKey(
        Package,
        on_delete=models.SET_NULL,
        null=True,
        related_name='mac_end_customers',
        limit_choices_to={'type': 'MAC'},
        help_text='Package assigned to this customer'
    )
    custom_rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Custom rate for this customer (if different from package rate)'
    )
    activation_date = models.DateField(help_text='Date when customer became active', db_index=True)
    bill_date = models.DateField(
        null=True,
        blank=True,
        help_text='Individual bill date for this customer (if different from MAC partner bill date)',
        db_index=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'mac_end_customers'
        ordering = ['mac_partner', 'name']
        indexes = [
            models.Index(fields=['mac_partner', 'status']),
            models.Index(fields=['activation_date']),
            models.Index(fields=['status']),
            models.Index(fields=['mac_end_customer_number']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.mac_partner.mac_cust_name}"
    
    def save(self, *args, **kwargs):
        """Auto-generate mac_end_customer_number on creation if not provided"""
        if not self.mac_end_customer_number:
            from .utils import generate_mac_end_customer_number
            # Generate MAC end customer number (will use self.id after save, so we'll update it)
            if self.pk is None:
                # First save to get the ID
                super().save(*args, **kwargs)
                # Now generate with the ID
                self.mac_end_customer_number = generate_mac_end_customer_number(
                    customer_name=self.name,
                    customer_id=self.id
                )
                # Save again with the mac_end_customer_number
                super().save(update_fields=['mac_end_customer_number'])
            else:
                # If updating and mac_end_customer_number is missing, generate it
                self.mac_end_customer_number = generate_mac_end_customer_number(
                    customer_name=self.name,
                    customer_id=self.id
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
    
    @property
    def effective_rate(self):
        """Get effective rate (custom_rate or package.rate)"""
        if self.custom_rate:
            return self.custom_rate
        return self.package.rate if self.package else 0


class SOHOCustomer(models.Model):
    """
    SOHO / Home / Own Customers
    Direct customers with packages
    """
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended'),
    )
    
    cust_name = models.CharField(max_length=255, help_text='Customer name')
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    soho_customer_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text='Auto-generated SOHO customer number: KTL-SOHO-{8 chars customer name}-{customer id}'
    )
    package = models.ForeignKey(
        Package,
        on_delete=models.SET_NULL,
        null=True,
        related_name='soho_customers',
        limit_choices_to={'type': 'SOHO'},
        help_text='SOHO package assigned to this customer'
    )
    rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Package rate (can override package default rate)'
    )
    activation_date = models.DateField(help_text='Date when customer became active')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'soho_customers'
        ordering = ['cust_name']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['activation_date']),
            models.Index(fields=['soho_customer_number']),
        ]
    
    def __str__(self):
        return self.cust_name
    
    def save(self, *args, **kwargs):
        """Auto-set rate from package if not provided and generate soho_customer_number"""
        if not self.rate and self.package:
            self.rate = self.package.rate
        
        # Auto-generate soho_customer_number on creation if not provided
        if not self.soho_customer_number:
            from .utils import generate_soho_customer_number
            # Generate SOHO customer number (will use self.id after save, so we'll update it)
            if self.pk is None:
                # First save to get the ID
                super().save(*args, **kwargs)
                # Now generate with the ID
                self.soho_customer_number = generate_soho_customer_number(
                    customer_name=self.cust_name,
                    customer_id=self.id
                )
                # Save again with the soho_customer_number
                super().save(update_fields=['soho_customer_number'])
            else:
                # If updating and soho_customer_number is missing, generate it
                self.soho_customer_number = generate_soho_customer_number(
                    customer_name=self.cust_name,
                    customer_id=self.id
                )
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)


class MACBill(models.Model):
    """
    Billing record for MAC partners
    Stores summary billing information
    """
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Unpaid', 'Unpaid'),
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
    )
    
    mac_partner = models.ForeignKey(
        MACPartner,
        on_delete=models.CASCADE,
        related_name='bills',
        help_text='MAC partner this bill belongs to'
    )
    bill_date = models.DateField(help_text='Billing date')
    total_client = models.IntegerField(default=0, help_text='Total active clients at billing date (auto-calculated)')
    total_revenue = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total revenue from all active end-customers'
    )
    percentage_share = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Revenue share percentage applied'
    )
    commission = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Commission amount (auto-calculated: total_revenue * percentage_share / 100)'
    )
    total_bill = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total bill after commission (total_revenue - commission)'
    )
    total_received = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total amount received'
    )
    total_due = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total due amount (total_bill - total_received)'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'mac_bills'
        ordering = ['-bill_date', '-created_at']
        indexes = [
            models.Index(fields=['mac_partner', 'bill_date']),
            models.Index(fields=['status']),
            models.Index(fields=['bill_date']),
        ]
    
    def __str__(self):
        return f"MAC Bill - {self.mac_partner.mac_cust_name} - {self.bill_date}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate commission and total_bill"""
        if self.total_revenue > 0 and self.percentage_share > 0:
            self.commission = (self.total_revenue * self.percentage_share) / 100
        self.total_bill = self.total_revenue - self.commission
        self.total_due = self.total_bill - self.total_received
        
        # Update status based on payment
        if self.total_received >= self.total_bill and self.total_bill > 0:
            self.status = 'Paid'
        elif self.total_received > 0:
            self.status = 'Partial'
        elif self.total_bill > 0:
            self.status = 'Unpaid'
        else:
            self.status = 'Pending'
        
        super().save(*args, **kwargs)


class SOHOBill(models.Model):
    """
    Billing record for SOHO customers
    """
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Unpaid', 'Unpaid'),
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
    )
    
    soho_customer = models.ForeignKey(
        SOHOCustomer,
        on_delete=models.CASCADE,
        related_name='bills',
        help_text='SOHO customer this bill belongs to'
    )
    bill_date = models.DateField(help_text='Billing date')
    package = models.ForeignKey(
        Package,
        on_delete=models.SET_NULL,
        null=True,
        related_name='soho_bills',
        limit_choices_to={'type': 'SOHO'},
        help_text='Package at time of billing'
    )
    rate = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Rate charged for this bill'
    )
    total_bill = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total bill amount'
    )
    total_received = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total amount received'
    )
    total_due = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        help_text='Total due amount (total_bill - total_received)'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'soho_bills'
        ordering = ['-bill_date', '-created_at']
        indexes = [
            models.Index(fields=['soho_customer', 'bill_date']),
            models.Index(fields=['status']),
            models.Index(fields=['bill_date']),
        ]
    
    def __str__(self):
        return f"SOHO Bill - {self.soho_customer.cust_name} - {self.bill_date}"
    
    def save(self, *args, **kwargs):
        """Auto-calculate total_bill and total_due"""
        if not self.total_bill:
            self.total_bill = self.rate
        self.total_due = self.total_bill - self.total_received
        
        # Update status based on payment
        if self.total_received >= self.total_bill and self.total_bill > 0:
            self.status = 'Paid'
        elif self.total_received > 0:
            self.status = 'Partial'
        elif self.total_bill > 0:
            self.status = 'Unpaid'
        else:
            self.status = 'Pending'
        
        super().save(*args, **kwargs)


class PaymentRecord(models.Model):
    """
    Track all payments received with dates
    Can be linked to MAC bills, SOHO bills, or general payments
    """
    PAYMENT_TYPE_CHOICES = (
        ('MAC', 'MAC Bill Payment'),
        ('SOHO', 'SOHO Bill Payment'),
        ('Bandwidth', 'Bandwidth/Reseller Bill Payment'),
        ('Other', 'Other Payment'),
    )
    
    PAYMENT_METHOD_CHOICES = (
        ('Cash', 'Cash'),
        ('Bank Transfer', 'Bank Transfer'),
        ('Check', 'Check'),
        ('Mobile Banking', 'Mobile Banking'),
        ('Other', 'Other'),
    )
    
    payment_date = models.DateField(help_text='Date when payment was received', db_index=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2, help_text='Payment amount')
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, db_index=True)
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, default='Bank Transfer')
    
    # Link to bills (one of these will be set)
    mac_bill = models.ForeignKey(
        MACBill,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        help_text='MAC bill this payment is for'
    )
    soho_bill = models.ForeignKey(
        SOHOBill,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        help_text='SOHO bill this payment is for'
    )
    bill_record = models.ForeignKey(
        BillRecord,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        help_text='Bandwidth/Reseller bill record this payment is for'
    )
    
    reference_number = models.CharField(max_length=100, blank=True, help_text='Payment reference/transaction ID')
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_records'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_records'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['payment_date']),
            models.Index(fields=['payment_type']),
            models.Index(fields=['mac_bill']),
            models.Index(fields=['soho_bill']),
            models.Index(fields=['bill_record']),
        ]
    
    def __str__(self):
        if self.mac_bill:
            bill_ref = f"MAC Bill #{self.mac_bill_id}"
        elif self.soho_bill:
            bill_ref = f"SOHO Bill #{self.soho_bill_id}"
        elif self.bill_record:
            bill_ref = f"BillRecord #{self.bill_record_id}"
        else:
            bill_ref = "Other"
        return f"Payment - {self.amount} - {bill_ref} - {self.payment_date}"
    
    def save(self, *args, **kwargs):
        """Update bill total_received when payment is saved"""
        super().save(*args, **kwargs)
        
        if self.mac_bill:
            # Recalculate total_received from all payments
            self.mac_bill.total_received = self.mac_bill.payments.aggregate(
                total=Sum('amount')
            )['total'] or 0
            self.mac_bill.save(update_fields=['total_received', 'total_due', 'status'])
        
        if self.soho_bill:
            # Recalculate total_received from all payments
            self.soho_bill.total_received = self.soho_bill.payments.aggregate(
                total=Sum('amount')
            )['total'] or 0
            self.soho_bill.save(update_fields=['total_received', 'total_due', 'status'])
        
        if self.bill_record:
            # Recalculate total_received from all payments and update last payment info
            self.bill_record.total_received = self.bill_record.payments.aggregate(
                total=Sum('amount')
            )['total'] or 0
            # Get last payment info
            last_payment = self.bill_record.payments.order_by('-payment_date', '-created_at').first()
            if last_payment:
                self.bill_record.last_payment_date = last_payment.payment_date
                self.bill_record.last_payment_mode = last_payment.payment_method
            self.bill_record.total_due = self.bill_record.total_bill - self.bill_record.total_received
            self.bill_record.save(update_fields=['total_received', 'total_due', 'last_payment_date', 'last_payment_mode'])
    
    def delete(self, *args, **kwargs):
        """Update bill total_received when payment is deleted"""
        mac_bill = self.mac_bill
        soho_bill = self.soho_bill
        bill_record = self.bill_record
        
        super().delete(*args, **kwargs)
        
        if mac_bill:
            mac_bill.total_received = mac_bill.payments.aggregate(
                total=Sum('amount')
            )['total'] or 0
            mac_bill.save(update_fields=['total_received', 'total_due', 'status'])
        
        if soho_bill:
            soho_bill.total_received = soho_bill.payments.aggregate(
                total=Sum('amount')
            )['total'] or 0
            soho_bill.save(update_fields=['total_received', 'total_due', 'status'])
        
        if bill_record:
            bill_record.total_received = bill_record.payments.aggregate(
                total=Sum('amount')
            )['total'] or 0
            # Get last payment info
            last_payment = bill_record.payments.order_by('-payment_date', '-created_at').first()
            if last_payment:
                bill_record.last_payment_date = last_payment.payment_date
                bill_record.last_payment_mode = last_payment.payment_method
            else:
                bill_record.last_payment_date = None
                bill_record.last_payment_mode = ''
            bill_record.total_due = bill_record.total_bill - bill_record.total_received
            bill_record.save(update_fields=['total_received', 'total_due', 'last_payment_date', 'last_payment_mode'])


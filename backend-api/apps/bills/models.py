from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from apps.customers.models import Customer
from .utils import generate_bill_number, calculate_bill_record_total_from_periods


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


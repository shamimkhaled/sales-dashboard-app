from django.db import models
from django.conf import settings
from apps.bills.models import BillRecord


class Invoice(models.Model):
    """
    Invoice model based on BillRecord
    Supports multiple invoice formats (ITS, INT)
    """
    INVOICE_FORMAT_CHOICES = (
        ('ITS', 'ITS'),
        ('INT', 'INT'),
    )
    
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    )
    
    # Invoice identification
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True, help_text="Format: KTL MM YYYY/XX")
    invoice_format = models.CharField(max_length=10, choices=INVOICE_FORMAT_CHOICES, default='ITS')
    
    # Link to bill record (provides access to both bill and customer data)
    bill_record = models.OneToOneField(
        BillRecord,
        on_delete=models.CASCADE,
        related_name='invoice',
        help_text="The bill record this invoice is based on"
    )
    
    # Invoice dates
    issue_date = models.DateField()
    due_date = models.DateField(null=True, blank=True)
    
    # Invoice status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    
    # Financial information (copied from bill for reference, but can be overridden)
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="VAT amount (usually 0 for ITS, calculated for INT)")
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    amount_in_words = models.TextField(blank=True, help_text="Total amount in words (e.g., 'Two Lac Sixty-Six Thousand Fifty-Seven Taka Only.')")
    
    # Additional invoice fields
    notes = models.TextField(blank=True, help_text="Additional notes for the invoice")
    terms = models.TextField(blank=True, help_text="Payment terms and conditions")
    attention = models.CharField(max_length=255, blank=True, help_text="Attention line (defaults to customer name)")
    
    # Payment information (can be stored in settings or per invoice)
    payment_mode = models.CharField(max_length=255, default='Kloud Technologies Limited')
    bank_name = models.CharField(max_length=255, default='National Credit and Commerce Bank PLC. (NCC)')
    account_number = models.CharField(max_length=50, default='0050-0210013920')
    branch_name = models.CharField(max_length=255, default='Banani')
    routing_number = models.CharField(max_length=50, default='160260430')
    swift_code = models.CharField(max_length=50, default='NCCLBDDHBAB')
    bkash_number = models.CharField(max_length=50, default='01313752577')
    
    # Manager/Company information
    manager_name = models.CharField(max_length=255, default='Biswajit Kumar Ghosh')
    manager_designation = models.CharField(max_length=255, default='Manager (Finance & Accounts)')
    manager_email = models.CharField(max_length=255, default='biswajit.kumar@kloud.com.bd')
    manager_phone = models.CharField(max_length=50, default='01727-051616')
    company_name_footer = models.CharField(max_length=255, default='Kloud Technologies Limited')
    
    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_invoices'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'sales_invoices'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
            models.Index(fields=['issue_date']),
            models.Index(fields=['bill_record']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.bill_record.customer.name}"
    
    def save(self, *args, **kwargs):
        # Auto-generate invoice number if not provided
        if not self.invoice_number:
            self.invoice_number = self.generate_invoice_number()
        
        # Set attention to customer name if not provided
        if not self.attention and self.bill_record and self.bill_record.customer:
            self.attention = self.bill_record.customer.name
        
        # Calculate balance due
        self.balance_due = self.total_amount - self.paid_amount
        
        # Generate amount in words if not provided
        if not self.amount_in_words and self.total_amount > 0:
            self.amount_in_words = self.convert_amount_to_words(self.total_amount)
        
        # Update status based on payment
        if self.paid_amount >= self.total_amount and self.total_amount > 0:
            self.status = 'paid'
            if not self.paid_at:
                from django.utils import timezone
                self.paid_at = timezone.now()
        elif self.paid_amount > 0:
            self.status = 'issued'
        elif self.status == 'draft':
            pass  # Keep draft status
        elif not self.status:
            self.status = 'draft'
        
        super().save(*args, **kwargs)
    
    def generate_invoice_number(self):
        """Generate unique invoice number in format: KTL MM YYYY/XX"""
        from django.utils import timezone
        from datetime import datetime
        
        now = timezone.now()
        month_str = now.strftime('%m').lstrip('0') or '1'  # Remove leading zero, e.g., '06' -> '6'
        year_str = now.strftime('%Y')
        
        # Format: KTL MM YYYY/XX (e.g., KTL 06 2025/27)
        base_pattern = f"KTL {month_str} {year_str}/"
        
        # Get the last invoice number for this month
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=base_pattern
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            # Extract sequence number from format "KTL MM YYYY/XX"
            try:
                # Split by '/' and get the last part
                sequence_str = last_invoice.invoice_number.split('/')[-1]
                sequence = int(sequence_str)
                sequence += 1
            except (ValueError, IndexError):
                sequence = 1
        else:
            sequence = 1
        
        return f"{base_pattern}{sequence}"
    
    @staticmethod
    def convert_amount_to_words(amount):
        """Convert amount to words in Bengali/English format"""
        # This is a simplified version - you may want to use a library like num2words
        # Format: "Two Lac Sixty-Six Thousand Fifty-Seven Taka Only."
        try:
            from num2words import num2words
            words = num2words(int(amount), lang='en', to='cardinal')
            # Capitalize first letter and add "Taka Only."
            words = words.capitalize() + " Taka Only."
            return words
        except ImportError:
            # Fallback simple conversion
            return f"{amount:,.2f} Taka Only."
    
    @property
    def customer(self):
        """Get customer from bill record"""
        return self.bill_record.customer if self.bill_record else None
    
    @property
    def customer_display_id(self):
        """
        Generate customer display ID for invoice format
        Format: ITS/CompanyName/YYYYMM/XX or IIG/CompanyName/YYYYMM/XX
        This is computed on-the-fly for display purposes, not stored
        """
        from django.utils import timezone
        
        if not self.bill_record or not self.bill_record.customer:
            return ''
        
        customer = self.bill_record.customer
        company_name = customer.company_name or customer.name
        # Remove spaces and special chars for ID
        company_id = ''.join(c for c in company_name if c.isalnum())
        
        now = self.issue_date or timezone.now().date()
        month_str = now.strftime('%m')
        year_str = now.strftime('%Y')
        
        # Get sequence from invoice number (last part after /)
        try:
            sequence = int(self.invoice_number.split('/')[-1])
        except (ValueError, IndexError):
            sequence = 1
        
        prefix = 'ITS' if self.invoice_format == 'ITS' else 'IIG'
        return f"{prefix}/{company_id}/{year_str}{month_str}/{sequence}"
    
    @property
    def is_overdue(self):
        """Check if invoice is overdue"""
        if self.due_date and self.status not in ['paid', 'cancelled']:
            from django.utils import timezone
            return timezone.now().date() > self.due_date
        return False
    
    def mark_as_issued(self):
        """Mark invoice as issued"""
        from django.utils import timezone
        self.status = 'issued'
        self.issued_at = timezone.now()
        self.save()
    
    def mark_as_paid(self, amount=None):
        """Mark invoice as paid"""
        from django.utils import timezone
        if amount:
            self.paid_amount = amount
        else:
            self.paid_amount = self.total_amount
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.save()


class InvoiceItem(models.Model):
    """
    Invoice line items - detailed breakdown of services
    Based on bill record components
    Matches invoice format: SL, Descriptions, Quantity, Unit Price, Amount, Total Amount
    """
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    
    # Serial number (SL)
    serial_number = models.IntegerField(default=1, help_text="Serial number in invoice table")
    
    # Service details
    service_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, help_text="Full description with date range (e.g., 'IT Supports (1st June to 30th June-2025)')")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_unit = models.CharField(max_length=20, blank=True, help_text="Unit for quantity (empty for ITS, 'Mbps' for INT)")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Unit price (may be 0 or empty)")
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="Line amount (may be empty, calculated)")
    line_total = models.DecimalField(max_digits=15, decimal_places=2, default=0, help_text="Total Amount (BDT) - required")
    
    # Optional: Link to specific bill component
    service_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Service type: iig_qt, fna, ggc, cdn, bdix, baishan"
    )
    
    # Date range for description
    date_from = models.DateField(null=True, blank=True, help_text="Service start date for description")
    date_to = models.DateField(null=True, blank=True, help_text="Service end date for description")
    
    class Meta:
        db_table = 'sales_invoice_items'
        ordering = ['serial_number', 'id']
    
    def __str__(self):
        return f"{self.serial_number}. {self.service_name} - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Auto-generate description with date range if not provided
        if not self.description and self.date_from and self.date_to:
            self.description = self.generate_description()
        
        # Auto-calculate line total (use amount if provided, otherwise quantity * unit_price)
        if self.amount > 0:
            self.line_total = self.amount
        else:
            self.line_total = self.quantity * self.unit_price
        
        super().save(*args, **kwargs)
    
    def generate_description(self):
        """Generate description with date range based on invoice format"""
        from datetime import datetime
        
        def format_date(date_obj):
            """Format date as '1st June' or '30th June'"""
            day = date_obj.day
            month_name = date_obj.strftime('%B')
            # Add ordinal suffix
            if 10 <= day % 100 <= 20:
                suffix = 'th'
            else:
                suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(day % 10, 'th')
            return f"{day}{suffix} {month_name}"
        
        date_from_str = format_date(self.date_from)
        date_to_str = format_date(self.date_to)
        year = self.date_to.year
        
        if self.invoice.invoice_format == 'ITS':
            return f"IT Supports ({date_from_str} to {date_to_str}-{year})"
        else:  # INT
            return f"Monthly Bandwidth Charge ({date_from_str} to {date_to_str}-{year})"
        
        


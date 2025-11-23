"""
Utility functions for invoice management
"""
from .models import Invoice, InvoiceItem
from apps.bills.models import BillRecord
from django.utils import timezone
from datetime import timedelta


def create_invoice_from_bill(
    bill_record: BillRecord,
    invoice_format: str = 'ITS',
    auto_populate_items: bool = True,
    issue_date=None,
    due_date=None,
    notes='',
    terms='',
    tax_amount=0,
    discount_amount=None,
    created_by=None
):
    """
    Create an invoice from a bill record
    
    Args:
        bill_record: The BillRecord to create invoice from
        invoice_format: 'ITS' or 'INT'
        auto_populate_items: Whether to auto-populate invoice items from bill components
        issue_date: Invoice issue date (defaults to today)
        due_date: Invoice due date (defaults to 30 days from issue date)
        notes: Additional notes
        terms: Payment terms
        tax_amount: Tax amount (defaults to 0)
        discount_amount: Discount amount (defaults to bill discount)
        created_by: User creating the invoice
    
    Returns:
        Created Invoice instance
    """
    # Set default dates
    if issue_date is None:
        issue_date = timezone.now().date()
    
    if due_date is None:
        due_date = issue_date + timedelta(days=30)
    
    # Use bill discount if not specified
    if discount_amount is None:
        discount_amount = bill_record.discount
    
    # Calculate totals from bill
    subtotal = bill_record.total_bill + bill_record.discount  # Add discount back to get original total
    total_amount = subtotal + tax_amount - discount_amount
    
    # Create invoice
    invoice = Invoice.objects.create(
        bill_record=bill_record,
        invoice_format=invoice_format,
        issue_date=issue_date,
        due_date=due_date,
        subtotal=subtotal,
        tax_amount=tax_amount,
        discount_amount=discount_amount,
        total_amount=total_amount,
        paid_amount=bill_record.total_received,
        notes=notes,
        terms=terms,
        created_by=created_by,
        status='draft'
    )
    
    # Auto-populate invoice items from bill components
    if auto_populate_items:
        populate_invoice_items_from_bill(invoice, bill_record)
    
    return invoice


def populate_invoice_items_from_bill(invoice: Invoice, bill_record: BillRecord):
    """
    Populate invoice items from bill record components
    Matches invoice format with proper descriptions and date ranges
    """
    from .models import InvoiceItem
    
    # Service mapping
    services = [
        ('ipt', 'ipt_price', 'IPT'),
        ('fna', 'fna_price', 'FNA'),
        ('ggc', 'ggc_price', 'GGC'),
        ('cdn', 'cdn_price', 'CDN'),
        ('nix', 'nix_price', 'NIX'),
        ('baishan', 'baishan_price', 'Baishan'),
    ]
    
    items_created = []
    serial_number = 1
    
    # Get date range from bill record
    date_from = bill_record.active_date or bill_record.billing_date or invoice.issue_date
    date_to = bill_record.termination_date or bill_record.billing_date or invoice.issue_date
    
    # Determine quantity unit based on invoice format
    quantity_unit = '' if invoice.invoice_format == 'ITS' else 'Mbps'
    
    for qty_field, price_field, service_name in services:
        quantity = getattr(bill_record, qty_field, 0)
        unit_price = getattr(bill_record, price_field, 0)
        line_total = quantity * unit_price
        
        # Only create item if quantity > 0 or line_total > 0
        if quantity > 0 or line_total > 0:
            item = InvoiceItem.objects.create(
                invoice=invoice,
                serial_number=serial_number,
                service_name=service_name,
                service_type=qty_field,
                quantity=quantity,
                quantity_unit=quantity_unit,
                unit_price=unit_price,
                amount=0,  # May be empty, use line_total instead
                line_total=line_total,
                date_from=date_from,
                date_to=date_to,
                # Description will be auto-generated from date_from/date_to
            )
            items_created.append(item)
            serial_number += 1
    
    # Recalculate subtotal from items
    if items_created:
        invoice.subtotal = sum(item.line_total for item in items_created)
        
        # Calculate VAT for INT format (typically 5% of subtotal)
        if invoice.invoice_format == 'INT' and invoice.tax_amount == 0:
            invoice.tax_amount = invoice.subtotal * 0.05  # 5% VAT
        
        invoice.total_amount = invoice.subtotal + invoice.tax_amount - invoice.discount_amount
        invoice.save()
    
    return items_created


def generate_invoice_number(format_type='ITS', issue_date=None):
    """
    Generate a unique invoice number in format: KTL MM YYYY/XX
    """
    if issue_date is None:
        issue_date = timezone.now().date()
    
    month_str = issue_date.strftime('%m').lstrip('0') or '1'  # Remove leading zero
    year_str = issue_date.strftime('%Y')
    
    # Format: KTL MM YYYY/XX (e.g., KTL 06 2025/27)
    base_pattern = f"KTL {month_str} {year_str}/"
    
    # Get the last invoice number for this month
    last_invoice = Invoice.objects.filter(
        invoice_number__startswith=base_pattern
    ).order_by('-invoice_number').first()
    
    if last_invoice:
        try:
            sequence_str = last_invoice.invoice_number.split('/')[-1]
            sequence = int(sequence_str)
            sequence += 1
        except (ValueError, IndexError):
            sequence = 1
    else:
        sequence = 1
    
    return f"{base_pattern}{sequence}"


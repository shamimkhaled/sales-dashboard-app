"""
Utility functions for bill operations
"""
import re
from django.utils import timezone


def generate_bill_number(customer_name, bill_id, billing_date=None):
    """
    Generate unique bill number in format: KTL-BL-{5 chars customer name}-{bill id}-{DDMMYYYY}
    
    Example: KTL-BL-Cyber-1-27062025
    
    Args:
        customer_name: Customer name or company name
        bill_id: Bill record ID
        billing_date: Billing date (defaults to today)
    
    Returns:
        str: Generated bill number
    """
    # Use billing_date or today's date
    if billing_date is None:
        billing_date = timezone.now().date()
    
    # Clean customer name: remove special characters, take first 5 characters
    # Use company_name if available, otherwise use name
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', customer_name or 'CUST')
    clean_name = clean_name[:5].upper() if len(clean_name) >= 5 else clean_name.upper().ljust(5, 'X')
    
    # Format date as DDMMYYYY
    date_str = billing_date.strftime('%d%m%Y')
    
    # Generate bill number: KTL-BL-{5 chars}-{bill_id}-{DDMMYYYY}
    bill_number = f"KTL-BL-{clean_name}-{bill_id}-{date_str}"
    
    return bill_number


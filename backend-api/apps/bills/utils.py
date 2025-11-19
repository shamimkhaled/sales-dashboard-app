"""
Utility functions for bill operations
"""
import re
from datetime import datetime, timedelta
from calendar import monthrange
from django.utils import timezone
from django.db import transaction


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


def update_bill_record_from_period(bill_record, pricing_period):
    """
    Update BillRecord with individual field values from a specific pricing period.
    Each usage/quantity and price field is updated individually (not aggregated).
    
    Args:
        bill_record: BillRecord instance
        pricing_period: PricingPeriod instance to get values from
    
    Returns:
        Decimal: Calculated total_bill (sum of all periods)
    """
    from .models import PricingPeriod
    
    # Update BillRecord with individual field values from this pricing period
    bill_record.iig_qt = pricing_period.iig_qt
    bill_record.iig_qt_price = pricing_period.iig_qt_price
    bill_record.fna = pricing_period.fna
    bill_record.fna_price = pricing_period.fna_price
    bill_record.ggc = pricing_period.ggc
    bill_record.ggc_price = pricing_period.ggc_price
    bill_record.cdn = pricing_period.cdn
    bill_record.cdn_price = pricing_period.cdn_price
    bill_record.bdix = pricing_period.bdix
    bill_record.bdix_price = pricing_period.bdix_price
    bill_record.baishan = pricing_period.baishan
    bill_record.baishan_price = pricing_period.baishan_price
    bill_record.discount = pricing_period.discount
    
    # Calculate total from all pricing periods
    periods = PricingPeriod.objects.filter(bill_record=bill_record).order_by('start_day')
    total = sum(period.get_period_total() for period in periods) if periods.exists() else 0
    
    # Update totals
    bill_record.total_bill = total
    bill_record.total_due = total - (bill_record.total_received or 0)
    
    # Save all updated fields
    bill_record.save(update_fields=[
        'iig_qt', 'iig_qt_price',
        'fna', 'fna_price',
        'ggc', 'ggc_price',
        'cdn', 'cdn_price',
        'bdix', 'bdix_price',
        'baishan', 'baishan_price',
        'discount',
        'total_bill', 'total_due'
    ])
    
    return total


def calculate_bill_record_total_from_periods(bill_record):
    """
    Calculate and update BillRecord total_bill based on all pricing periods.
    If pricing periods exist, sum their totals. Otherwise, use BillRecord's own calculation.
    
    Args:
        bill_record: BillRecord instance
    
    Returns:
        Decimal: Calculated total_bill
    """
    from .models import PricingPeriod
    
    # Check if pricing periods exist
    periods = PricingPeriod.objects.filter(bill_record=bill_record).order_by('start_day')
    
    if periods.exists():
        # Calculate total from all pricing periods
        total = sum(period.get_period_total() for period in periods)
        
        # Get the most recent pricing period (by end_day, then by created_at)
        # This represents the current/latest period values
        latest_period = periods.order_by('-end_day', '-created_at').first()
        
        # Update BillRecord with individual field values from the latest pricing period
        # Each field is updated individually, not aggregated
        bill_record.iig_qt = latest_period.iig_qt
        bill_record.iig_qt_price = latest_period.iig_qt_price
        bill_record.fna = latest_period.fna
        bill_record.fna_price = latest_period.fna_price
        bill_record.ggc = latest_period.ggc
        bill_record.ggc_price = latest_period.ggc_price
        bill_record.cdn = latest_period.cdn
        bill_record.cdn_price = latest_period.cdn_price
        bill_record.bdix = latest_period.bdix
        bill_record.bdix_price = latest_period.bdix_price
        bill_record.baishan = latest_period.baishan
        bill_record.baishan_price = latest_period.baishan_price
        bill_record.discount = latest_period.discount
        
        # Update totals (still calculated from sum of all periods)
        bill_record.total_bill = total
        bill_record.total_due = total - (bill_record.total_received or 0)
        
        # Save all updated fields
        bill_record.save(update_fields=[
            'iig_qt', 'iig_qt_price',
            'fna', 'fna_price',
            'ggc', 'ggc_price',
            'cdn', 'cdn_price',
            'bdix', 'bdix_price',
            'baishan', 'baishan_price',
            'discount',
            'total_bill', 'total_due'
        ])
    else:
        # No pricing periods, use BillRecord's own calculation
        component_total = (
            (bill_record.iig_qt or 0) * (bill_record.iig_qt_price or 0) +
            (bill_record.fna or 0) * (bill_record.fna_price or 0) +
            (bill_record.ggc or 0) * (bill_record.ggc_price or 0) +
            (bill_record.cdn or 0) * (bill_record.cdn_price or 0) +
            (bill_record.bdix or 0) * (bill_record.bdix_price or 0) +
            (bill_record.baishan or 0) * (bill_record.baishan_price or 0)
        )
        total = component_total - (bill_record.discount or 0)
        bill_record.total_bill = total
        bill_record.total_due = total - (bill_record.total_received or 0)
        bill_record.save(update_fields=['total_bill', 'total_due'])
    
    return total


def finalize_bill_record_from_periods(bill_record):
    """
    Finalize BillRecord by updating all values from pricing periods.
    This should be called when all pricing periods are complete/ended.
    
    This function:
    1. Updates usage/quantity values (sum of all periods)
    2. Updates price values (effective/weighted average prices)
    3. Updates discount (sum of all periods)
    4. Updates total_bill and total_due
    
    Args:
        bill_record: BillRecord instance
    
    Returns:
        dict: Summary of updated values
    """
    from .models import PricingPeriod
    
    periods = PricingPeriod.objects.filter(bill_record=bill_record).order_by('start_day')
    
    if not periods.exists():
        return {
            'updated': False,
            'message': 'No pricing periods found for this bill record'
        }
    
    # Use the existing function to calculate and update
    total = calculate_bill_record_total_from_periods(bill_record)
    
    # Get the updated values
    summary = {
        'updated': True,
        'bill_record_id': bill_record.id,
        'total_bill': float(total),
        'total_due': float(bill_record.total_due),
        'usage': {
            'iig_qt': float(bill_record.iig_qt),
            'fna': float(bill_record.fna),
            'ggc': float(bill_record.ggc),
            'cdn': float(bill_record.cdn),
            'bdix': float(bill_record.bdix),
            'baishan': float(bill_record.baishan),
        },
        'effective_prices': {
            'iig_qt_price': float(bill_record.iig_qt_price),
            'fna_price': float(bill_record.fna_price),
            'ggc_price': float(bill_record.ggc_price),
            'cdn_price': float(bill_record.cdn_price),
            'bdix_price': float(bill_record.bdix_price),
            'baishan_price': float(bill_record.baishan_price),
        },
        'total_discount': float(bill_record.discount),
        'periods_count': periods.count(),
    }
    
    return summary


def get_pricing_period_for_day(bill_record, day_number):
    """
    Get the pricing period that applies to a specific day number within the billing period.
    
    Args:
        bill_record: BillRecord instance
        day_number: Day number (1-31) within the billing period
    
    Returns:
        PricingPeriod instance or None if no pricing period found
    """
    from .models import PricingPeriod
    
    # Get all pricing periods for this bill, ordered by start_day
    periods = PricingPeriod.objects.filter(
        bill_record=bill_record
    ).order_by('start_day')
    
    # Find the period that contains this day
    for period in periods:
        if period.start_day <= day_number <= period.end_day:
            return period
    
    return None


def calculate_daily_amounts_for_bill(bill_record, recalculate=False):
    """
    Calculate and store daily bill amounts for all days in the billing period.
    This function creates DailyBillAmount records for each day from billing_date to end of month.
    
    Args:
        bill_record: BillRecord instance
        recalculate: If True, recalculate existing daily amounts
    
    Returns:
        tuple: (created_count, updated_count, errors)
    """
    from .models import DailyBillAmount, PricingPeriod
    
    if not bill_record.billing_date:
        return 0, 0, ["Billing date is required"]
    
    errors = []
    created_count = 0
    updated_count = 0
    
    # Determine billing period dates
    billing_date = bill_record.billing_date
    year = billing_date.year
    month = billing_date.month
    
    # Get number of days in the month
    _, days_in_month = monthrange(year, month)
    
    # Determine end date (use termination_date if available, otherwise end of month)
    if bill_record.termination_date:
        end_date = min(bill_record.termination_date, datetime(year, month, days_in_month).date())
    else:
        end_date = datetime(year, month, days_in_month).date()
    
    # Check if pricing periods exist
    has_pricing_periods = PricingPeriod.objects.filter(bill_record=bill_record).exists()
    
    try:
        with transaction.atomic():
            # Generate daily amounts for each day in the billing period
            current_date = billing_date
            day_number = 1
            
            while current_date <= end_date and day_number <= days_in_month:
                # Get pricing period for this day
                pricing_period = get_pricing_period_for_day(bill_record, day_number) if has_pricing_periods else None
                
                # Determine usage amounts based on pricing period or bill record
                if pricing_period:
                    # Use pricing period usage (will be distributed per day in DailyBillAmount._calculate_daily_amount)
                    # For now, set to 0 - the DailyBillAmount will calculate based on period usage / days
                    usage = {
                        'iig_qt': 0,  # Will be calculated from period.iig_qt / days_in_period
                        'fna': 0,
                        'ggc': 0,
                        'cdn': 0,
                        'bdix': 0,
                        'baishan': 0,
                    }
                else:
                    # Use bill record usage amounts
                    usage = {
                        'iig_qt': bill_record.iig_qt or 0,
                        'fna': bill_record.fna or 0,
                        'ggc': bill_record.ggc or 0,
                        'cdn': bill_record.cdn or 0,
                        'bdix': bill_record.bdix or 0,
                        'baishan': bill_record.baishan or 0,
                    }
                
                # Check if daily amount already exists
                daily_amount, created = DailyBillAmount.objects.get_or_create(
                    bill_record=bill_record,
                    date=current_date,
                    defaults={
                        'pricing_period': pricing_period,
                        'day_number': day_number,
                        'iig_qt': usage['iig_qt'],
                        'fna': usage['fna'],
                        'ggc': usage['ggc'],
                        'cdn': usage['cdn'],
                        'bdix': usage['bdix'],
                        'baishan': usage['baishan'],
                        'is_calculated': True,
                    }
                )
                
                if created:
                    created_count += 1
                elif recalculate:
                    # Update existing record
                    daily_amount.pricing_period = pricing_period
                    daily_amount.day_number = day_number
                    daily_amount.iig_qt = usage['iig_qt']
                    daily_amount.fna = usage['fna']
                    daily_amount.ggc = usage['ggc']
                    daily_amount.cdn = usage['cdn']
                    daily_amount.bdix = usage['bdix']
                    daily_amount.baishan = usage['baishan']
                    daily_amount.is_calculated = True
                    daily_amount.save()  # This will trigger _calculate_daily_amount()
                    updated_count += 1
                
                # Move to next day
                current_date += timedelta(days=1)
                day_number += 1
    
    except Exception as e:
        errors.append(f"Error calculating daily amounts: {str(e)}")
    
    return created_count, updated_count, errors


def get_total_revenue_from_daily_amounts(bill_record=None, start_date=None, end_date=None, customer=None):
    """
    Calculate total revenue from daily bill amounts.
    This is more accurate than using BillRecord.total_bill when pricing periods are used.
    
    Args:
        bill_record: Optional BillRecord instance (if None, calculates for all bills in date range)
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        customer: Optional Customer instance to filter by
    
    Returns:
        Decimal: Total revenue from daily amounts
    """
    from .models import DailyBillAmount
    from django.db.models import Sum, Q
    
    queryset = DailyBillAmount.objects.all()
    
    if bill_record:
        queryset = queryset.filter(bill_record=bill_record)
    
    if customer:
        queryset = queryset.filter(bill_record__customer=customer)
    
    if start_date:
        queryset = queryset.filter(date__gte=start_date)
    
    if end_date:
        queryset = queryset.filter(date__lte=end_date)
    
    result = queryset.aggregate(total=Sum('daily_amount'))
    return result['total'] or 0


def get_monthly_revenue_from_daily_amounts(year, month, customer=None):
    """
    Get monthly revenue from daily amounts for a specific year and month.
    
    Args:
        year: Year (e.g., 2025)
        month: Month (1-12)
        customer: Optional Customer instance to filter by
    
    Returns:
        Decimal: Total revenue for the month
    """
    from datetime import date
    from calendar import monthrange
    
    _, days_in_month = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, days_in_month)
    
    return get_total_revenue_from_daily_amounts(
        start_date=start_date,
        end_date=end_date,
        customer=customer
    )


def get_yearly_revenue_from_daily_amounts(year, customer=None):
    """
    Get yearly revenue from daily amounts for a specific year.
    
    Args:
        year: Year (e.g., 2025)
        customer: Optional Customer instance to filter by
    
    Returns:
        Decimal: Total revenue for the year
    """
    from datetime import date
    
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    return get_total_revenue_from_daily_amounts(
        start_date=start_date,
        end_date=end_date,
        customer=customer
    )


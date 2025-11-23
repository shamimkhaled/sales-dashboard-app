"""
Utility functions for bill operations
"""
import re
from datetime import datetime, timedelta
from calendar import monthrange
from django.utils import timezone
from django.db import transaction, models


def generate_mac_partner_number(partner_name, partner_id):
    """
    Generate unique MAC partner number in format: KTL-MAC-{8 chars partner name}-{partner id}
    
    Example: KTL-MAC-SHAMIMXX-5
    
    Args:
        partner_name: MAC partner name
        partner_id: MAC partner ID
    
    Returns:
        str: Generated MAC partner number
    """
    # Clean partner name: remove special characters, take first 8 characters
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', partner_name or 'MACPARTNER')
    clean_name = clean_name[:8].upper() if len(clean_name) >= 8 else clean_name.upper().ljust(8, 'X')
    
    # Generate MAC partner number: KTL-MAC-{8 chars}-{partner_id}
    mac_partner_number = f"KTL-MAC-{clean_name}-{partner_id}"
    
    return mac_partner_number


def generate_mac_end_customer_number(customer_name, customer_id):
    """
    Generate unique MAC end customer number in format: KTL-MACEC-{8 chars customer name}-{customer id}
    
    Example: KTL-MACEC-JOHNDOEX-10
    
    Args:
        customer_name: End customer name
        customer_id: End customer ID
    
    Returns:
        str: Generated MAC end customer number
    """
    # Clean customer name: remove special characters, take first 8 characters
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', customer_name or 'MACENDCUST')
    clean_name = clean_name[:8].upper() if len(clean_name) >= 8 else clean_name.upper().ljust(8, 'X')
    
    # Generate MAC end customer number: KTL-MACEC-{8 chars}-{customer_id}
    mac_end_customer_number = f"KTL-MACEC-{clean_name}-{customer_id}"
    
    return mac_end_customer_number


def generate_soho_customer_number(customer_name, customer_id):
    """
    Generate unique SOHO customer number in format: KTL-SOHO-{8 chars customer name}-{customer id}
    
    Example: KTL-SOHO-JANEDOEX-15
    
    Args:
        customer_name: SOHO customer name
        customer_id: SOHO customer ID
    
    Returns:
        str: Generated SOHO customer number
    """
    # Clean customer name: remove special characters, take first 8 characters
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', customer_name or 'SHOCUSTOMER')
    clean_name = clean_name[:8].upper() if len(clean_name) >= 8 else clean_name.upper().ljust(8, 'X')
    
    # Generate SOHO customer number: KTL-SOHO-{8 chars}-{customer_id}
    soho_customer_number = f"KTL-SOHO-{clean_name}-{customer_id}"
    
    return soho_customer_number


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


# ============================================================================
# MAC / SOHO Billing Utility Functions
# ============================================================================

def calculate_mac_bill(mac_partner, bill_date):
    """
    Calculate MAC bill for a partner based on active end-customers.
    Handles customers with different activation dates and individual bill dates.
    
    Args:
        mac_partner: MACPartner instance
        bill_date: Date for billing calculation (default bill date)
    
    Returns:
        dict: Calculation results with total_client, total_revenue, commission, total_bill, customer_details
    """
    from .models import MACEndCustomer
    from decimal import Decimal
    
    # Get all active end-customers
    # Include customers where:
    # 1. activation_date <= bill_date (customer is active)
    # 2. bill_date is NULL (use partner bill_date) OR bill_date <= bill_date (customer's bill date has passed)
    active_customers = MACEndCustomer.objects.filter(
        mac_partner=mac_partner,
        status='Active',
        activation_date__lte=bill_date
    ).filter(
        models.Q(bill_date__isnull=True) | models.Q(bill_date__lte=bill_date)
    ).select_related('package')
    
    total_client = active_customers.count()
    total_revenue = Decimal('0')
    customer_details = []
    
    # Calculate total revenue from all active customers
    for customer in active_customers:
        effective_rate = customer.effective_rate
        total_revenue += effective_rate
        
        # Track individual customer details
        customer_details.append({
            'id': customer.id,
            'name': customer.name,
            'package': customer.package.name if customer.package else None,
            'effective_rate': float(effective_rate),
            'activation_date': str(customer.activation_date),
            'bill_date': str(customer.bill_date) if customer.bill_date else None,
        })
    
    # Get percentage share from MAC partner
    percentage_share = mac_partner.percentage_share or Decimal('0')
    
    # Calculate commission
    commission = (total_revenue * percentage_share) / 100 if total_revenue > 0 else Decimal('0')
    
    # Calculate total bill (revenue - commission)
    total_bill = total_revenue - commission
    
    return {
        'total_client': total_client,
        'total_revenue': total_revenue,
        'percentage_share': percentage_share,
        'commission': commission,
        'total_bill': total_bill,
        'active_customers_count': total_client,
        'customer_details': customer_details
    }


def generate_mac_bill(mac_partner, bill_date, notes=''):
    """
    Generate and save a MAC bill record.
    
    Args:
        mac_partner: MACPartner instance
        bill_date: Date for billing
        notes: Optional notes
    
    Returns:
        MACBill instance
    """
    from .models import MACBill
    
    # Calculate bill
    calculation = calculate_mac_bill(mac_partner, bill_date)
    
    # Create bill record
    mac_bill = MACBill.objects.create(
        mac_partner=mac_partner,
        bill_date=bill_date,
        total_client=calculation['total_client'],
        total_revenue=calculation['total_revenue'],
        percentage_share=calculation['percentage_share'],
        commission=calculation['commission'],
        total_bill=calculation['total_bill'],
        notes=notes
    )
    
    return mac_bill


def get_revenue_by_customer_type(start_date=None, end_date=None):
    """
    Get total revenue by customer type (MAC, SOHO, Bandwidth/Reseller).
    
    Args:
        start_date: Optional start date filter
        end_date: Optional end date filter
    
    Returns:
        dict: Revenue breakdown by customer type
    """
    from .models import MACBill, SOHOBill, BillRecord
    from django.db.models import Sum, Q
    
    # MAC Revenue (from MAC bills - total_revenue is the gross revenue before commission)
    mac_query = MACBill.objects.all()
    if start_date:
        mac_query = mac_query.filter(bill_date__gte=start_date)
    if end_date:
        mac_query = mac_query.filter(bill_date__lte=end_date)
    mac_revenue = mac_query.aggregate(total=Sum('total_revenue'))['total'] or 0
    
    # SOHO Revenue (from SOHO bills)
    soho_query = SOHOBill.objects.all()
    if start_date:
        soho_query = soho_query.filter(bill_date__gte=start_date)
    if end_date:
        soho_query = soho_query.filter(bill_date__lte=end_date)
    soho_revenue = soho_query.aggregate(total=Sum('total_bill'))['total'] or 0
    
    # Bandwidth/Reseller Revenue (from BillRecord - existing system)
    bandwidth_query = BillRecord.objects.filter(status='Active')
    if start_date:
        bandwidth_query = bandwidth_query.filter(billing_date__gte=start_date)
    if end_date:
        bandwidth_query = bandwidth_query.filter(billing_date__lte=end_date)
    bandwidth_revenue = bandwidth_query.aggregate(total=Sum('total_bill'))['total'] or 0
    
    total_revenue = mac_revenue + soho_revenue + bandwidth_revenue
    
    return {
        'mac_revenue': float(mac_revenue),
        'soho_revenue': float(soho_revenue),
        'bandwidth_reseller_revenue': float(bandwidth_revenue),
        'total_revenue': float(total_revenue),
        'mac_percentage': (float(mac_revenue) / float(total_revenue) * 100) if total_revenue > 0 else 0,
        'soho_percentage': (float(soho_revenue) / float(total_revenue) * 100) if total_revenue > 0 else 0,
        'bandwidth_percentage': (float(bandwidth_revenue) / float(total_revenue) * 100) if total_revenue > 0 else 0,
    }


def get_daily_revenue_by_customer_type(start_date, end_date):
    """
    Get daily revenue breakdown by customer type for a date range.
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        list: Daily revenue data with breakdown by customer type
    """
    from .models import MACBill, SOHOBill, BillRecord
    from django.db.models import Sum
    from datetime import timedelta
    
    daily_data = []
    current_date = start_date
    
    while current_date <= end_date:
        # MAC Revenue for this day
        mac_revenue = MACBill.objects.filter(bill_date=current_date).aggregate(
            total=Sum('total_revenue')
        )['total'] or 0
        
        # SOHO Revenue for this day
        soho_revenue = SOHOBill.objects.filter(bill_date=current_date).aggregate(
            total=Sum('total_bill')
        )['total'] or 0
        
        # Bandwidth/Reseller Revenue for this day
        bandwidth_revenue = BillRecord.objects.filter(
            status='Active',
            billing_date=current_date
        ).aggregate(total=Sum('total_bill'))['total'] or 0
        
        total_revenue = mac_revenue + soho_revenue + bandwidth_revenue
        
        daily_data.append({
            'date': str(current_date),
            'mac_revenue': float(mac_revenue),
            'soho_revenue': float(soho_revenue),
            'bandwidth_reseller_revenue': float(bandwidth_revenue),
            'total_revenue': float(total_revenue),
        })
        
        current_date += timedelta(days=1)
    
    return daily_data


def get_weekly_revenue_by_customer_type(start_date, end_date):
    """
    Get weekly revenue breakdown by customer type.
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        list: Weekly revenue data with breakdown by customer type
    """
    from .models import MACBill, SOHOBill, BillRecord
    from django.db.models import Sum
    from django.db.models.functions import TruncWeek
    from datetime import timedelta
    
    # MAC Revenue by week
    mac_weekly = MACBill.objects.filter(
        bill_date__gte=start_date,
        bill_date__lte=end_date
    ).annotate(
        week=TruncWeek('bill_date')
    ).values('week').annotate(
        revenue=Sum('total_revenue')
    ).order_by('week')
    
    # SOHO Revenue by week
    soho_weekly = SOHOBill.objects.filter(
        bill_date__gte=start_date,
        bill_date__lte=end_date
    ).annotate(
        week=TruncWeek('bill_date')
    ).values('week').annotate(
        revenue=Sum('total_bill')
    ).order_by('week')
    
    # Bandwidth Revenue by week
    bandwidth_weekly = BillRecord.objects.filter(
        status='Active',
        billing_date__gte=start_date,
        billing_date__lte=end_date
    ).annotate(
        week=TruncWeek('billing_date')
    ).values('week').annotate(
        revenue=Sum('total_bill')
    ).order_by('week')
    
    # Combine into weekly data
    weekly_dict = {}
    
    for item in mac_weekly:
        week_str = item['week'].strftime('%Y-%m-%d')
        if week_str not in weekly_dict:
            weekly_dict[week_str] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        weekly_dict[week_str]['mac'] = float(item['revenue'] or 0)
    
    for item in soho_weekly:
        week_str = item['week'].strftime('%Y-%m-%d')
        if week_str not in weekly_dict:
            weekly_dict[week_str] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        weekly_dict[week_str]['soho'] = float(item['revenue'] or 0)
    
    for item in bandwidth_weekly:
        week_str = item['week'].strftime('%Y-%m-%d')
        if week_str not in weekly_dict:
            weekly_dict[week_str] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        weekly_dict[week_str]['bandwidth'] = float(item['revenue'] or 0)
    
    weekly_data = []
    for week, revenues in sorted(weekly_dict.items()):
        total = revenues['mac'] + revenues['soho'] + revenues['bandwidth']
        weekly_data.append({
            'week': week,
            'mac_revenue': revenues['mac'],
            'soho_revenue': revenues['soho'],
            'bandwidth_reseller_revenue': revenues['bandwidth'],
            'total_revenue': total,
        })
    
    return weekly_data


def get_monthly_revenue_by_customer_type(start_date, end_date):
    """
    Get monthly revenue breakdown by customer type.
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        list: Monthly revenue data with breakdown by customer type
    """
    from .models import MACBill, SOHOBill, BillRecord
    from django.db.models import Sum
    from django.db.models.functions import TruncMonth
    
    # MAC Revenue by month
    mac_monthly = MACBill.objects.filter(
        bill_date__gte=start_date,
        bill_date__lte=end_date
    ).annotate(
        month=TruncMonth('bill_date')
    ).values('month').annotate(
        revenue=Sum('total_revenue')
    ).order_by('month')
    
    # SOHO Revenue by month
    soho_monthly = SOHOBill.objects.filter(
        bill_date__gte=start_date,
        bill_date__lte=end_date
    ).annotate(
        month=TruncMonth('bill_date')
    ).values('month').annotate(
        revenue=Sum('total_bill')
    ).order_by('month')
    
    # Bandwidth Revenue by month
    bandwidth_monthly = BillRecord.objects.filter(
        status='Active',
        billing_date__gte=start_date,
        billing_date__lte=end_date
    ).annotate(
        month=TruncMonth('billing_date')
    ).values('month').annotate(
        revenue=Sum('total_bill')
    ).order_by('month')
    
    # Combine into monthly data
    monthly_dict = {}
    
    for item in mac_monthly:
        month_str = item['month'].strftime('%Y-%m')
        if month_str not in monthly_dict:
            monthly_dict[month_str] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        monthly_dict[month_str]['mac'] = float(item['revenue'] or 0)
    
    for item in soho_monthly:
        month_str = item['month'].strftime('%Y-%m')
        if month_str not in monthly_dict:
            monthly_dict[month_str] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        monthly_dict[month_str]['soho'] = float(item['revenue'] or 0)
    
    for item in bandwidth_monthly:
        month_str = item['month'].strftime('%Y-%m')
        if month_str not in monthly_dict:
            monthly_dict[month_str] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        monthly_dict[month_str]['bandwidth'] = float(item['revenue'] or 0)
    
    monthly_data = []
    for month, revenues in sorted(monthly_dict.items()):
        total = revenues['mac'] + revenues['soho'] + revenues['bandwidth']
        monthly_data.append({
            'month': month,
            'mac_revenue': revenues['mac'],
            'soho_revenue': revenues['soho'],
            'bandwidth_reseller_revenue': revenues['bandwidth'],
            'total_revenue': total,
        })
    
    return monthly_data


def get_yearly_revenue_by_customer_type(start_date, end_date):
    """
    Get yearly revenue breakdown by customer type.
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        list: Yearly revenue data with breakdown by customer type
    """
    from .models import MACBill, SOHOBill, BillRecord
    from django.db.models import Sum
    from django.db.models.functions import TruncYear
    
    # MAC Revenue by year
    mac_yearly = MACBill.objects.filter(
        bill_date__gte=start_date,
        bill_date__lte=end_date
    ).annotate(
        year=TruncYear('bill_date')
    ).values('year').annotate(
        revenue=Sum('total_revenue')
    ).order_by('year')
    
    # SOHO Revenue by year
    soho_yearly = SOHOBill.objects.filter(
        bill_date__gte=start_date,
        bill_date__lte=end_date
    ).annotate(
        year=TruncYear('bill_date')
    ).values('year').annotate(
        revenue=Sum('total_bill')
    ).order_by('year')
    
    # Bandwidth Revenue by year
    bandwidth_yearly = BillRecord.objects.filter(
        status='Active',
        billing_date__gte=start_date,
        billing_date__lte=end_date
    ).annotate(
        year=TruncYear('billing_date')
    ).values('year').annotate(
        revenue=Sum('total_bill')
    ).order_by('year')
    
    # Combine into yearly data
    yearly_dict = {}
    
    for item in mac_yearly:
        year = item['year'].year
        if year not in yearly_dict:
            yearly_dict[year] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        yearly_dict[year]['mac'] = float(item['revenue'] or 0)
    
    for item in soho_yearly:
        year = item['year'].year
        if year not in yearly_dict:
            yearly_dict[year] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        yearly_dict[year]['soho'] = float(item['revenue'] or 0)
    
    for item in bandwidth_yearly:
        year = item['year'].year
        if year not in yearly_dict:
            yearly_dict[year] = {'mac': 0, 'soho': 0, 'bandwidth': 0}
        yearly_dict[year]['bandwidth'] = float(item['revenue'] or 0)
    
    yearly_data = []
    for year, revenues in sorted(yearly_dict.items()):
        total = revenues['mac'] + revenues['soho'] + revenues['bandwidth']
        yearly_data.append({
            'year': year,
            'mac_revenue': revenues['mac'],
            'soho_revenue': revenues['soho'],
            'bandwidth_reseller_revenue': revenues['bandwidth'],
            'total_revenue': total,
        })
    
    return yearly_data


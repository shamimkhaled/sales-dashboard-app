from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F, Q, Case, When, Value, DecimalField
from django.db.models.functions import TruncWeek, TruncMonth, TruncYear, ExtractWeek, ExtractMonth, ExtractYear
from django.utils import timezone
from datetime import timedelta
from apps.authentication.permissions import RequirePermissions
from apps.bills.models import BillRecord
from apps.customers.models import Customer


class DashboardKPIsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required_permissions = ['dashboard:read']

    def get(self, request):
        # Current period (last 30 days)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)

        # Previous period (30 days before that)
        prev_end_date = start_date - timedelta(days=1)
        prev_start_date = prev_end_date - timedelta(days=30)

        # Total Revenue
        current_revenue = BillRecord.objects.filter(
            billing_date__range=[start_date, end_date],
            status='Active'
        ).aggregate(total=Sum('total_bill'))['total'] or 0

        prev_revenue = BillRecord.objects.filter(
            billing_date__range=[prev_start_date, prev_end_date],
            status='Active'
        ).aggregate(total=Sum('total_bill'))['total'] or 0

        revenue_change = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0

        # Total Customers
        current_customers = Customer.objects.filter(created_at__date__range=[start_date, end_date]).count()
        prev_customers = Customer.objects.filter(created_at__date__range=[prev_start_date, prev_end_date]).count()
        customers_change = ((current_customers - prev_customers) / prev_customers * 100) if prev_customers > 0 else 0

        # Active Customers
        current_active = Customer.objects.filter(status='Active').count()
        prev_active = Customer.objects.filter(
            status='Active',
            created_at__date__lte=prev_end_date
        ).count()
        active_change = ((current_active - prev_active) / prev_active * 100) if prev_active > 0 else 0

        # Collection Rate
        bills_data = BillRecord.objects.filter(
            billing_date__range=[start_date, end_date],
            status='Active'
        ).aggregate(
            total_billed=Sum('total_bill'),
            total_received=Sum('total_received')
        )
        total_billed = bills_data['total_billed'] or 0
        total_received = bills_data['total_received'] or 0
        current_collection_rate = (total_received / total_billed * 100) if total_billed > 0 else 0

        prev_bills_data = BillRecord.objects.filter(
            billing_date__range=[prev_start_date, prev_end_date],
            status='Active'
        ).aggregate(
            total_billed=Sum('total_bill'),
            total_received=Sum('total_received')
        )
        prev_total_billed = prev_bills_data['total_billed'] or 0
        prev_total_received = prev_bills_data['total_received'] or 0
        prev_collection_rate = (prev_total_received / prev_total_billed * 100) if prev_total_billed > 0 else 0
        collection_change = current_collection_rate - prev_collection_rate

        return Response({
            'total_revenue': float(current_revenue),
            'total_revenue_change': round(revenue_change, 2),
            'total_customers': Customer.objects.count(),
            'total_customers_change': round(customers_change, 2),
            'active_customers': current_active,
            'active_customers_change': round(active_change, 2),
            'collection_rate': round(current_collection_rate, 2),
            'collection_rate_change': round(collection_change, 2),
        })


class WeeklyRevenueView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required_permissions = ['dashboard:read']

    def get(self, request):
        # Get last 12 weeks
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=12)

        weekly_data = BillRecord.objects.filter(
            billing_date__range=[start_date, end_date],
            status='Active'
        ).annotate(
            week=TruncWeek('billing_date')
        ).values('week').annotate(
            revenue=Sum('total_bill')
        ).order_by('week')

        data = []
        for item in weekly_data:
            data.append({
                'week': item['week'].strftime('%Y-%m-%d'),
                'revenue': float(item['revenue'] or 0)
            })

        return Response(data)


class MonthlyRevenueView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required_permissions = ['dashboard:read']

    def get(self, request):
        # Get last 12 months
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365)

        monthly_data = BillRecord.objects.filter(
            billing_date__range=[start_date, end_date],
            status='Active'
        ).annotate(
            month=TruncMonth('billing_date')
        ).values('month').annotate(
            revenue=Sum('total_bill')
        ).order_by('month')

        data = []
        for item in monthly_data:
            data.append({
                'month': item['month'].strftime('%Y-%m'),
                'revenue': float(item['revenue'] or 0)
            })

        return Response(data)


class YearlyRevenueView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required_permissions = ['dashboard:read']

    def get(self, request):
        # Get last 5 years
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=365*5)

        yearly_data = BillRecord.objects.filter(
            billing_date__range=[start_date, end_date],
            status='Active'
        ).annotate(
            year=TruncYear('billing_date')
        ).values('year').annotate(
            revenue=Sum('total_bill')
        ).order_by('year')

        data = []
        for item in yearly_data:
            data.append({
                'year': item['year'].year,
                'revenue': float(item['revenue'] or 0)
            })

        return Response(data)


class CustomerWiseRevenueView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required_permissions = ['dashboard:read']

    def get(self, request):
        customer_data = Customer.objects.annotate(
            total_revenue=Sum('bill_records__total_bill'),
            total_received=Sum('bill_records__total_received'),
            total_due=Sum('bill_records__total_due'),
            total_billed=Sum('bill_records__total_bill'),
            kam_name=F('assigned_sales_person__username')
        ).values(
            'id', 'name', 'email', 'status', 'created_at', 'kam_name',
            'total_revenue', 'total_received', 'total_due', 'total_billed'
        ).order_by('-total_revenue')

        data = []
        for customer in customer_data:
            total_billed = customer['total_billed'] or 0
            total_received = customer['total_received'] or 0
            collection_rate = (total_received / total_billed * 100) if total_billed > 0 else 0

            data.append({
                'customer_id': customer['id'],
                'customerName': customer['name'],
                'email': customer['email'],
                'status': customer['status'],
                'joinDate': customer['created_at'].strftime('%Y-%m-%d') if customer['created_at'] else None,
                'leaveDate': None,  # Assuming no leave date in current model
                'totalRevenue': float(customer['total_revenue'] or 0),
                'totalDue': float(customer['total_due'] or 0),
                'collectionRate': round(collection_rate, 2),
                'kam': customer['kam_name'] or 'Unassigned'
            })

        return Response(data)


class KAMPerformanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    required_permissions = ['dashboard:read']

    def get(self, request):
        kam_data = Customer.objects.values(
            kam_name=F('assigned_sales_person__username'),
            kam_id=F('assigned_sales_person__id')
        ).annotate(
            total_customers=Count('id'),
            active_customers=Count(Case(When(status='Active', then=1))),
            total_revenue=Sum('bill_records__total_bill')
        ).filter(kam_name__isnull=False).order_by('-total_revenue')

        data = []
        for kam in kam_data:
            total_revenue = kam['total_revenue'] or 0
            avg_revenue = (total_revenue / kam['total_customers']) if kam['total_customers'] > 0 else 0
            data.append({
                'kam': kam['kam_name'],
                'kam_id': kam['kam_id'],
                'total_customers': kam['total_customers'],
                'active_customers': kam['active_customers'],
                'total_revenue': float(total_revenue),
                'avg_revenue_per_customer': round(float(avg_revenue), 2)
            })

        return Response(data)
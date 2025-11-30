"""
REST API Views for Bills App - Invoices and Entitlements
"""
from rest_framework import viewsets, generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count, Max
from django.utils import timezone
from datetime import datetime, date, timedelta
from decimal import Decimal

from .models import InvoiceMaster, InvoiceDetails
from apps.customers.models import CustomerMaster
from .serializers import (
    InvoiceMasterSerializer,
    InvoiceMasterCreateSerializer,
    InvoiceDetailsSerializer,
)
from apps.authentication.permissions import RequirePermissions


class InvoiceMasterViewSet(viewsets.ModelViewSet):
    """Full CRUD for Invoice Master with auto-calculation"""
    queryset = InvoiceMaster.objects.select_related(
        'customer_entitlement_master_id__customer_master_id',
        'information_master_id',
        'created_by'
    ).prefetch_related('details')
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer_entitlement_master_id__customer_master_id']
    search_fields = ['invoice_number', 'customer_entitlement_master_id__bill_number']
    ordering_fields = ['created_at', 'issue_date', 'total_bill_amount']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceMasterCreateSerializer
        return InvoiceMasterSerializer
    
    def get_queryset(self):
        qs = self.queryset
        customer_id = self.request.query_params.get('customer_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if customer_id:
            qs = qs.filter(
                customer_entitlement_master_id__customer_master_id_id=customer_id
            )
        if start_date:
            qs = qs.filter(issue_date__gte=start_date)
        if end_date:
            qs = qs.filter(issue_date__lte=end_date)
        
        return qs
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        invoice = serializer.save()
        # Recalculate totals if needed
        self._recalculate_totals(invoice)
        # Update customer's last_bill_invoice_date
        customer = invoice.customer_entitlement_master_id.customer_master_id
        customer.last_bill_invoice_date = timezone.now()
        customer.save(update_fields=['last_bill_invoice_date'])
    
    def _recalculate_totals(self, invoice):
        """Recalculate invoice totals from details"""
        details = invoice.details.all()
        total_subtotal = sum(detail.sub_total for detail in details)
        total_vat = sum(
            detail.sub_total * (detail.vat_rate / Decimal('100'))
            for detail in details
        )
        total_discount = sum(
            detail.sub_total * (detail.sub_discount_rate / Decimal('100'))
            for detail in details
        )
        
        invoice.total_bill_amount = total_subtotal + total_vat - total_discount
        invoice.total_vat_amount = total_vat
        invoice.total_discount_amount = total_discount
        invoice.total_balance_due = invoice.total_bill_amount - invoice.total_paid_amount
        invoice.save(update_fields=[
            'total_bill_amount', 'total_vat_amount', 'total_discount_amount', 'total_balance_due'
        ])
    
    @action(detail=False, methods=['post'])
    def auto_generate(self, request):
        """Auto-generate invoice from entitlement"""
        entitlement_id = request.data.get('entitlement_id')
        if not entitlement_id:
            return Response(
                {'error': 'entitlement_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.bills.models import CustomerEntitlementMaster
        try:
            entitlement = CustomerEntitlementMaster.objects.get(id=entitlement_id)
        except CustomerEntitlementMaster.DoesNotExist:
            return Response(
                {'error': 'Entitlement not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if invoice already exists
        if InvoiceMaster.objects.filter(
            customer_entitlement_master_id=entitlement
        ).exists():
            return Response(
                {'error': 'Invoice already exists for this entitlement'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get utility info (use first active one or create default)
        from apps.utility.models import UtilityInformationMaster
        utility = UtilityInformationMaster.objects.filter(is_active=True).first()
        if not utility:
            utility = UtilityInformationMaster.objects.create(
                vat_rate=Decimal('15'),
                terms_condition='Standard payment terms apply',
                is_active=True
            )
        
        # Create invoice
        invoice_data = {
            'customer_entitlement_master_id': entitlement,
            'issue_date': date.today(),
            'information_master_id': utility,
            'status': 'draft',
            'auto_calculate': True,
        }
        
        serializer = InvoiceMasterCreateSerializer(data=invoice_data)
        if serializer.is_valid():
            invoice = serializer.save(created_by=request.user)
            result_serializer = InvoiceMasterSerializer(invoice)
            return Response(result_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get invoice history with filters"""
        customer_id = request.query_params.get('customer_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        period = request.query_params.get('period')  # 'monthly', 'weekly', etc.
        
        queryset = self.get_queryset()
        
        if customer_id:
            queryset = queryset.filter(
                customer_entitlement_master_id__customer_master_id_id=customer_id
            )
        
        if period == 'monthly':
            # Get current month
            today = date.today()
            start_date = date(today.year, today.month, 1)
            end_date = today
        elif period == 'weekly':
            # Get current week
            today = date.today()
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        
        if start_date:
            queryset = queryset.filter(issue_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(issue_date__lte=end_date)
        
        serializer = self.get_serializer(queryset.order_by('-issue_date'), many=True)
        
        # Calculate totals
        totals = queryset.aggregate(
            total_billed=Sum('total_bill_amount'),
            total_paid=Sum('total_paid_amount'),
            total_due=Sum('total_balance_due')
        )
        
        return Response({
            'invoices': serializer.data,
            'count': queryset.count(),
            'totals': {
                'total_billed': float(totals['total_billed'] or Decimal('0')),
                'total_paid': float(totals['total_paid'] or Decimal('0')),
                'total_due': float(totals['total_due'] or Decimal('0')),
            }
        })


class InvoiceDetailsViewSet(viewsets.ModelViewSet):
    """Full CRUD for Invoice Details"""
    queryset = InvoiceDetails.objects.select_related(
        'invoice_master_id', 'entitlement_details_id'
    )
    serializer_class = InvoiceDetailsSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['invoice_master_id']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.required_permissions = ['invoices:create']
        elif self.action == 'destroy':
            self.required_permissions = ['invoices:update']
        return InvoiceDetailsSerializer
    
    def perform_create(self, serializer):
        detail = serializer.save()
        # Recalculate invoice totals
        self._recalculate_invoice_totals(detail.invoice_master_id)
    
    def perform_update(self, serializer):
        detail = serializer.save()
        # Recalculate invoice totals
        self._recalculate_invoice_totals(detail.invoice_master_id)
    
    def perform_destroy(self, instance):
        invoice = instance.invoice_master_id
        instance.delete()
        # Recalculate invoice totals
        self._recalculate_invoice_totals(invoice)
    
    def _recalculate_invoice_totals(self, invoice):
        """Recalculate invoice totals"""
        details = invoice.details.all()
        total_subtotal = sum(detail.sub_total for detail in details)
        total_vat = sum(
            detail.sub_total * (detail.vat_rate / Decimal('100'))
            for detail in details
        )
        total_discount = sum(
            detail.sub_total * (detail.sub_discount_rate / Decimal('100'))
            for detail in details
        )
        
        invoice.total_bill_amount = total_subtotal + total_vat - total_discount
        invoice.total_vat_amount = total_vat
        invoice.total_discount_amount = total_discount
        invoice.total_balance_due = invoice.total_bill_amount - invoice.total_paid_amount
        invoice.save(update_fields=[
            'total_bill_amount', 'total_vat_amount', 'total_discount_amount', 'total_balance_due'
        ])


"""
REST API Views for Payment App
"""
from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime, date
from decimal import Decimal

from .models import PaymentMaster, PaymentDetails
from .serializers import (
    PaymentMasterSerializer,
    PaymentDetailsSerializer,
    PaymentDetailsCreateSerializer,
)
from apps.authentication.permissions import RequirePermissions


class PaymentMasterViewSet(viewsets.ModelViewSet):
    """Full CRUD for Payment Master"""
    queryset = PaymentMaster.objects.select_related(
        'customer_entitlement_master_id__customer_master_id',
        'invoice_master_id',
        'received_by',
        'created_by'
    ).prefetch_related('details')
    serializer_class = PaymentMasterSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'payment_method', 'invoice_master_id']
    search_fields = ['invoice_master_id__invoice_number', 'transaction_id']
    ordering_fields = ['created_at', 'payment_date']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.required_permissions = ['bills:create']
        elif self.action == 'destroy':
            self.required_permissions = ['bills:update']
        return PaymentMasterSerializer
    
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
            qs = qs.filter(payment_date__gte=start_date)
        if end_date:
            qs = qs.filter(payment_date__lte=end_date)
        
        return qs
    
    def perform_create(self, serializer):
        payment = serializer.save(
            created_by=self.request.user,
            received_by=self.request.user
        )
        # Update invoice payment status will be handled by serializer
    
    def perform_update(self, serializer):
        serializer.save()
        # Update invoice payment status will be handled by serializer
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get payment history with filters"""
        customer_id = request.query_params.get('customer_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        invoice_id = request.query_params.get('invoice_id')
        
        queryset = self.get_queryset()
        
        if customer_id:
            queryset = queryset.filter(
                customer_entitlement_master_id__customer_master_id_id=customer_id
            )
        if invoice_id:
            queryset = queryset.filter(invoice_master_id_id=invoice_id)
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        serializer = self.get_serializer(queryset.order_by('-payment_date'), many=True)
        
        # Calculate totals
        totals = queryset.aggregate(
            total_received=Sum('details__pay_amount')
        )
        
        return Response({
            'payments': serializer.data,
            'count': queryset.count(),
            'total_received': float(totals['total_received'] or Decimal('0'))
        })
    
    @action(detail=False, methods=['get'])
    def by_customer(self, request):
        """Get total received amount per customer"""
        customer_id = request.query_params.get('customer_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.get_queryset()
        
        if customer_id:
            queryset = queryset.filter(
                customer_entitlement_master_id__customer_master_id_id=customer_id
            )
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        # Group by customer and sum payments
        from apps.customers.models import CustomerMaster
        customers = CustomerMaster.objects.filter(
            id__in=queryset.values_list(
                'customer_entitlement_master_id__customer_master_id_id',
                flat=True
            ).distinct()
        )
        
        result = []
        for customer in customers:
            customer_payments = queryset.filter(
                customer_entitlement_master_id__customer_master_id=customer
            )
            total = customer_payments.aggregate(
                total=Sum('details__pay_amount')
            )['total'] or Decimal('0')
            
            result.append({
                'customer_id': customer.id,
                'customer_name': customer.customer_name,
                'total_received': float(total),
                'payment_count': customer_payments.count()
            })
        
        return Response(result)


class PaymentDetailsViewSet(viewsets.ModelViewSet):
    """Full CRUD for Payment Details"""
    queryset = PaymentDetails.objects.select_related(
        'payment_master_id', 'received_by', 'created_by'
    )
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['payment_master_id', 'status']
    search_fields = ['transaction_id']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentDetailsCreateSerializer
        return PaymentDetailsSerializer
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.required_permissions = ['bills:create']
        elif self.action == 'destroy':
            self.required_permissions = ['bills:update']
        if self.action == 'create':
            return PaymentDetailsCreateSerializer
        return PaymentDetailsSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, received_by=self.request.user)
        # Invoice update handled by serializer
    
    def perform_update(self, serializer):
        detail = serializer.save()
        # Update invoice payment
        payment = detail.payment_master_id
        invoice = payment.invoice_master_id
        
        total_paid = payment.details.aggregate(total=Sum('pay_amount'))['total'] or Decimal('0')
        invoice.total_paid_amount = total_paid
        invoice.total_balance_due = invoice.total_bill_amount - total_paid
        
        if invoice.total_balance_due == 0:
            invoice.status = 'paid'
        elif total_paid > 0:
            invoice.status = 'partial'
        
        invoice.save(update_fields=[
            'total_paid_amount', 'total_balance_due', 'status'
        ])


"""
REST API Views for Customer Master, KAM Master, and Entitlements
"""
from rest_framework import generics, permissions, filters, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.db import models
from django.utils import timezone
from datetime import datetime, date
from decimal import Decimal

from .models import KAMMaster, CustomerMaster
from apps.bills.models import CustomerEntitlementMaster, CustomerEntitlementDetails
from .serializers import (
    KAMMasterSerializer,
    CustomerMasterSerializer,
    CustomerEntitlementMasterSerializer,
    CustomerEntitlementDetailsSerializer,
    BulkEntitlementDetailsCreateSerializer,
    BandwidthEntitlementDetailSerializer,
    ChannelPartnerEntitlementDetailSerializer,
)
from apps.authentication.permissions import RequirePermissions


# ==================== KAM Master Views ====================

class KAMMasterListView(generics.ListAPIView):
    """GET only - List all KAM Masters"""
    queryset = KAMMaster.objects.filter(is_active=True)
    serializer_class = KAMMasterSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['kam_name', 'email', 'phone']
    ordering_fields = ['kam_name', 'created_at']


class KAMMasterDetailView(generics.RetrieveAPIView):
    """GET only - Retrieve single KAM Master"""
    queryset = KAMMaster.objects.all()
    serializer_class = KAMMasterSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:read']


# ==================== Customer Master Views ====================

class CustomerMasterViewSet(viewsets.ModelViewSet):
    """Full CRUD for Customer Master"""
    queryset = CustomerMaster.objects.all()
    serializer_class = CustomerMasterSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer_type', 'status', 'is_active', 'kam_id']
    search_fields = ['customer_name', 'email', 'phone', 'customer_number', 'company_name']
    ordering_fields = ['customer_name', 'created_at', 'last_bill_invoice_date']
    
    def get_queryset(self):
        qs = CustomerMaster.objects.select_related('kam_id', 'created_by').prefetch_related('entitlements')
        user = self.request.user
        
        # Filter by KAM if user is sales_person
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(kam_id__kam_name=user.username)
        
        return qs
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.required_permissions = ['customers:update']
        elif self.action == 'destroy':
            self.required_permissions = ['customers:update']
        return CustomerMasterSerializer
    
    @action(detail=True, methods=['get'])
    def entitlements(self, request, pk=None):
        """Get all entitlements for a customer"""
        customer = self.get_object()
        entitlements = CustomerEntitlementMaster.objects.filter(
            customer_master_id=customer
        ).prefetch_related('details')
        serializer = CustomerEntitlementMasterSerializer(entitlements, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def invoices(self, request, pk=None):
        """Get all invoices for a customer"""
        from apps.bills.models import InvoiceMaster
        customer = self.get_object()
        invoices = InvoiceMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=customer
        )
        from apps.bills.serializers import InvoiceMasterSerializer
        serializer = InvoiceMasterSerializer(invoices, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def payments(self, request, pk=None):
        """Get all payments for a customer"""
        from apps.payment.models import PaymentMaster
        customer = self.get_object()
        payments = PaymentMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=customer
        )
        from apps.payment.serializers import PaymentMasterSerializer
        serializer = PaymentMasterSerializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """Get payment history with date range filter"""
        from apps.payment.models import PaymentMaster
        customer = self.get_object()
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        payments = PaymentMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=customer
        )
        
        if start_date:
            payments = payments.filter(payment_date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__lte=end_date)
        
        from apps.payment.serializers import PaymentMasterSerializer
        serializer = PaymentMasterSerializer(payments.order_by('-payment_date'), many=True)
        
        # Calculate totals
        total_received = payments.aggregate(
            total=Sum('details__pay_amount')
        )['total'] or Decimal('0')
        
        return Response({
            'payments': serializer.data,
            'total_received': float(total_received),
            'count': payments.count()
        })
    
    @action(detail=True, methods=['get'])
    def bill_history(self, request, pk=None):
        """Get bill/invoice history with date range filter"""
        from apps.bills.models import InvoiceMaster
        customer = self.get_object()
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        period = request.query_params.get('period')  # 'monthly', 'weekly', etc.
        
        invoices = InvoiceMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=customer
        )
        
        if start_date:
            invoices = invoices.filter(issue_date__gte=start_date)
        if end_date:
            invoices = invoices.filter(issue_date__lte=end_date)
        
        from apps.bills.serializers import InvoiceMasterSerializer
        serializer = InvoiceMasterSerializer(invoices.order_by('-issue_date'), many=True)
        
        return Response({
            'invoices': serializer.data,
            'count': invoices.count(),
            'total_billed': float(invoices.aggregate(total=Sum('total_bill_amount'))['total'] or Decimal('0'))
        })
    
    @action(detail=True, methods=['get'])
    def last_bill(self, request, pk=None):
        """Get last bill/invoice for customer"""
        from apps.bills.models import InvoiceMaster
        customer = self.get_object()
        last_invoice = InvoiceMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=customer
        ).order_by('-issue_date').first()
        
        if last_invoice:
            from apps.bills.serializers import InvoiceMasterSerializer
            serializer = InvoiceMasterSerializer(last_invoice)
            return Response(serializer.data)
        return Response({'detail': 'No bills found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def previous_bill(self, request, pk=None):
        """Get previous bill (second to last)"""
        from apps.bills.models import InvoiceMaster
        customer = self.get_object()
        invoices = InvoiceMaster.objects.filter(
            customer_entitlement_master_id__customer_master_id=customer
        ).order_by('-issue_date')[:2]
        
        if len(invoices) > 1:
            from apps.bills.serializers import InvoiceMasterSerializer
            serializer = InvoiceMasterSerializer(invoices[1])
            return Response(serializer.data)
        return Response({'detail': 'No previous bill found'}, status=status.HTTP_404_NOT_FOUND)


# ==================== Customer Entitlement Master Views ====================

class CustomerEntitlementMasterViewSet(viewsets.ModelViewSet):
    """Full CRUD for Customer Entitlement Master"""
    queryset = CustomerEntitlementMaster.objects.select_related(
        'customer_master_id', 'created_by'
    ).prefetch_related('details')
    serializer_class = CustomerEntitlementMasterSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['customer_master_id', 'activation_date']
    search_fields = ['bill_number', 'customer_master_id__customer_name']
    ordering_fields = ['created_at', 'activation_date', 'bill_number']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.required_permissions = ['bills:create']
        elif self.action == 'destroy':
            self.required_permissions = ['bills:update']
        return CustomerEntitlementMasterSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        # Update customer's last_bill_invoice_date
        entitlement = serializer.instance
        customer = entitlement.customer_master_id
        customer.last_bill_invoice_date = timezone.now()
        customer.save(update_fields=['last_bill_invoice_date'])
    
    @action(detail=True, methods=['get', 'post'])
    def details(self, request, pk=None):
        """Get or create entitlement details"""
        entitlement = self.get_object()
        
        if request.method == 'GET':
            details = entitlement.details.all()
            serializer = CustomerEntitlementDetailsSerializer(details, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Handle bulk creation of details
            serializer = BulkEntitlementDetailsCreateSerializer(data=request.data)
            if serializer.is_valid():
                entitlement_id = serializer.validated_data['entitlement_master_id']
                entitlement = CustomerEntitlementMaster.objects.get(id=entitlement_id)
                customer = entitlement.customer_master_id
                created_details = []
                
                # Create bandwidth details
                if 'bandwidth_details' in serializer.validated_data:
                    for detail_data in serializer.validated_data['bandwidth_details']:
                        bandwidth_type = detail_data.get('bandwidth_type', 'ipt')
                        remarks = f"{bandwidth_type.upper()} - {detail_data.get('remarks', '')}".strip()
                        
                        detail = CustomerEntitlementDetails.objects.create(
                            cust_entitlement_id=entitlement,
                            type='bw',  # Customer type is 'bw' for bandwidth
                            mbps=detail_data['mbps'],
                            unit_price=detail_data['unit_price'],
                            start_date=detail_data['start_date'],
                            end_date=detail_data['end_date'],
                            package_pricing_id_id=detail_data.get('package_pricing_id'),
                            is_active=detail_data.get('is_active', True),
                            status=detail_data.get('status', 'active'),
                            remarks=remarks,  # Store bandwidth type (ipt, gcc, etc.) in remarks
                            created_by=request.user
                        )
                        created_details.append(detail)
                
                # Create channel partner details
                if 'channel_partner_details' in serializer.validated_data:
                    for detail_data in serializer.validated_data['channel_partner_details']:
                        detail = CustomerEntitlementDetails.objects.create(
                            cust_entitlement_id=entitlement,
                            type='channel_partner',
                            mbps=detail_data['mbps'],
                            unit_price=detail_data['unit_price'],
                            custom_mac_percentage_share=detail_data['custom_mac_percentage_share'],
                            start_date=detail_data['start_date'],
                            end_date=detail_data['end_date'],
                            package_pricing_id_id=detail_data.get('package_pricing_id'),
                            is_active=detail_data.get('is_active', True),
                            status=detail_data.get('status', 'active'),
                            created_by=request.user
                        )
                        created_details.append(detail)
                
                result_serializer = CustomerEntitlementDetailsSerializer(created_details, many=True)
                return Response(result_serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== Customer Entitlement Details Views ====================

class CustomerEntitlementDetailsViewSet(viewsets.ModelViewSet):
    """Full CRUD for Customer Entitlement Details"""
    queryset = CustomerEntitlementDetails.objects.select_related(
        'cust_entitlement_id', 'package_pricing_id', 'created_by'
    )
    serializer_class = CustomerEntitlementDetailsSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['cust_entitlement_id', 'type', 'status', 'is_active']
    search_fields = ['cust_entitlement_id__bill_number']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            self.required_permissions = ['bills:create']
        elif self.action == 'destroy':
            self.required_permissions = ['bills:update']
        return CustomerEntitlementDetailsSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        # Update last_changes_updated_date
        detail = serializer.instance
        detail.last_changes_updated_date = date.today()
        detail.save(update_fields=['last_changes_updated_date'])
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        # Update last_changes_updated_date
        detail = serializer.instance
        detail.last_changes_updated_date = date.today()
        detail.save(update_fields=['last_changes_updated_date'])
    
    @action(detail=False, methods=['get'])
    def bandwidth_types(self, request):
        """Get all bandwidth entitlement details grouped by bandwidth type (ipt, gcc, cdn, nix, baishan)"""
        customer_id = request.query_params.get('customer_id')
        queryset = self.get_queryset().filter(
            type='bw',
            is_active=True
        )
        
        if customer_id:
            queryset = queryset.filter(
                cust_entitlement_id__customer_master_id_id=customer_id
            )
        
        # Group by bandwidth type extracted from remarks
        result = {
            'ipt': [],
            'gcc': [],
            'cdn': [],
            'nix': [],
            'baishan': [],
            'other': []
        }
        
        for detail in queryset:
            serializer = CustomerEntitlementDetailsSerializer(detail)
            data = serializer.data
            bw_type = data.get('bandwidth_type', 'other')
            if bw_type in result:
                result[bw_type].append(data)
            else:
                result['other'].append(data)
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get entitlement details history with date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        customer_id = request.query_params.get('customer_id')
        
        queryset = self.get_queryset()
        
        if customer_id:
            queryset = queryset.filter(
                cust_entitlement_id__customer_master_id_id=customer_id
            )
        
        if start_date:
            queryset = queryset.filter(start_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(end_date__lte=end_date)
        
        serializer = self.get_serializer(queryset.order_by('-created_at'), many=True)
        return Response(serializer.data)


from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Invoice, InvoiceItem
from .serializers import (
    InvoiceSerializer,
    InvoiceCreateSerializer,
    InvoiceUpdateSerializer,
    InvoiceItemSerializer
)
from apps.bills.models import BillRecord
from apps.authentication.permissions import RequirePermissions
from .utils import create_invoice_from_bill


class InvoiceListCreateView(generics.ListCreateAPIView):
    """
    List all invoices or create a new invoice from a bill
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'invoice_format', 'issue_date']
    search_fields = ['invoice_number', 'bill_record__customer__name', 'bill_record__customer__company_name']
    ordering_fields = ['issue_date', 'due_date', 'total_amount', 'created_at']
    
    def get_queryset(self):
        qs = Invoice.objects.select_related(
            'bill_record',
            'bill_record__customer',
            'created_by'
        ).prefetch_related('items').all()
        
        user = self.request.user
        # Sales person restriction via assigned customers
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(bill_record__customer__kam=user)
        
        return qs
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvoiceCreateSerializer
        return InvoiceSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        self.required_permissions = ['invoices:create']
        serializer.save(created_by=self.request.user)


class InvoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete an invoice
    """
    queryset = Invoice.objects.select_related(
        'bill_record',
        'bill_record__customer',
        'created_by'
    ).prefetch_related('items').all()
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:update']
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return InvoiceUpdateSerializer
        return InvoiceSerializer


class GenerateInvoiceFromBillView(APIView):
    """
    Easily generate an invoice from a bill record
    POST /api/invoices/generate-from-bill/
    Body: {
        "bill_record_id": 1,
        "invoice_format": "ITS",  // or "INT"
        "issue_date": "2025-11-17",
        "due_date": "2025-12-17",
        "auto_populate_items": true
    }
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:create']
    
    def post(self, request):
        bill_record_id = request.data.get('bill_record_id')
        invoice_format = request.data.get('invoice_format', 'ITS')
        auto_populate_items = request.data.get('auto_populate_items', True)
        
        if not bill_record_id:
            return Response(
                {'detail': 'bill_record_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bill_record = BillRecord.objects.select_related('customer').get(pk=bill_record_id)
        except BillRecord.DoesNotExist:
            return Response(
                {'detail': 'Bill record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if invoice already exists
        if hasattr(bill_record, 'invoice'):
            return Response(
                {
                    'detail': 'This bill record already has an invoice',
                    'invoice_id': bill_record.invoice.id,
                    'invoice_number': bill_record.invoice.invoice_number
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create invoice
        try:
            invoice = create_invoice_from_bill(
                bill_record=bill_record,
                invoice_format=invoice_format,
                auto_populate_items=auto_populate_items,
                issue_date=request.data.get('issue_date'),
                due_date=request.data.get('due_date'),
                notes=request.data.get('notes', ''),
                terms=request.data.get('terms', ''),
                tax_amount=request.data.get('tax_amount', 0),
                discount_amount=request.data.get('discount_amount'),
                created_by=request.user
            )
            
            serializer = InvoiceSerializer(invoice)
            return Response({
                'success': True,
                'message': 'Invoice generated successfully from bill',
                'invoice': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'detail': f'Failed to create invoice: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class InvoiceByBillView(APIView):
    """
    Get invoice for a specific bill record
    GET /api/invoices/by-bill/<bill_id>/
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:read']
    
    def get(self, request, bill_id):
        try:
            bill_record = BillRecord.objects.get(pk=bill_id)
        except BillRecord.DoesNotExist:
            return Response(
                {'detail': 'Bill record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if hasattr(bill_record, 'invoice'):
            serializer = InvoiceSerializer(bill_record.invoice)
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'No invoice found for this bill record'},
                status=status.HTTP_404_NOT_FOUND
            )


class InvoiceMarkAsIssuedView(APIView):
    """
    Mark invoice as issued
    POST /api/invoices/<id>/mark-as-issued/
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:update']
    
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response(
                {'detail': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        invoice.mark_as_issued()
        serializer = InvoiceSerializer(invoice)
        return Response({
            'success': True,
            'message': 'Invoice marked as issued',
            'invoice': serializer.data
        })


class InvoiceMarkAsPaidView(APIView):
    """
    Mark invoice as paid (full or partial payment)
    POST /api/invoices/<id>/mark-as-paid/
    Body: {
        "amount": 1000.00  // Optional, defaults to full amount
    }
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:update']
    
    def post(self, request, pk):
        try:
            invoice = Invoice.objects.get(pk=pk)
        except Invoice.DoesNotExist:
            return Response(
                {'detail': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        payment_amount = request.data.get('amount', None)
        if payment_amount:
            invoice.mark_as_paid(amount=float(payment_amount))
        else:
            invoice.mark_as_paid()
        serializer = InvoiceSerializer(invoice)
        return Response({
            'success': True,
            'message': 'Invoice payment recorded',
            'invoice': serializer.data
        })


class InvoiceListByCustomerView(APIView):
    """
    Get all invoices for a specific customer
    GET /api/invoices/by-customer/<customer_id>/
    Returns all invoices based on bill records for this customer
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:read']
    
    def get(self, request, customer_id):
        # Get all invoices for bills belonging to this customer
        invoices = Invoice.objects.filter(
            bill_record__customer_id=customer_id
        ).select_related(
            'bill_record',
            'bill_record__customer',
            'created_by'
        ).prefetch_related('items').order_by('-issue_date')
        
        # Get customer info
        from apps.customers.models import Customer
        try:
            customer = Customer.objects.get(pk=customer_id)
            customer_info = {
                'id': customer.id,
                'name': customer.name,
                'company_name': customer.company_name,
                'email': customer.email,
            }
        except Customer.DoesNotExist:
            customer_info = None
        
        serializer = InvoiceSerializer(invoices, many=True)
        return Response({
            'customer': customer_info,
            'count': invoices.count(),
            'invoices': serializer.data
        })


class BillsWithoutInvoiceView(APIView):
    """
    Get all bill records for a customer that don't have an invoice yet
    GET /api/invoices/bills-without-invoice/?customer_id=1
    Useful for finding bills that need invoices
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:read', 'bills:read']
    
    def get(self, request):
        customer_id = request.query_params.get('customer_id')
        
        if not customer_id:
            return Response(
                {'detail': 'customer_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get bills that don't have invoices
        bills_without_invoice = BillRecord.objects.filter(
            customer_id=customer_id
        ).exclude(
            invoice__isnull=False
        ).select_related('customer').order_by('-billing_date', '-created_at')
        
        from apps.bills.serializers import BillRecordSerializer
        serializer = BillRecordSerializer(bills_without_invoice, many=True)
        
        return Response({
            'customer_id': int(customer_id),
            'count': bills_without_invoice.count(),
            'bills': serializer.data
        })


class GenerateInvoicesForCustomerBillsView(APIView):
    """
    Generate invoices for all bills of a customer that don't have invoices
    POST /api/invoices/generate-for-customer-bills/
    Body: {
        "customer_id": 1,
        "invoice_format": "ITS",
        "auto_populate_items": true
    }
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['invoices:create']
    
    def post(self, request):
        customer_id = request.data.get('customer_id')
        invoice_format = request.data.get('invoice_format', 'ITS')
        auto_populate_items = request.data.get('auto_populate_items', True)
        
        if not customer_id:
            return Response(
                {'detail': 'customer_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get bills without invoices
        bills_without_invoice = BillRecord.objects.filter(
            customer_id=customer_id
        ).exclude(
            invoice__isnull=False
        ).select_related('customer')
        
        if not bills_without_invoice.exists():
            return Response({
                'success': True,
                'message': 'All bills for this customer already have invoices',
                'invoices_created': 0,
                'invoices': []
            })
        
        # Generate invoices for each bill
        created_invoices = []
        errors = []
        
        for bill in bills_without_invoice:
            try:
                invoice = create_invoice_from_bill(
                    bill_record=bill,
                    invoice_format=invoice_format,
                    auto_populate_items=auto_populate_items,
                    created_by=request.user
                )
                created_invoices.append(invoice)
            except Exception as e:
                errors.append({
                    'bill_id': bill.id,
                    'error': str(e)
                })
        
        serializer = InvoiceSerializer(created_invoices, many=True)
        
        return Response({
            'success': len(errors) == 0,
            'message': f'Generated {len(created_invoices)} invoices for customer {customer_id}',
            'invoices_created': len(created_invoices),
            'errors': errors,
            'invoices': serializer.data
        }, status=status.HTTP_201_CREATED if created_invoices else status.HTTP_200_OK)


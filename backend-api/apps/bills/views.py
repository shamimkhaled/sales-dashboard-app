from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.utils.decorators import method_decorator
import pandas as pd
from io import BytesIO
from .models import (
    BillRecord, PricingPeriod, DailyBillAmount,
    Package, MACPartner, MACEndCustomer, SOHOCustomer,
    MACBill, SOHOBill, PaymentRecord
)
from .serializers import (
    BillRecordSerializer,
    PricingPeriodSerializer,
    DailyBillAmountSerializer,
    DailyBillAmountListSerializer,
    PackageSerializer,
    MACPartnerSerializer,
    MACEndCustomerSerializer,
    MACEndCustomerListSerializer,
    MACBillSerializer,
    MACBillCreateSerializer,
    SOHOCustomerSerializer,
    SOHOBillSerializer,
    PaymentRecordSerializer,
)
from apps.authentication.permissions import RequirePermissions
from apps.customers.models import Customer
from django.utils.dateparse import parse_date
from django.db import transaction, models


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all bill records',
    operation_description='Get a list of all bill records. Supports filtering by customer_type (Bandwidth/MAC/SOHO), status, customer, and billing_date.',
    tags=['1. Bill Records (Bandwidth/Reseller)'],
    manual_parameters=[
        openapi.Parameter('customer_type', openapi.IN_QUERY, description='Filter by customer type: Bandwidth, MAC, or SOHO', type=openapi.TYPE_STRING, enum=['Bandwidth', 'MAC', 'SOHO']),
        openapi.Parameter('status', openapi.IN_QUERY, description='Filter by status', type=openapi.TYPE_STRING),
        openapi.Parameter('customer', openapi.IN_QUERY, description='Filter by customer ID (for Bandwidth type)', type=openapi.TYPE_INTEGER),
        openapi.Parameter('billing_date', openapi.IN_QUERY, description='Filter by billing date (YYYY-MM-DD)', type=openapi.TYPE_STRING),
    ]
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new bill record',
    operation_description='Create a new bill record for Bandwidth/Reseller, MAC Partner, or SOHO customer. Specify customer_type and corresponding customer reference.',
    tags=['1. Bill Records (Bandwidth/Reseller)']
))
class BillListCreateView(generics.ListCreateAPIView):
    serializer_class = BillRecordSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'billing_date', 'customer_type']
    search_fields = ['remarks', 'nttn_cap', 'nttn_com', 'bill_number']
    ordering_fields = ['billing_date', 'total_bill', 'total_due', 'customer_type']

    def get_queryset(self):
        qs = BillRecord.objects.select_related('customer', 'mac_partner', 'soho_customer').all()
        user = self.request.user
        
        # Filter by customer_type if provided
        customer_type = self.request.query_params.get('customer_type')
        if customer_type:
            qs = qs.filter(customer_type=customer_type)
        
        # Sales person restriction via assigned customers (only for Bandwidth type)
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(
                models.Q(customer_type='Bandwidth', customer__assigned_sales_person=user) |
                models.Q(customer_type__in=['MAC', 'SOHO'])
            )
        return qs

    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get bill record details',
    tags=['1. Bill Records (Bandwidth/Reseller)']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update bill record',
    tags=['1. Bill Records (Bandwidth/Reseller)']
))
@method_decorator(name='patch', decorator=swagger_auto_schema(
    operation_summary='Partially update bill record',
    tags=['1. Bill Records (Bandwidth/Reseller)']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete bill record',
    tags=['1. Bill Records (Bandwidth/Reseller)']
))
class BillDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BillRecord.objects.select_related('customer', 'mac_partner', 'soho_customer').all()
    serializer_class = BillRecordSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']

class BillImportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:import']
    parser_classes = [MultiPartParser, FormParser]

    @swagger_auto_schema(
        operation_summary='Import bills from Excel/CSV',
        operation_description='Import bill records from Excel (.xlsx, .xls) or CSV file. Creates customers and bills automatically.',
        tags=['1. Bill Records (Bandwidth/Reseller)'],
        manual_parameters=[
            openapi.Parameter('file', openapi.IN_FORM, description='Excel or CSV file to import', type=openapi.TYPE_FILE, required=True),
        ],
        responses={200: 'Import successful', 400: 'Import failed'}
    )
    def post(self, request):
        file = request.data.get('file')
        if not file:
            return Response({'detail': 'File is required'}, status=400)

        file_name = file.name.lower()
        if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
            return self._import_excel(file)
        elif file_name.endswith('.csv'):
            return self._import_csv(file)
        else:
            return Response({'detail': 'Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV files.'}, status=400)

    def _import_excel(self, file):
        try:
            df = pd.read_excel(file)
            return self._process_dataframe(df)
        except Exception as e:
            return Response({'detail': f'Error reading Excel file: {str(e)}'}, status=400)

    def _import_csv(self, file):
        try:
            df = pd.read_csv(file)
            return self._process_dataframe(df)
        except Exception as e:
            return Response({'detail': f'Error reading CSV file: {str(e)}'}, status=400)

    def _process_dataframe(self, df):
        # Required columns for customer data
        customer_required = ['customer_name', 'customer_email', 'customer_phone']
        # Required columns for bill data
        bill_required = ['billing_date']

        missing_customer = [col for col in customer_required if col not in df.columns]
        missing_bill = [col for col in bill_required if col not in df.columns]

        if missing_customer or missing_bill:
            errors = []
            if missing_customer:
                errors.append(f'Missing customer columns: {", ".join(missing_customer)}')
            if missing_bill:
                errors.append(f'Missing bill columns: {", ".join(missing_bill)}')
            return Response({'detail': '; '.join(errors)}, status=400)

        processed = 0
        errors = []
        customers_created = 0
        bills_created = 0

        for index, row in df.iterrows():
            try:
                with transaction.atomic():
                    # Process customer data
                    customer_email = str(row.get('customer_email', '')).strip().lower()
                    if not customer_email:
                        errors.append(f'Row {index + 2}: Customer email is required')
                        continue

                    # Check if customer exists by email
                    customer = Customer.objects.filter(email=customer_email).first()

                    if not customer:
                        # Create new customer
                        customer_data = {
                            'name': str(row.get('customer_name', '')).strip(),
                            'company_name': str(row.get('customer_company_name', '')).strip() or None,
                            'email': customer_email,
                            'phone': str(row.get('customer_phone', '')).strip(),
                            'address': str(row.get('customer_address', '')).strip() or None,
                            'link_id': str(row.get('customer_link_id', '')).strip() or None,
                        }

                        # Validate customer data
                        if not customer_data['name']:
                            errors.append(f'Row {index + 2}: Customer name is required')
                            continue
                        if not customer_data['phone']:
                            errors.append(f'Row {index + 2}: Customer phone is required')
                            continue

                        customer = Customer.objects.create(**customer_data)
                        customers_created += 1

                    # Process bill data
                    billing_date_str = str(row.get('billing_date', '')).strip()
                    if not billing_date_str:
                        errors.append(f'Row {index + 2}: Billing date is required')
                        continue

                    billing_date = parse_date(billing_date_str)
                    if not billing_date:
                        errors.append(f'Row {index + 2}: Invalid billing date format')
                        continue

                    bill_data = {
                        'customer': customer,
                        'billing_date': billing_date,
                        'active_date': parse_date(str(row.get('active_date', '')).strip()) if row.get('active_date') else None,
                        'termination_date': parse_date(str(row.get('termination_date', '')).strip()) if row.get('termination_date') else None,
                        'status': str(row.get('status', 'Active')).strip(),
                        'nttn_cap': str(row.get('nttn_cap', '')).strip() or None,
                        'nttn_com': str(row.get('nttn_com', '')).strip() or None,
                        'iig_qt': float(row.get('iig_qt', 0) or 0),
                        'iig_qt_price': float(row.get('iig_qt_price', 0) or 0),
                        'fna': float(row.get('fna', 0) or 0),
                        'fna_price': float(row.get('fna_price', 0) or 0),
                        'ggc': float(row.get('ggc', 0) or 0),
                        'ggc_price': float(row.get('ggc_price', 0) or 0),
                        'cdn': float(row.get('cdn', 0) or 0),
                        'cdn_price': float(row.get('cdn_price', 0) or 0),
                        'bdix': float(row.get('bdix', 0) or 0),
                        'bdix_price': float(row.get('bdix_price', 0) or 0),
                        'baishan': float(row.get('baishan', 0) or 0),
                        'baishan_price': float(row.get('baishan_price', 0) or 0),
                        'discount': float(row.get('discount', 0) or 0),
                        'total_received': float(row.get('total_received', 0) or 0),
                        'remarks': str(row.get('remarks', '')).strip() or None,
                    }

                    # Calculate totals using the serializer validation logic
                    component_total = (
                        bill_data['iig_qt'] * bill_data['iig_qt_price'] +
                        bill_data['fna'] * bill_data['fna_price'] +
                        bill_data['ggc'] * bill_data['ggc_price'] +
                        bill_data['cdn'] * bill_data['cdn_price'] +
                        bill_data['bdix'] * bill_data['bdix_price'] +
                        bill_data['baishan'] * bill_data['baishan_price']
                    )
                    bill_data['total_bill'] = component_total - bill_data['discount']
                    bill_data['total_due'] = bill_data['total_bill'] - bill_data['total_received']

                    # Create bill record
                    BillRecord.objects.create(**bill_data)
                    bills_created += 1
                    processed += 1

            except Exception as e:
                errors.append(f'Row {index + 2}: {str(e)}')

        return Response({
            'success': len(errors) == 0,
            'processed': processed,
            'customers_created': customers_created,
            'bills_created': bills_created,
            'errors': errors
        })


class BillExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:export']

    @swagger_auto_schema(
        operation_summary='Export bills to Excel/CSV',
        operation_description='Export bill records to Excel (.xlsx) or CSV format. Use ?format=excel for Excel, or ?format=csv for CSV (default).',
        tags=['1. Bill Records (Bandwidth/Reseller)'],
        manual_parameters=[
            openapi.Parameter('format', openapi.IN_QUERY, description='Export format: excel or csv (default)', type=openapi.TYPE_STRING, enum=['excel', 'csv']),
        ]
    )
    def get(self, request):
        queryset = BillRecord.objects.select_related('customer').all()
        export_format = request.query_params.get('format', 'csv').lower()

        if export_format == 'excel':
            # Export as Excel
            data = []
            for r in queryset:
                data.append({
                    'id': r.id,
                    'customer_id': r.customer_id,
                    'customer_name': r.customer.name,
                    'customer_email': r.customer.email,
                    'billing_date': r.billing_date.strftime('%Y-%m-%d') if r.billing_date else '',
                    'active_date': r.active_date.strftime('%Y-%m-%d') if r.active_date else '',
                    'termination_date': r.termination_date.strftime('%Y-%m-%d') if r.termination_date else '',
                    'status': r.status,
                    'nttn_cap': r.nttn_cap or '',
                    'nttn_com': r.nttn_com or '',
                    'iig_qt': float(r.iig_qt),
                    'iig_qt_price': float(r.iig_qt_price),
                    'fna': float(r.fna),
                    'fna_price': float(r.fna_price),
                    'ggc': float(r.ggc),
                    'ggc_price': float(r.ggc_price),
                    'cdn': float(r.cdn),
                    'cdn_price': float(r.cdn_price),
                    'bdix': float(r.bdix),
                    'bdix_price': float(r.bdix_price),
                    'baishan': float(r.baishan),
                    'baishan_price': float(r.baishan_price),
                    'discount': float(r.discount),
                    'total_bill': float(r.total_bill),
                    'total_received': float(r.total_received),
                    'total_due': float(r.total_due),
                    'remarks': r.remarks or '',
                })

            df = pd.DataFrame(data)
            buffer = BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='BillRecords', index=False)
            buffer.seek(0)

            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="bill_records.xlsx"'
            return response

        else:
            # Export as CSV (default)
            def row_iter():
                header = [
                    'id','customer_id','customer_name','customer_email','billing_date','active_date','termination_date','status',
                    'nttn_cap','nttn_com','iig_qt','iig_qt_price','fna','fna_price','ggc','ggc_price',
                    'cdn','cdn_price','bdix','bdix_price','baishan','baishan_price',
                    'discount','total_bill','total_received','total_due','remarks'
                ]
                yield ','.join(header) + '\n'
                for r in queryset.iterator():
                    row = [
                        str(r.id), str(r.customer_id), r.customer.name, r.customer.email,
                        str(r.billing_date or ''), str(r.active_date or ''), str(r.termination_date or ''),
                        r.status, r.nttn_cap or '', r.nttn_com or '',
                        str(r.iig_qt), str(r.iig_qt_price), str(r.fna), str(r.fna_price),
                        str(r.ggc), str(r.ggc_price), str(r.cdn), str(r.cdn_price),
                        str(r.bdix), str(r.bdix_price), str(r.baishan), str(r.baishan_price),
                        str(r.discount), str(r.total_bill), str(r.total_received), str(r.total_due),
                        (r.remarks or '').replace('\n',' ').replace(',',' ')
                    ]
                    yield ','.join(row) + '\n'
            response = StreamingHttpResponse(row_iter(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="bill_records.csv"'
            return response


# Pricing Period Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all pricing periods',
    tags=['2. Pricing Periods']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new pricing period',
    tags=['2. Pricing Periods']
))
class PricingPeriodListCreateView(generics.ListCreateAPIView):
    """List all pricing periods or create a new pricing period"""
    serializer_class = PricingPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill_record']
    ordering_fields = ['start_day', 'end_day', 'created_at']
    ordering = ['bill_record', 'start_day']
    
    def get_queryset(self):
        qs = PricingPeriod.objects.select_related('bill_record', 'bill_record__customer').all()
        user = self.request.user
        
        # Sales person restriction via assigned customers
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(bill_record__customer__assigned_sales_person=user)
        
        # Filter by bill_record if provided
        bill_record_id = self.request.query_params.get('bill_record')
        if bill_record_id:
            qs = qs.filter(bill_record_id=bill_record_id)
        
        return qs
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get pricing period details',
    tags=['2. Pricing Periods']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update pricing period',
    tags=['2. Pricing Periods']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete pricing period',
    tags=['2. Pricing Periods']
))
class PricingPeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a pricing period"""
    queryset = PricingPeriod.objects.select_related('bill_record', 'bill_record__customer').all()
    serializer_class = PricingPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get pricing periods by bill record',
    tags=['2. Pricing Periods']
))
class PricingPeriodsByBillView(generics.ListAPIView):
    """Get all pricing periods for a specific bill record"""
    serializer_class = PricingPeriodSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    
    def get_queryset(self):
        bill_id = self.kwargs['bill_id']
        qs = PricingPeriod.objects.filter(bill_record_id=bill_id).select_related(
            'bill_record', 'bill_record__customer'
        ).order_by('start_day')
        
        user = self.request.user
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(bill_record__customer__assigned_sales_person=user)
        
        return qs


# Daily Bill Amount Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all daily bill amounts',
    tags=['3. Daily Bill Amounts']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new daily bill amount',
    tags=['3. Daily Bill Amounts']
))
class DailyBillAmountListCreateView(generics.ListCreateAPIView):
    """List all daily bill amounts or create a new one"""
    serializer_class = DailyBillAmountSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['bill_record', 'date', 'pricing_period']
    ordering_fields = ['date', 'day_number', 'daily_amount']
    ordering = ['bill_record', 'date']
    
    def get_queryset(self):
        qs = DailyBillAmount.objects.select_related(
            'bill_record', 'bill_record__customer', 'pricing_period'
        ).all()
        user = self.request.user
        
        # Sales person restriction via assigned customers
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(bill_record__customer__assigned_sales_person=user)
        
        # Filter by bill_record if provided
        bill_record_id = self.request.query_params.get('bill_record')
        if bill_record_id:
            qs = qs.filter(bill_record_id=bill_record_id)
        
        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        
        return qs
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DailyBillAmountListSerializer
        return DailyBillAmountSerializer
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get daily bill amount details',
    tags=['3. Daily Bill Amounts']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update daily bill amount',
    tags=['3. Daily Bill Amounts']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete daily bill amount',
    tags=['3. Daily Bill Amounts']
))
class DailyBillAmountDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a daily bill amount"""
    queryset = DailyBillAmount.objects.select_related(
        'bill_record', 'bill_record__customer', 'pricing_period'
    ).all()
    serializer_class = DailyBillAmountSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get daily bill amounts by bill record',
    tags=['3. Daily Bill Amounts']
))
class DailyBillAmountsByBillView(generics.ListAPIView):
    """Get all daily bill amounts for a specific bill record"""
    serializer_class = DailyBillAmountListSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    
    def get_queryset(self):
        bill_id = self.kwargs['bill_id']
        qs = DailyBillAmount.objects.filter(bill_record_id=bill_id).select_related(
            'bill_record', 'bill_record__customer', 'pricing_period'
        ).order_by('date')
        
        user = self.request.user
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(bill_record__customer__assigned_sales_person=user)
        
        return qs


class CalculateDailyAmountsView(APIView):
    """Calculate daily amounts for a bill record"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:create']
    
    @swagger_auto_schema(
        operation_summary='Calculate daily amounts for a bill record',
        operation_description='Calculate and generate daily bill amounts for a bill record based on pricing periods or bill record data.',
        tags=['3. Daily Bill Amounts'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'recalculate': openapi.Schema(type=openapi.TYPE_BOOLEAN, description='Recalculate existing daily amounts', default=False)
            }
        )
    )
    def post(self, request, bill_id):
        from .utils import calculate_daily_amounts_for_bill
        
        try:
            bill_record = BillRecord.objects.get(pk=bill_id)
        except BillRecord.DoesNotExist:
            return Response(
                {'detail': 'Bill record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        recalculate = request.data.get('recalculate', False)
        created_count, updated_count, errors = calculate_daily_amounts_for_bill(
            bill_record, recalculate=recalculate
        )
        
        return Response({
            'success': len(errors) == 0,
            'message': f'Calculated daily amounts: {created_count} created, {updated_count} updated',
            'created': created_count,
            'updated': updated_count,
            'errors': errors
        }, status=status.HTTP_200_OK if len(errors) == 0 else status.HTTP_207_MULTI_STATUS)


class FinalizeBillRecordView(APIView):
    """Finalize bill record by updating values from pricing periods"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']
    
    @swagger_auto_schema(
        operation_summary='Finalize bill record from pricing periods',
        operation_description='Finalize bill record by updating individual field values from the latest pricing period.',
        tags=['1. Bill Records (Bandwidth/Reseller)']
    )
    def post(self, request, bill_id):
        from .utils import finalize_bill_record_from_periods
        
        try:
            bill_record = BillRecord.objects.get(pk=bill_id)
        except BillRecord.DoesNotExist:
            return Response(
                {'detail': 'Bill record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        summary = finalize_bill_record_from_periods(bill_record)
        
        if summary['updated']:
            return Response({
                'success': True,
                'message': 'Bill record finalized successfully',
                'summary': summary
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': summary.get('message', 'Failed to finalize bill record'),
                'summary': summary
            }, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# MAC / SOHO Billing Views
# ============================================================================

# Package Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all packages',
    tags=['4. Packages']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new package',
    tags=['4. Packages']
))
class PackageListCreateView(generics.ListCreateAPIView):
    """List all packages or create a new package"""
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'mbps', 'rate', 'type']
    ordering = ['type', 'name']
    
    def get_queryset(self):
        return Package.objects.all()
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get package details',
    tags=['4. Packages']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update package',
    tags=['4. Packages']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete package',
    tags=['4. Packages']
))
class PackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a package"""
    queryset = Package.objects.all()
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


# MAC Partner Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all MAC partners',
    tags=['5. MAC Partners']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new MAC partner',
    tags=['5. MAC Partners']
))
class MACPartnerListCreateView(generics.ListCreateAPIView):
    """List all MAC partners or create a new MAC partner"""
    serializer_class = MACPartnerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['mac_cust_name', 'email', 'phone', 'contact_person']
    ordering_fields = ['mac_cust_name', 'created_at']
    ordering = ['mac_cust_name']
    
    def get_queryset(self):
        return MACPartner.objects.all()
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get MAC partner details',
    tags=['5. MAC Partners']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update MAC partner',
    tags=['5. MAC Partners']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete MAC partner',
    tags=['5. MAC Partners']
))
class MACPartnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a MAC partner"""
    queryset = MACPartner.objects.all()
    serializer_class = MACPartnerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


# MAC End Customer Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all MAC end customers',
    tags=['6. MAC End Customers']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new MAC end customer',
    tags=['6. MAC End Customers']
))
class MACEndCustomerListCreateView(generics.ListCreateAPIView):
    """List all MAC end customers or create a new one"""
    serializer_class = MACEndCustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['mac_partner', 'status', 'package']
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'activation_date', 'created_at']
    ordering = ['mac_partner', 'name']
    
    def get_queryset(self):
        return MACEndCustomer.objects.select_related('mac_partner', 'package').all()
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return MACEndCustomerListSerializer
        return MACEndCustomerSerializer
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get MAC end customer details',
    tags=['6. MAC End Customers']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update MAC end customer',
    tags=['6. MAC End Customers']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete MAC end customer',
    tags=['6. MAC End Customers']
))
class MACEndCustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a MAC end customer"""
    queryset = MACEndCustomer.objects.select_related('mac_partner', 'package').all()
    serializer_class = MACEndCustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get MAC end customers by partner',
    tags=['6. MAC End Customers']
))
class MACEndCustomersByPartnerView(generics.ListAPIView):
    """Get all end customers for a specific MAC partner"""
    serializer_class = MACEndCustomerListSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    
    def get_queryset(self):
        partner_id = self.kwargs['partner_id']
        return MACEndCustomer.objects.filter(
            mac_partner_id=partner_id
        ).select_related('mac_partner', 'package').order_by('name')


# MAC Bill Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all MAC bills',
    tags=['7. MAC Bills']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new MAC bill',
    operation_description='Automatically calculates total_client, total_revenue, commission, and total_bill based on active end-customers.',
    tags=['7. MAC Bills']
))
class MACBillListCreateView(generics.ListCreateAPIView):
    """List all MAC bills or create a new MAC bill"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['mac_partner', 'status', 'bill_date']
    ordering_fields = ['bill_date', 'total_bill', 'created_at']
    ordering = ['-bill_date', '-created_at']
    
    def get_queryset(self):
        return MACBill.objects.select_related('mac_partner').all()
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MACBillCreateSerializer
        return MACBillSerializer
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get MAC bill details',
    tags=['7. MAC Bills']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update MAC bill',
    tags=['7. MAC Bills']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete MAC bill',
    tags=['7. MAC Bills']
))
class MACBillDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a MAC bill"""
    queryset = MACBill.objects.select_related('mac_partner').all()
    serializer_class = MACBillSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get MAC bills by partner',
    tags=['7. MAC Bills']
))
class MACBillsByPartnerView(generics.ListAPIView):
    """Get all bills for a specific MAC partner"""
    serializer_class = MACBillSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    
    def get_queryset(self):
        partner_id = self.kwargs['partner_id']
        return MACBill.objects.filter(
            mac_partner_id=partner_id
        ).select_related('mac_partner').order_by('-bill_date')


class CalculateMACBillView(APIView):
    """Calculate MAC bill without creating it (preview)"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    
    @swagger_auto_schema(
        operation_summary='Preview MAC bill calculation',
        operation_description='Calculate MAC bill without creating it. Returns preview of total_client, total_revenue, commission, and total_bill.',
        tags=['7. MAC Bills'],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['bill_date'],
            properties={
                'bill_date': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, description='Billing date (YYYY-MM-DD)')
            }
        )
    )
    def post(self, request, partner_id):
        from .utils import calculate_mac_bill
        from datetime import datetime
        
        try:
            mac_partner = MACPartner.objects.get(pk=partner_id)
        except MACPartner.DoesNotExist:
            return Response(
                {'detail': 'MAC partner not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        bill_date_str = request.data.get('bill_date')
        if not bill_date_str:
            return Response(
                {'detail': 'bill_date is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bill_date = datetime.strptime(bill_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        calculation = calculate_mac_bill(mac_partner, bill_date)
        
        return Response({
            'success': True,
            'mac_partner_id': partner_id,
            'mac_partner_name': mac_partner.mac_cust_name,
            'bill_date': bill_date_str,
            'calculation': {
                'total_client': calculation['total_client'],
                'total_revenue': float(calculation['total_revenue']),
                'percentage_share': float(calculation['percentage_share']),
                'commission': float(calculation['commission']),
                'total_bill': float(calculation['total_bill']),
            }
        })


# SOHO Customer Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all SOHO customers',
    tags=['8. SOHO Customers']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new SOHO customer',
    tags=['8. SOHO Customers']
))
class SOHOCustomerListCreateView(generics.ListCreateAPIView):
    """List all SOHO customers or create a new SOHO customer"""
    serializer_class = SOHOCustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'package']
    search_fields = ['cust_name', 'email', 'phone']
    ordering_fields = ['cust_name', 'activation_date', 'created_at']
    ordering = ['cust_name']
    
    def get_queryset(self):
        return SOHOCustomer.objects.select_related('package').all()
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get SOHO customer details',
    tags=['8. SOHO Customers']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update SOHO customer',
    tags=['8. SOHO Customers']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete SOHO customer',
    tags=['8. SOHO Customers']
))
class SOHOCustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a SOHO customer"""
    queryset = SOHOCustomer.objects.select_related('package').all()
    serializer_class = SOHOCustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


# SOHO Bill Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all SOHO bills',
    tags=['9. SOHO Bills']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new SOHO bill',
    tags=['9. SOHO Bills']
))
class SOHOBillListCreateView(generics.ListCreateAPIView):
    """List all SOHO bills or create a new SOHO bill"""
    serializer_class = SOHOBillSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['soho_customer', 'status', 'bill_date']
    ordering_fields = ['bill_date', 'total_bill', 'created_at']
    ordering = ['-bill_date', '-created_at']
    
    def get_queryset(self):
        return SOHOBill.objects.select_related('soho_customer', 'package').all()
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        # Auto-set total_bill from rate if not provided
        if not serializer.validated_data.get('total_bill'):
            serializer.validated_data['total_bill'] = serializer.validated_data.get('rate', 0)
        serializer.save()


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get SOHO bill details',
    tags=['9. SOHO Bills']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update SOHO bill',
    tags=['9. SOHO Bills']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete SOHO bill',
    tags=['9. SOHO Bills']
))
class SOHOBillDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a SOHO bill"""
    queryset = SOHOBill.objects.select_related('soho_customer', 'package').all()
    serializer_class = SOHOBillSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get SOHO bills by customer',
    tags=['9. SOHO Bills']
))
class SOHOBillsByCustomerView(generics.ListAPIView):
    """Get all bills for a specific SOHO customer"""
    serializer_class = SOHOBillSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    
    def get_queryset(self):
        customer_id = self.kwargs['customer_id']
        return SOHOBill.objects.filter(
            soho_customer_id=customer_id
        ).select_related('soho_customer', 'package').order_by('-bill_date')


# Payment Record Views
@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='List all payment records',
    tags=['10. Payments']
))
@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Create a new payment record',
    operation_description='Create payment for BillRecord, MACBill, or SOHOBill. Automatically updates bill total_received and last_payment info.',
    tags=['10. Payments']
))
class PaymentRecordListCreateView(generics.ListCreateAPIView):
    """List all payment records or create a new payment record"""
    serializer_class = PaymentRecordSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_type', 'payment_method', 'payment_date']
    ordering_fields = ['payment_date', 'amount', 'created_at']
    ordering = ['-payment_date', '-created_at']
    
    def get_queryset(self):
        qs = PaymentRecord.objects.select_related('mac_bill', 'soho_bill', 'bill_record', 'created_by').all()
        
        # Filter by bill if provided
        mac_bill_id = self.request.query_params.get('mac_bill')
        if mac_bill_id:
            qs = qs.filter(mac_bill_id=mac_bill_id)
        
        soho_bill_id = self.request.query_params.get('soho_bill')
        if soho_bill_id:
            qs = qs.filter(soho_bill_id=soho_bill_id)
        
        bill_record_id = self.request.query_params.get('bill_record')
        if bill_record_id:
            qs = qs.filter(bill_record_id=bill_record_id)
        
        return qs
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save(created_by=self.request.user)


@method_decorator(name='get', decorator=swagger_auto_schema(
    operation_summary='Get payment record details',
    tags=['10. Payments']
))
@method_decorator(name='put', decorator=swagger_auto_schema(
    operation_summary='Update payment record',
    tags=['10. Payments']
))
@method_decorator(name='delete', decorator=swagger_auto_schema(
    operation_summary='Delete payment record',
    tags=['10. Payments']
))
class PaymentRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a payment record"""
    queryset = PaymentRecord.objects.select_related('mac_bill', 'soho_bill', 'bill_record', 'created_by').all()
    serializer_class = PaymentRecordSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


# Revenue Analytics Views
class RevenueByCustomerTypeView(APIView):
    """Get total revenue by customer type (MAC, SOHO, Bandwidth/Reseller)"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']
    
    @swagger_auto_schema(
        operation_summary='Get total revenue by customer type',
        operation_description='Get total revenue breakdown by customer type (MAC, SOHO, Bandwidth/Reseller) for a date range.',
        tags=['11. Revenue Analytics'],
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description='Start date (YYYY-MM-DD)', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
            openapi.Parameter('end_date', openapi.IN_QUERY, description='End date (YYYY-MM-DD)', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE),
        ]
    )
    def get(self, request):
        from .utils import get_revenue_by_customer_type
        from datetime import datetime
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'detail': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'detail': 'Invalid end_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        revenue_data = get_revenue_by_customer_type(start_date, end_date)
        
        return Response(revenue_data)


class DailyRevenueAnalyticsView(APIView):
    """Get daily revenue breakdown by customer type"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']
    
    @swagger_auto_schema(
        operation_summary='Get daily revenue analytics',
        operation_description='Get daily revenue breakdown by customer type for a date range.',
        tags=['11. Revenue Analytics'],
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description='Start date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description='End date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
        ]
    )
    def get(self, request):
        from .utils import get_daily_revenue_by_customer_type
        from datetime import datetime
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'detail': 'start_date and end_date are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if start_date > end_date:
            return Response(
                {'detail': 'start_date must be before or equal to end_date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        daily_data = get_daily_revenue_by_customer_type(start_date, end_date)
        
        return Response({
            'period': 'daily',
            'start_date': str(start_date),
            'end_date': str(end_date),
            'data': daily_data
        })


class WeeklyRevenueAnalyticsView(APIView):
    """Get weekly revenue breakdown by customer type"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']
    
    @swagger_auto_schema(
        operation_summary='Get weekly revenue analytics',
        operation_description='Get weekly revenue breakdown by customer type for a date range.',
        tags=['11. Revenue Analytics'],
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description='Start date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description='End date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
        ]
    )
    def get(self, request):
        from .utils import get_weekly_revenue_by_customer_type
        from datetime import datetime
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'detail': 'start_date and end_date are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if start_date > end_date:
            return Response(
                {'detail': 'start_date must be before or equal to end_date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        weekly_data = get_weekly_revenue_by_customer_type(start_date, end_date)
        
        return Response({
            'period': 'weekly',
            'start_date': str(start_date),
            'end_date': str(end_date),
            'data': weekly_data
        })


class MonthlyRevenueAnalyticsView(APIView):
    """Get monthly revenue breakdown by customer type"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']
    
    @swagger_auto_schema(
        operation_summary='Get monthly revenue analytics',
        operation_description='Get monthly revenue breakdown by customer type for a date range.',
        tags=['11. Revenue Analytics'],
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description='Start date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description='End date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
        ]
    )
    def get(self, request):
        from .utils import get_monthly_revenue_by_customer_type
        from datetime import datetime
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'detail': 'start_date and end_date are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if start_date > end_date:
            return Response(
                {'detail': 'start_date must be before or equal to end_date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        monthly_data = get_monthly_revenue_by_customer_type(start_date, end_date)
        
        return Response({
            'period': 'monthly',
            'start_date': str(start_date),
            'end_date': str(end_date),
            'data': monthly_data
        })


class YearlyRevenueAnalyticsView(APIView):
    """Get yearly revenue breakdown by customer type"""
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']
    
    @swagger_auto_schema(
        operation_summary='Get yearly revenue analytics',
        operation_description='Get yearly revenue breakdown by customer type for a date range.',
        tags=['11. Revenue Analytics'],
        manual_parameters=[
            openapi.Parameter('start_date', openapi.IN_QUERY, description='Start date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
            openapi.Parameter('end_date', openapi.IN_QUERY, description='End date (YYYY-MM-DD) - Required', type=openapi.TYPE_STRING, format=openapi.FORMAT_DATE, required=True),
        ]
    )
    def get(self, request):
        from .utils import get_yearly_revenue_by_customer_type
        from datetime import datetime
        
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'detail': 'start_date and end_date are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if start_date > end_date:
            return Response(
                {'detail': 'start_date must be before or equal to end_date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        yearly_data = get_yearly_revenue_by_customer_type(start_date, end_date)
        
        return Response({
            'period': 'yearly',
            'start_date': str(start_date),
            'end_date': str(end_date),
            'data': yearly_data
        })

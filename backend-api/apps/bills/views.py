from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse, HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
import pandas as pd
from io import BytesIO
from .models import BillRecord
from .serializers import BillRecordSerializer
from apps.authentication.permissions import RequirePermissions
from apps.customers.models import Customer
from django.utils.dateparse import parse_date
from django.db import transaction


class BillListCreateView(generics.ListCreateAPIView):
    serializer_class = BillRecordSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'billing_date']
    search_fields = ['remarks', 'nttn_cap', 'nttn_com']
    ordering_fields = ['billing_date', 'total_bill', 'total_due']

    def get_queryset(self):
        qs = BillRecord.objects.select_related('customer').all()
        user = self.request.user
        # Sales person restriction via assigned customers
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(customer__assigned_sales_person=user)
        return qs

    def perform_create(self, serializer):
        self.required_permissions = ['bills:create']
        serializer.save()


class BillDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = BillRecord.objects.select_related('customer').all()
    serializer_class = BillRecordSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:update']

class BillImportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:import']
    parser_classes = [MultiPartParser, FormParser]

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

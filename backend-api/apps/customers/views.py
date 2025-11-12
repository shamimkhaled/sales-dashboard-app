from rest_framework import generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse, HttpResponse
import csv
import pandas as pd
from io import BytesIO
from django_filters.rest_framework import DjangoFilterBackend
from .models import Prospect, Customer
from .serializers import (
    ProspectSerializer,
    CustomerSerializer,
)
from apps.authentication.permissions import RequirePermissions


class ProspectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProspectSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['prospects:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'source']
    search_fields = ['name', 'company_name', 'email', 'phone']
    ordering_fields = ['created_at', 'potential_revenue']

    def get_queryset(self):
        qs = Prospect.objects.all()
        user = self.request.user
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(sales_person=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(sales_person=self.request.user)


class ProspectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Prospect.objects.all()
    serializer_class = ProspectSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['prospects:update']


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['assigned_sales_person']
    search_fields = ['name', 'company_name', 'email', 'phone']
    ordering_fields = ['created_at', 'monthly_revenue']

    def get_queryset(self):
        qs = Customer.objects.all()
        user = self.request.user
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(assigned_sales_person=user)
        return qs

    def perform_create(self, serializer):
        serializer.save()


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:update']


class CustomerImportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:import']
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
        required_columns = ['name', 'email', 'phone']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return Response({
                'detail': f'Missing required columns: {", ".join(missing_columns)}'
            }, status=400)

        processed = 0
        errors = []
        created = 0
        updated = 0

        for index, row in df.iterrows():
            try:
                # Clean and validate data
                customer_data = {
                    'name': str(row.get('name', '')).strip(),
                    'company_name': str(row.get('company_name', '')).strip() or None,
                    'email': str(row.get('email', '')).strip().lower(),
                    'phone': str(row.get('phone', '')).strip(),
                    'address': str(row.get('address', '')).strip() or None,
                    'monthly_revenue': float(row.get('monthly_revenue', 0) or 0),
                    'potential_revenue': float(row.get('potential_revenue', 0) or 0),
                }

                # Validate required fields
                if not customer_data['name']:
                    errors.append(f'Row {index + 2}: Name is required')
                    continue
                if not customer_data['email']:
                    errors.append(f'Row {index + 2}: Email is required')
                    continue
                if not customer_data['phone']:
                    errors.append(f'Row {index + 2}: Phone is required')
                    continue

                # Check if customer exists
                customer, created_flag = Customer.objects.get_or_create(
                    email=customer_data['email'],
                    defaults=customer_data
                )

                if created_flag:
                    created += 1
                else:
                    # Update existing customer
                    for key, value in customer_data.items():
                        setattr(customer, key, value)
                    customer.save()
                    updated += 1

                processed += 1

            except Exception as e:
                errors.append(f'Row {index + 2}: {str(e)}')

        return Response({
            'success': len(errors) == 0,
            'processed': processed,
            'created': created,
            'updated': updated,
            'errors': errors
        })


class CustomerExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:export']

    def get(self, request):
        queryset = Customer.objects.all()
        export_format = request.query_params.get('format', 'csv').lower()

        if export_format == 'excel':
            # Export as Excel
            data = []
            for c in queryset:
                data.append({
                    'id': c.id,
                    'name': c.name,
                    'company_name': c.company_name or '',
                    'email': c.email,
                    'phone': c.phone,
                    'address': c.address or '',
                    'monthly_revenue': float(c.monthly_revenue),
                    'potential_revenue': float(c.potential_revenue),
                    'created_at': c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else '',
                })

            df = pd.DataFrame(data)
            buffer = BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Customers', index=False)
            buffer.seek(0)

            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="customers.xlsx"'
            return response

        else:
            # Export as CSV (default)
            def row_iter():
                header = ['id', 'name', 'company_name', 'email', 'phone', 'address', 'monthly_revenue', 'potential_revenue', 'created_at']
                yield ','.join(header) + '\n'
                for c in queryset.iterator():
                    row = [
                        str(c.id), c.name, c.company_name or '', c.email, c.phone,
                        c.address or '', str(c.monthly_revenue), str(c.potential_revenue),
                        c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else ''
                    ]
                    yield ','.join(row) + '\n'

            response = StreamingHttpResponse(row_iter(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="customers.csv"'
            return response


class RevenueCalculationView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']

    def get(self, request):
        # Simple aggregation example; can be extended to weekly/yearly
        monthly_total = Customer.objects.all().aggregate(total=models.Sum('monthly_revenue'))['total'] or 0
        weekly_total = monthly_total / 4
        yearly_total = monthly_total * 12
        return Response({
            'monthly': float(monthly_total),
            'weekly': float(weekly_total),
            'yearly': float(yearly_total),
        })


from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse, HttpResponse
from django.db import models
import csv
import pandas as pd
from io import BytesIO
from django_filters.rest_framework import DjangoFilterBackend
from .models import Prospect, Customer, ProspectStatusHistory
from apps.bills.models import BillRecord
from .serializers import (
    ProspectSerializer,
    CustomerSerializer,
)
from .utils import convert_prospect_to_customer
from .email_service import send_prospect_confirmation_email, send_customer_lost_email
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
        # Only set sales_person to current user if not provided in the request
        if not serializer.validated_data.get('sales_person'):
            serializer.save(sales_person=self.request.user)
        else:
            serializer.save()


class ProspectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Prospect.objects.all()
    serializer_class = ProspectSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['prospects:update']
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        
        # Call parent update
        response = super().update(request, *args, **kwargs)
        
        # Track status change in history
        instance.refresh_from_db()
        if old_status != instance.status:
            ProspectStatusHistory.objects.create(
                prospect=instance,
                from_status=old_status,
                to_status=instance.status,
                changed_by=request.user,
                notes=request.data.get('notes', f"Status changed from {old_status} to {instance.status}")
            )
        
        return response


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:read']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['assigned_sales_person']
    search_fields = ['name', 'company_name', 'email', 'phone']
    ordering_fields = ['created_at']

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
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        
        # Call parent update
        response = super().update(request, *args, **kwargs)
        
        # Check if status changed to 'Lost' and send email
        instance.refresh_from_db()
        if old_status != instance.status and instance.status == 'Lost':
            send_customer_lost_email(instance)
        
        return response


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
                    'link_id': str(row.get('link_id', '')).strip() or None,
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
                    'status': c.status,
                    'calculated_monthly_revenue': float(c.calculated_monthly_revenue),
                    'link_id': c.link_id or '',
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
                header = ['id', 'name', 'company_name', 'email', 'phone', 'address', 'status', 'calculated_monthly_revenue', 'link_id', 'created_at']
                yield ','.join(header) + '\n'
                for c in queryset.iterator():
                    row = [
                        str(c.id), c.name, c.company_name or '', c.email, c.phone,
                        c.address or '', c.status, str(c.calculated_monthly_revenue), c.link_id or '',
                        c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else ''
                    ]
                    yield ','.join(row) + '\n'

            response = StreamingHttpResponse(row_iter(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="customers.csv"'
            return response


class ProspectConvertToCustomerView(APIView):
    """
    Convert a prospect to a customer when they take service
    POST /api/customers/prospects/<prospect_id>/convert/
    Body: {
        "confirmed": true/false,  # Whether customer confirmed service
        "link_id": "optional_link_id"
    }
    """
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['prospects:update', 'customers:create']
    
    def post(self, request, prospect_id):
        try:
            prospect = Prospect.objects.get(pk=prospect_id)
        except Prospect.DoesNotExist:
            return Response(
                {'detail': 'Prospect not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get confirmation status and link_id from request
        confirmed = request.data.get('confirmed', True)  # Default to True
        link_id = request.data.get('link_id', None)
        
        # Convert prospect to customer
        customer = convert_prospect_to_customer(prospect, link_id=link_id)
        
        if customer:
            # Update prospect status to qualified and add note
            old_status = prospect.status
            if prospect.status != 'qualified':
                prospect.status = 'qualified'
                prospect.notes = (prospect.notes or '') + f'\n[Converted to Customer on {customer.created_at}]'
                prospect.save()
                
                # Track status change
                ProspectStatusHistory.objects.create(
                    prospect=prospect,
                    from_status=old_status,
                    to_status='qualified',
                    changed_by=request.user,
                    notes=f"Converted to customer. Confirmed: {confirmed}"
                )
            
            # Send email notification about confirmation
            send_prospect_confirmation_email(prospect, confirmed=confirmed, link_id=link_id)
            
            # Return customer data
            customer_serializer = CustomerSerializer(customer)
            return Response({
                'success': True,
                'message': 'Prospect successfully converted to customer',
                'customer': customer_serializer.data,
                'prospect_id': prospect.id,
                'confirmed': confirmed
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'detail': 'Failed to convert prospect to customer'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RevenueCalculationView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['reports:read']

    def get(self, request):
        # Simple aggregation example; can be extended to weekly/yearly
        monthly_total = BillRecord.objects.aggregate(total=models.Sum('total_bill'))['total'] or 0
        weekly_total = monthly_total / 4
        yearly_total = monthly_total * 12
        return Response({
            'monthly': float(monthly_total),
            'weekly': float(weekly_total),
            'yearly': float(yearly_total),
        })


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
            qs = qs.filter(kam=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(kam=self.request.user)


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
    filterset_fields = ['kam', 'status', 'customer_type']
    search_fields = ['name', 'company_name', 'email', 'phone']
    ordering_fields = ['created_at', 'name', 'customer_type']

    def get_queryset(self):
        qs = Customer.objects.all()
        user = self.request.user
        if user.role and user.role.name == 'sales_person':
            qs = qs.filter(kam=user)
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

                # Handle kam by ID
                kam = None
                if row.get('kam'):
                    try:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        kam_id = int(row.get('kam'))
                        kam = User.objects.filter(id=kam_id).first()
                        if not kam:
                            errors.append(f'Row {index + 2}: KAM with ID {kam_id} not found')
                            continue
                    except (ValueError, TypeError):
                        errors.append(f'Row {index + 2}: Invalid kam ID')
                        continue

                # Handle status if provided
                if row.get('status'):
                    status_value = str(row.get('status', '')).strip()
                    valid_statuses = ['Active', 'Inactive', 'Lost']
                    if status_value in valid_statuses:
                        customer_data['status'] = status_value

                # Handle customer_type if provided
                if row.get('customer_type'):
                    customer_data['customer_type'] = str(row.get('customer_type', '')).strip()

                # Check if customer exists
                customer, created_flag = Customer.objects.get_or_create(
                    email=customer_data['email'],
                    defaults=customer_data
                )

                if created_flag:
                    # Set kam for new customer
                    if kam:
                        customer.kam = kam
                        customer.save()
                    created += 1
                else:
                    # Update existing customer
                    for key, value in customer_data.items():
                        setattr(customer, key, value)
                    # Update kam if provided
                    if kam:
                        customer.kam = kam
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
        queryset = Customer.objects.select_related('kam').all()
        export_format = request.query_params.get('format', 'csv').lower()

        if export_format == 'excel':
            # Export as Excel
            data = []
            for c in queryset:
                kam_id = c.kam.id if c.kam else ''
                data.append({
                    'id': c.id,
                    'name': c.name,
                    'company_name': c.company_name or '',
                    'email': c.email,
                    'phone': c.phone,
                    'address': c.address or '',
                    'customer_type': c.customer_type or '',
                    'kam': kam_id,
                    'status': c.status,
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
                header = ['id', 'name', 'company_name', 'email', 'phone', 'address', 'customer_type', 'kam', 'status', 'link_id', 'created_at']
                yield ','.join(header) + '\n'
                for c in queryset.iterator():
                    kam_id = str(c.kam.id) if c.kam else ''
                    row = [
                        str(c.id), 
                        c.name, 
                        c.company_name or '', 
                        c.email, 
                        c.phone,
                        c.address or '',
                        c.customer_type or '',
                        kam_id,
                        c.status, 
                        c.link_id or '',
                        c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else ''
                    ]
                    yield ','.join(row) + '\n'

            response = StreamingHttpResponse(row_iter(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="customers.csv"'
            return response


class ProspectExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['prospects:export']

    def get(self, request):
        queryset = Prospect.objects.select_related('kam').all()
        user = request.user
        if user.role and user.role.name == 'sales_person':
            queryset = queryset.filter(kam=user)
        
        export_format = request.query_params.get('format', 'csv').lower()

        if export_format == 'excel':
            # Export as Excel
            data = []
            for p in queryset:
                kam = p.kam.id if p.kam else ''
                data.append({
                    'id': p.id,
                    'name': p.name,
                    'company_name': p.company_name or '',
                    'email': p.email or '',
                    'phone': p.phone or '',
                    'address': p.address or '',
                    'potential_revenue': float(p.potential_revenue),
                    'contact_person': p.contact_person or '',
                    'source': p.source or '',
                    'follow_up_date': p.follow_up_date.strftime('%Y-%m-%d') if p.follow_up_date else '',
                    'notes': p.notes or '',
                    'status': p.status,
                    'kam': kam,
                    'created_at': p.created_at.strftime('%Y-%m-%d %H:%M:%S') if p.created_at else '',
                    'updated_at': p.updated_at.strftime('%Y-%m-%d %H:%M:%S') if p.updated_at else '',
                })

            df = pd.DataFrame(data)
            buffer = BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Prospects', index=False)
            buffer.seek(0)

            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="prospects.xlsx"'
            return response

        else:
            # Export as CSV (default)
            def row_iter():
                header = ['id', 'name', 'company_name', 'email', 'phone', 'address', 'potential_revenue', 'contact_person', 'source', 'follow_up_date', 'notes', 'status', 'kam', 'created_at', 'updated_at']
                yield ','.join(header) + '\n'
                for p in queryset.iterator():
                    kam = str(p.kam.id) if p.kam else ''
                    row = [
                        str(p.id), 
                        p.name, 
                        p.company_name or '', 
                        p.email or '', 
                        p.phone or '',
                        p.address or '', 
                        str(p.potential_revenue),
                        p.contact_person or '',
                        p.source or '',
                        p.follow_up_date.strftime('%Y-%m-%d') if p.follow_up_date else '',
                        (p.notes or '').replace('\n', ' ').replace(',', ' '),
                        p.status,
                        kam,
                        p.created_at.strftime('%Y-%m-%d %H:%M:%S') if p.created_at else '',
                        p.updated_at.strftime('%Y-%m-%d %H:%M:%S') if p.updated_at else ''
                    ]
                    yield ','.join(row) + '\n'

            response = StreamingHttpResponse(row_iter(), content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="prospects.csv"'
            return response


class ProspectImportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['prospects:import']
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.data.get('file')
        if not file:
            return Response({'detail': 'File is required'}, status=400)

        file_name = file.name.lower()
        if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
            return self._import_excel(file, request.user)
        elif file_name.endswith('.csv'):
            return self._import_csv(file, request.user)
        else:
            return Response({'detail': 'Unsupported file format. Please upload Excel (.xlsx, .xls) or CSV files.'}, status=400)

    def _import_excel(self, file, user):
        try:
            df = pd.read_excel(file)
            return self._process_dataframe(df, user)
        except Exception as e:
            return Response({'detail': f'Error reading Excel file: {str(e)}'}, status=400)

    def _import_csv(self, file, user):
        try:
            df = pd.read_csv(file)
            return self._process_dataframe(df, user)
        except Exception as e:
            return Response({'detail': f'Error reading CSV file: {str(e)}'}, status=400)

    def _process_dataframe(self, df, user):
        required_columns = ['name']
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
                prospect_data = {
                    'name': str(row.get('name', '')).strip(),
                    'company_name': str(row.get('company_name', '')).strip() or None,
                    'email': str(row.get('email', '')).strip().lower() or None,
                    'phone': str(row.get('phone', '')).strip() or None,
                    'address': str(row.get('address', '')).strip() or None,
                    'potential_revenue': float(row.get('potential_revenue', 0) or 0),
                    'contact_person': str(row.get('contact_person', '')).strip() or None,
                    'source': str(row.get('source', '')).strip() or None,
                    'notes': str(row.get('notes', '')).strip() or None,
                    'status': str(row.get('status', 'new')).strip() or 'new',
                }

                # Validate required fields
                if not prospect_data['name']:
                    errors.append(f'Row {index + 2}: Name is required')
                    continue

                # Parse follow_up_date if provided
                follow_up_date = None
                if row.get('follow_up_date'):
                    try:
                        follow_up_date = pd.to_datetime(row.get('follow_up_date')).date()
                    except:
                        pass

                # Parse kam if provided (by ID, username or email)
                kam = user  # Default to current user
                if row.get('kam'):
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    kam_identifier = str(row.get('kam', '')).strip()
                    # Try to find by ID first
                    try:
                        kam_id = int(kam_identifier)
                        found_user = User.objects.filter(id=kam_id).first()
                        if found_user:
                            kam = found_user
                        else:
                            errors.append(f'Row {index + 2}: KAM with ID {kam_id} not found')
                            continue
                    except (ValueError, TypeError):
                        # If not a number, try username or email
                        found_user = User.objects.filter(
                            models.Q(username=kam_identifier) | 
                            models.Q(email=kam_identifier)
                        ).first()
                        if found_user:
                            kam = found_user
                        else:
                            errors.append(f'Row {index + 2}: KAM with identifier "{kam_identifier}" not found')
                            continue

                # Check if prospect exists (by email if provided, otherwise by name+phone)
                prospect = None
                if prospect_data['email']:
                    # Try to find by email first
                    prospect = Prospect.objects.filter(email=prospect_data['email']).first()
                
                if not prospect and prospect_data['phone']:
                    # Try to find by name and phone
                    prospect = Prospect.objects.filter(
                        name=prospect_data['name'],
                        phone=prospect_data['phone']
                    ).first()

                if prospect:
                    # Update existing prospect
                    for key, value in prospect_data.items():
                        setattr(prospect, key, value)
                    if follow_up_date:
                        prospect.follow_up_date = follow_up_date
                    prospect.kam = kam
                    prospect.save()
                    updated += 1
                else:
                    # Create new prospect
                    prospect_data['kam'] = kam
                    if follow_up_date:
                        prospect_data['follow_up_date'] = follow_up_date
                    Prospect.objects.create(**prospect_data)
                    created += 1

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


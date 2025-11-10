from rest_framework import generics, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse
import csv
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
        # Placeholder validation and row-by-row reporting
        file = request.data.get('file')
        if not file:
            return Response({'detail': 'File is required'}, status=400)
        # TODO: implement full validation and rollback
        return Response({'success': True, 'processed': 0, 'errors': []})


class CustomerExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['customers:export']

    def get(self, request):
        queryset = Customer.objects.all()
        def row_iter():
            header = ['id', 'name', 'company_name', 'email', 'phone', 'monthly_revenue']
            yield ','.join(header) + '\n'
            for c in queryset.iterator():
                row = [str(c.id), c.name, c.company_name or '', c.email, c.phone, str(c.monthly_revenue)]
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


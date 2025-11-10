from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import StreamingHttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from .models import BillRecord
from .serializers import BillRecordSerializer
from apps.authentication.permissions import RequirePermissions


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
        return Response({'success': True, 'processed': 0, 'errors': []})


class BillExportView(APIView):
    permission_classes = [permissions.IsAuthenticated, RequirePermissions]
    required_permissions = ['bills:export']

    def get(self, request):
        queryset = BillRecord.objects.select_related('customer').all()
        def row_iter():
            header = [
                'id','customer','billing_date','status','nttn_cap','nttn_com',
                'iig_qt','iig_qt_price','fna','fna_price','ggc','ggc_price',
                'cdn','cdn_price','bdix','bdix_price','baishan','baishan_price',
                'discount','total_bill','total_received','total_due','remarks'
            ]
            yield ','.join(header) + '\n'
            for r in queryset.iterator():
                row = [
                    str(r.id), str(r.customer_id), str(r.billing_date or ''), r.status,
                    r.nttn_cap or '', r.nttn_com or '',
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


from django.contrib import admin
from django.urls import path, include
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions
from django.urls import re_path

# Customize admin site
admin.site.site_header = "Sales Dashboard Administration"
admin.site.site_title = "Sales Dashboard Admin"
admin.site.index_title = "Welcome to Sales Dashboard Administration"


schema_view = get_schema_view(
    openapi.Info(
        title="Sales Dashboard API",
        default_version='v1',
        description="""
        # Sales Dashboard API Documentation
        
        ## Overview
        Comprehensive billing and customer management system supporting multiple customer types:
        - **Bandwidth/Reseller Customers** - Traditional customers with usage-based billing
        - **MAC Partners** - Channel partners/franchises with commission-based billing  
        - **SOHO Customers** - Home customers with package-based billing
        
        ## Authentication
        Use JWT Bearer token authentication. Click the 'Authorize' button to add your Bearer token.
        
        ## API Organization
        APIs are organized into logical groups (tags) for easy navigation:
        
        ### 1. Bill Records (Bandwidth/Reseller)
        Unified billing system for all customer types (Bandwidth, MAC, SOHO)
        
        ### 2. Pricing Periods
        Manage variable pricing periods within billing cycles
        
        ### 3. Daily Bill Amounts
        Track and calculate daily bill amounts for accurate revenue reporting
        
        ### 4. Packages
        Manage MAC and SOHO packages (speed, rate, type)
        
        ### 5. MAC Partners
        Manage MAC/Channel Partner/Franchise partners
        
        ### 6. MAC End Customers
        Manage end-customers under MAC partners (200+ customers with different packages/rates)
        
        ### 7. MAC Bills
        Generate and manage bills for MAC partners with commission calculation
        
        ### 8. SOHO Customers
        Manage SOHO/Home customers with packages
        
        ### 9. SOHO Bills
        Generate and manage bills for SOHO customers
        
        ### 10. Payments
        Track all payments received with dates and payment methods
        
        ### 11. Revenue Analytics
        Get revenue breakdowns by customer type (Daily, Weekly, Monthly, Yearly)
        """,
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@example.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # API docs
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),

    # App routes
    path('api/auth/', include('apps.authentication.urls')),
    path('api/users/', include('apps.users.urls')),
    path('api/customers/', include('apps.customers.urls')),
    # path('api/bills/', include('apps.bills.urls')),
    # path('api/invoices/', include('apps.invoices.urls')),
    # path('api/dashboard/', include('apps.dashboard.urls')),
    # path('api/feedback/', include('apps.feedback.urls')),
]

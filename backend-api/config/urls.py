
from django.contrib import admin
from django.urls import path, include
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

# Customize admin site
admin.site.site_header = "Sales Dashboard Administration"
admin.site.site_title = "Sales Dashboard Admin"
admin.site.index_title = "Welcome to Sales Dashboard Administration"

schema_view = get_schema_view(
    openapi.Info(
        title="Sales Dashboard API",
        default_version='v1',
        description="API documentation with JWT Bearer token authentication. Use the 'Authorize' button to add your Bearer token.",
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
    path('api/bills/', include('apps.bills.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]

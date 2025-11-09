from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    TokenRefresh,
    RoleListCreateView,
    RoleDetailView,
    PermissionListView,
    AssignRoleView,
    MenuView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefresh.as_view(), name='auth-refresh'),

    path('roles/', RoleListCreateView.as_view(), name='roles-list-create'),
    path('roles/<int:pk>/', RoleDetailView.as_view(), name='roles-detail'),
    path('permissions/', PermissionListView.as_view(), name='permissions-list'),
    path('assign-role/<int:user_id>/', AssignRoleView.as_view(), name='assign-role'),
    path('menu/', MenuView.as_view(), name='menu'),
]



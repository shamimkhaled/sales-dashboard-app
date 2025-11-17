from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    RoleSerializer,
    PermissionSerializer,
    MenuItemSerializer,
)
from .models import Role, Permission, MenuItem
from .permissions import IsAdminOrSuperAdmin

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({'detail': 'Invalid refresh token'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'detail': 'Logged out'}, status=status.HTTP_205_RESET_CONTENT)


class TokenRefresh(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]


class PermissionListView(generics.ListAPIView):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]
    pagination_class = None  # Disable pagination for permissions


class RoleChoicesView(APIView):
    """Get predefined role name choices"""
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]

    def get(self, request):
        choices = [
            {'value': value, 'label': label}
            for value, label in Role.ROLE_CHOICES
        ]
        return Response(choices, status=status.HTTP_200_OK)


class AssignRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]

    def post(self, request, user_id):
        role_name = request.data.get('role')
        role = Role.objects.filter(name=role_name).first()
        if not role:
            return Response({'detail': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        user.role = role
        user.save()
        return Response({'detail': 'Role assigned'}, status=status.HTTP_200_OK)


class MenuView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Top-level items
        qs = MenuItem.objects.filter(is_active=True, parent__isnull=True).order_by('order')
        allowed = []
        for item in qs:
            if self._allowed(user, item):
                allowed.append(item)
        data = MenuItemSerializer(allowed, many=True).data
        return Response(data)

    def _allowed(self, user, item):
        if user.is_superuser:
            return True
        # Role allowlist OR permission-based
        if item.allowed_roles.exists():
            if user.role and item.allowed_roles.filter(id=user.role_id).exists():
                return True
        required = item.required_permissions.all()
        if not required:
            return True
        for perm in required:
            if not user.has_permission(perm.codename):
                return False
        return True

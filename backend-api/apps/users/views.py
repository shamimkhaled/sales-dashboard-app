from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserCreateSerializer
from apps.authentication.permissions import IsAdminOrSuperAdmin

User = get_user_model()


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
<<<<<<< HEAD
=======
        
        # Get user permissions
        user_permissions = []
        if user.is_superuser:
            user_permissions = ['all']
        elif hasattr(user, 'role') and user.role:
            # Get permissions from role
            user_permissions = list(user.role.permissions.values_list('codename', flat=True))
        
>>>>>>> arman
        return Response({
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'role': user.role.name if getattr(user, 'role', None) else None,
<<<<<<< HEAD
=======
            'is_superuser': user.is_superuser,
            'permissions': user_permissions,
>>>>>>> arman
        })


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrSuperAdmin]

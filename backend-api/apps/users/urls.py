from django.urls import path
from .views import MeView, UserListCreateView, UserDetailView, SalesUsersView

urlpatterns = [
    path('me/', MeView.as_view(), name='users-me'),
    path('sales-users/', SalesUsersView.as_view(), name='sales-users'),
    path('', UserListCreateView.as_view(), name='users-list-create'),
    path('<int:pk>/', UserDetailView.as_view(), name='users-detail'),
]



from django.urls import path
from .views import MeView, UserListCreateView, UserDetailView

urlpatterns = [
    path('me/', MeView.as_view(), name='users-me'),
    path('', UserListCreateView.as_view(), name='users-list-create'),
    path('<int:pk>/', UserDetailView.as_view(), name='users-detail'),
]



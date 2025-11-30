
from rest_framework import generics, permissions, filters, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.db import models
from django.utils import timezone
from datetime import datetime, date
from decimal import Decimal

from .models import KAMMaster, CustomerMaster
from apps.bills.models import CustomerEntitlementMaster
from .serializers import (
    KAMMasterSerializer,
    CustomerMasterSerializer,
)
from apps.authentication.permissions import RequirePermissions


# ==================== KAM Master Views ====================




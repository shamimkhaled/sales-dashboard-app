from rest_framework import serializers
from .models import (
    Prospect,
    ProspectStatusHistory,
    ProspectFollowUp,
    ProspectAttachment,
    Customer,
)


class ProspectSerializer(serializers.ModelSerializer):
    sales_person_details = serializers.SerializerMethodField()

    class Meta:
        model = Prospect
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_sales_person_details(self, obj):
        if obj.sales_person:
            return {
                'id': obj.sales_person.id,
                'username': getattr(obj.sales_person, 'username', ''),
                'email': obj.sales_person.email,
                'first_name': getattr(obj.sales_person, 'first_name', ''),
                'last_name': getattr(obj.sales_person, 'last_name', ''),
            }
        return None

    def validate_follow_up_date(self, value):
        from datetime import date
        if value and value < date.today():
            raise serializers.ValidationError('Follow-up date cannot be in the past')
        return value


class ProspectStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProspectStatusHistory
        fields = '__all__'
        read_only_fields = ['changed_at', 'changed_by']


class ProspectFollowUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProspectFollowUp
        fields = '__all__'
        read_only_fields = ['created_at']


class ProspectAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProspectAttachment
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'uploaded_by']


class CustomerSerializer(serializers.ModelSerializer):
    assigned_sales_person_details = serializers.SerializerMethodField()
    calculated_monthly_revenue = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'customer_number']
    
    def get_assigned_sales_person_details(self, obj):
        if obj.assigned_sales_person:
            return {
                'id': obj.assigned_sales_person.id,
                'username': getattr(obj.assigned_sales_person, 'username', ''),
                'email': obj.assigned_sales_person.email,
                'first_name': getattr(obj.assigned_sales_person, 'first_name', ''),
                'last_name': getattr(obj.assigned_sales_person, 'last_name', ''),
            }
        return None

    def get_calculated_monthly_revenue(self, obj):
        return obj.calculated_monthly_revenue




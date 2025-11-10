from rest_framework import serializers
from .models import (
    Prospect,
    ProspectStatusHistory,
    ProspectFollowUp,
    ProspectAttachment,
    Customer,
)


class ProspectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prospect
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'sales_person']

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
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']



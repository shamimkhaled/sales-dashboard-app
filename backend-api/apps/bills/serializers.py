from rest_framework import serializers
from .models import BillRecord


class BillRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillRecord
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        # Compute totals from components if not explicitly provided
        def d(name):
            val = attrs.get(name, getattr(self.instance, name, 0) if self.instance else 0)
            return val or 0

        component_total = (
            d('iig_qt') * d('iig_qt_price') +
            d('fna') * d('fna_price') +
            d('ggc') * d('ggc_price') +
            d('cdn') * d('cdn_price') +
            d('bdix') * d('bdix_price') +
            d('baishan') * d('baishan_price')
        )
        discount = d('discount')
        total_bill = component_total - discount
        total_received = d('total_received')
        total_due = total_bill - total_received

        attrs['total_bill'] = total_bill
        attrs['total_due'] = total_due
        return attrs




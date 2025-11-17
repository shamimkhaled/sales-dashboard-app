"""
Utility functions for customer operations
"""
from .models import Customer
import uuid
import logging

logger = logging.getLogger(__name__)


def convert_prospect_to_customer(prospect, link_id=None):
    """
    Convert a prospect to a customer when they take service
    Returns the created customer object or None if conversion fails
    """
    try:
        # Email is required for Customer model (unique constraint)
        if not prospect.email:
            # Generate a unique email based on prospect ID
            prospect_email = f"prospect_{prospect.id}_{uuid.uuid4().hex[:8]}@converted.local"
        else:
            prospect_email = prospect.email.strip().lower()
        
        # Check if customer already exists with this email
        existing_customer = Customer.objects.filter(email=prospect_email).first()
        if existing_customer:
            # Update existing customer instead of creating new one
            existing_customer.name = prospect.name
            existing_customer.company_name = prospect.company_name or existing_customer.company_name
            existing_customer.phone = prospect.phone or existing_customer.phone
            existing_customer.address = prospect.address or existing_customer.address
            existing_customer.assigned_sales_person = prospect.sales_person or existing_customer.assigned_sales_person
            if link_id:
                existing_customer.link_id = link_id
            existing_customer.status = 'Active'
            existing_customer.save()
            return existing_customer
        
        # Create new customer from prospect
        customer_data = {
            'name': prospect.name,
            'company_name': prospect.company_name or '',
            'email': prospect_email,
            'phone': prospect.phone or '',
            'address': prospect.address or '',
            'assigned_sales_person': prospect.sales_person,
            'status': 'Active',
        }
        
        if link_id:
            customer_data['link_id'] = link_id
        
        customer = Customer.objects.create(**customer_data)
        logger.info(f"Converted prospect {prospect.id} to customer {customer.id}")
        return customer
        
    except Exception as e:
        logger.error(f"Failed to convert prospect to customer: {str(e)}")
        return None


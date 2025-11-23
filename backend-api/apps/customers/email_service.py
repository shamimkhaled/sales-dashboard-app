"""
Email service for sending notifications about prospects and customers
Uses configurable email addresses from environment variables
"""
from django.core.mail import EmailMessage
from django.conf import settings
import os
import logging

logger = logging.getLogger(__name__)


def get_notification_emails(email_type='network_team'):
    """
    Get email addresses for notifications
    email_type can be: 'network_team', 'manager', or 'both'
    """
    emails = []
    
    # Get network team emails (for prospect confirmations)
    if email_type in ['network_team', 'both']:
        network_emails = os.environ.get('NETWORK_TEAM_EMAILS', '')
        if network_emails:
            emails.extend([e.strip() for e in network_emails.split(',') if e.strip()])
    
    # Get manager emails (for customer lost notifications)
    if email_type in ['manager', 'both']:
        manager_emails = os.environ.get('MANAGER_EMAILS', '')
        if manager_emails:
            emails.extend([e.strip() for e in manager_emails.split(',') if e.strip()])
    
    # Remove duplicates
    return list(set(emails))


def send_prospect_confirmation_email(prospect, confirmed=True, link_id=None):
    """
    Send email when prospect takes service (confirms or doesn't confirm)
    """
    try:
        recipient_emails = get_notification_emails('network_team')
        
        if not recipient_emails:
            logger.warning("No network team emails configured. Set NETWORK_TEAM_EMAILS environment variable.")
            return False
        
        # Prepare email subject and message
        if confirmed:
            subject = f"✅ Prospect Confirmed Service: {prospect.name}"
            confirmation_status = "CONFIRMED"
            action_text = "The customer has CONFIRMED service. Please proceed with customer setup and service activation."
        else:
            subject = f"❌ Prospect Did Not Confirm Service: {prospect.name}"
            confirmation_status = "NOT CONFIRMED"
            action_text = "The customer has NOT CONFIRMED service. Please follow up with the customer."
        
        message = f"""
Prospect Service Confirmation Update

Prospect Details:
- Name: {prospect.name}
- Company: {prospect.company_name or 'N/A'}
- Email: {prospect.email or 'N/A'}
- Phone: {prospect.phone or 'N/A'}
- Address: {prospect.address or 'N/A'}
- Potential Revenue: ${prospect.potential_revenue}
- KAM (Key Account Manager): {prospect.kam.get_full_name() if prospect.kam else 'N/A'}

Confirmation Status: {confirmation_status}

{action_text}

{f'Link ID: {link_id}' if link_id else ''}

Notes: {prospect.notes or 'None'}

---
This is an automated notification from Sales Dashboard System.
"""
        
        # Get from email
        from_email = os.environ.get('DEFAULT_FROM_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@salesdashboard.com'))
        
        # Send email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=from_email,
            to=recipient_emails,
        )
        
        email.send(fail_silently=False)
        logger.info(f"Sent prospect confirmation email to {recipient_emails}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send prospect confirmation email: {str(e)}")
        return False


def send_customer_lost_email(customer):
    """
    Send email when customer status changes to 'Lost'
    """
    try:
        recipient_emails = get_notification_emails('manager')
        
        if not recipient_emails:
            logger.warning("No manager emails configured. Set MANAGER_EMAILS environment variable.")
            return False
        
        # Prepare email subject and message
        subject = f"⚠️ Customer Lost Alert: {customer.name}"
        
        message = f"""
Customer Lost Notification

A customer has been marked as LOST:

Customer Details:
- Name: {customer.name}
- Company: {customer.company_name or 'N/A'}
- Email: {customer.email}
- Phone: {customer.phone}
- Address: {customer.address or 'N/A'}
- Status: {customer.status}
- KAM (Key Account Manager): {customer.kam.get_full_name() if customer.kam else 'N/A'}
- Monthly Revenue: ${customer.calculated_monthly_revenue}
- Link ID: {customer.link_id or 'N/A'}

This customer has been marked as lost. Please review and take necessary action.

Created: {customer.created_at}
Last Updated: {customer.updated_at}

---
This is an automated notification from Sales Dashboard System.
"""
        
        # Get from email
        from_email = os.environ.get('DEFAULT_FROM_EMAIL', getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@salesdashboard.com'))
        
        # Send email
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=from_email,
            to=recipient_emails,
        )
        
        email.send(fail_silently=False)
        logger.info(f"Sent customer lost email to {recipient_emails}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send customer lost email: {str(e)}")
        return False


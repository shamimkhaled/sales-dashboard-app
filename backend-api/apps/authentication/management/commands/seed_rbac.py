from django.core.management.base import BaseCommand
from django.db import transaction
from apps.authentication.models import Permission, Role, MenuItem


PERMISSIONS = [
    # Users & Authentication
    ('users:read', 'users', 'read', 'Read users'),
    ('users:create', 'users', 'create', 'Create users'),
    ('users:update', 'users', 'update', 'Update users'),
    ('users:delete', 'users', 'delete', 'Delete users'),
    
    # Customers & KAM
    ('customers:read', 'customers', 'read', 'Read customers'),
    ('customers:create', 'customers', 'create', 'Create customers'),
    ('customers:update', 'customers', 'update', 'Update customers'),
    ('customers:delete', 'customers', 'delete', 'Delete customers'),
    ('customers:import', 'customers', 'import', 'Import customers'),
    ('customers:export', 'customers', 'export', 'Export customers'),
    ('kam:read', 'kam', 'read', 'Read KAM'),
    ('kam:write', 'kam', 'update', 'Manage KAM'),
    
    # Prospects
    ('prospects:read', 'prospects', 'read', 'Read prospects'),
    ('prospects:create', 'prospects', 'create', 'Create prospects'),
    ('prospects:update', 'prospects', 'update', 'Update prospects'),
    ('prospects:delete', 'prospects', 'delete', 'Delete prospects'),
    
    # Entitlements & Billing
    ('entitlements:read', 'entitlements', 'read', 'Read customer entitlements'),
    ('entitlements:create', 'entitlements', 'create', 'Create entitlements'),
    ('entitlements:update', 'entitlements', 'update', 'Update entitlements'),
    ('entitlements:delete', 'entitlements', 'delete', 'Delete entitlements'),
    ('entitlement_details:read', 'entitlement_details', 'read', 'Read entitlement details'),
    ('entitlement_details:create', 'entitlement_details', 'create', 'Create entitlement details'),
    ('entitlement_details:update', 'entitlement_details', 'update', 'Update entitlement details'),
    ('entitlement_details:delete', 'entitlement_details', 'delete', 'Delete entitlement details'),
    
    # Invoices
    ('invoices:read', 'invoices', 'read', 'Read invoices'),
    ('invoices:create', 'invoices', 'create', 'Create invoices'),
    ('invoices:update', 'invoices', 'update', 'Update invoices'),
    ('invoices:delete', 'invoices', 'delete', 'Delete invoices'),
    ('invoices:export', 'invoices', 'export', 'Export invoices'),
    
    # Payments
    ('payments:read', 'payments', 'read', 'Read payments'),
    ('payments:create', 'payments', 'create', 'Create payments'),
    ('payments:update', 'payments', 'update', 'Update payments'),
    ('payments:delete', 'payments', 'delete', 'Delete payments'),
    
    # Feedback
    ('feedback:read', 'feedback', 'read', 'Read feedback'),
    ('feedback:create', 'feedback', 'create', 'Create feedback'),
    ('feedback:update', 'feedback', 'update', 'Update feedback'),
    ('feedback:delete', 'feedback', 'delete', 'Delete feedback'),
    ('feedback:comment', 'feedback', 'comment', 'Comment on feedback'),
    
    # Packages & Utilities
    ('packages:read', 'packages', 'read', 'Read packages'),
    ('packages:write', 'packages', 'update', 'Manage packages'),
    ('utilities:read', 'utilities', 'read', 'Read utilities'),
    ('utilities:write', 'utilities', 'update', 'Manage utilities'),
    
    # Reports & Logs
    ('reports:read', 'reports', 'read', 'Read reports'),
    ('logs:read', 'logs', 'read', 'View logs'),
    ('audit:read', 'audit', 'read', 'View audit logs'),
    ('settings:read', 'settings', 'read', 'View settings'),
    ('settings:write', 'settings', 'update', 'Manage settings'),

    # Roles & Permissions
    ('roles:read', 'roles', 'read', 'Read roles'),
    ('roles:write', 'roles', 'update', 'Create/Update/Delete roles'),
]

ROLES = {
    'super_admin': {
        'description': 'Super Administrator with full access to all resources',
        'permissions': 'ALL',
    },
    'admin': {
        'description': 'Administrator with comprehensive data and user management',
        'permissions': [
            # Users
            'users:read', 'users:create', 'users:update', 'users:delete',
            # Customers
            'customers:read', 'customers:create', 'customers:update', 'customers:delete',
            'customers:import', 'customers:export', 'kam:read', 'kam:write',
            # Prospects
            'prospects:read', 'prospects:create', 'prospects:update', 'prospects:delete',
            # Entitlements & Billing
            'entitlements:read', 'entitlements:create', 'entitlements:update', 'entitlements:delete',
            # Invoices
            'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete', 'invoices:export',
            # Payments
            'payments:read', 'payments:create', 'payments:update', 'payments:delete',
            # Feedback
            'feedback:read', 'feedback:create', 'feedback:update', 'feedback:delete', 'feedback:comment',
            # Packages & Utilities
            'packages:read', 'packages:write', 'utilities:read', 'utilities:write',
            # Reports & Logs
            'reports:read', 'logs:read', 'audit:read',
            'settings:read', 'settings:write',
            'roles:read', 'roles:write'
        ],
    },
    'sales_manager': {
        'description': 'Sales Manager with customer, prospect and billing oversight',
        'permissions': [
            # Customers
            'customers:read', 'customers:create', 'customers:update', 'customers:export', 'kam:read',
            # Prospects
            'prospects:read', 'prospects:create', 'prospects:update',
            # Entitlements & Billing
            'entitlements:read',
            'entitlement_details:read',            # Invoices
            'invoices:read', 
            # Payments
            'payments:read',
            # Feedback
            'feedback:read', 'feedback:create', 'feedback:update', 'feedback:comment',
            # Reports
            'reports:read'
        ],
    },
    'sales_person': {
        'description': 'Sales Person with customer and prospect management',
        'permissions': [
            # Customers
            'customers:read', 
            # Prospects
            'prospects:read', 'prospects:create', 'prospects:update',
            # Entitlements & Billing
            'entitlements:read', 'entitlement_details:read',
            # Invoices
            'invoices:read',
            # Feedback
            'feedback:read', 'feedback:create', 'feedback:comment',
            # Reports
            'reports:read'
        ],
    },
    'billing_manager': {
        'description': 'Billing Officer with invoice and payment management',
        'permissions': [
            # Customers (read-only)
            'customers:read', 'kam:read',
            # Prospects
            'prospects:read', 'prospects:create', 'prospects:update',

            # Entitlements & Billing
            'entitlements:read', 'entitlements:create', 'entitlements:update',
            'entitlement_details:read', 'entitlement_details:create', 'entitlement_details:update',
            # Invoices
            'invoices:read', 'invoices:create', 'invoices:update', 'invoices:export',
            # Payments
            'payments:read', 'payments:create', 'payments:update',
            # Reports
            'reports:read'
        ],
    },
    'viewer': {
        'description': 'Read-only access to view data',
        'permissions': [
            # Customers (read-only)
            'customers:read', 'kam:read',
            # Prospects (read-only)
            'prospects:read',
            # Entitlements & Billing (read-only)
            'entitlements:read',
            # Invoices (read-only)
            'invoices:read',
            # Payments (read-only)
            'payments:read',
            # Feedback (read-only)
            'feedback:read',
            # Packages & Utilities (read-only)
            'packages:read', 'utilities:read',
            # Reports
            'reports:read'
        ],
    },
}

MENU = [
    {
        'slug': 'dashboard', 'title': 'Dashboard', 'path': '/dashboard', 'icon': 'grid-3-2', 'order': 1,
        'required_permissions': ['reports:read'], 'children': []
    },
    {
        'slug': 'crm', 'title': 'CRM', 'path': '/crm', 'icon': 'briefcase', 'order': 2,
        'required_permissions': ['customers:read'],
        'children': [
            {'slug': 'customers', 'title': 'Customers', 'path': '/customers', 'icon': 'users', 'order': 1, 'required_permissions': ['customers:read']},
            {'slug': 'prospects', 'title': 'Prospects', 'path': '/prospects', 'icon': 'target', 'order': 2, 'required_permissions': ['prospects:read']},
            {'slug': 'kam', 'title': 'KAM Management', 'path': '/kam', 'icon': 'user-tie', 'order': 3, 'required_permissions': ['kam:read']},
        ]
    },
    {
        'slug': 'billing', 'title': 'Billing', 'path': '/billing', 'icon': 'file-invoice', 'order': 3,
        'required_permissions': ['entitlements:read'],
        'children': [
            {'slug': 'entitlements', 'title': 'Entitlements', 'path': '/entitlements', 'icon': 'list', 'order': 1, 'required_permissions': ['entitlements:read']},
            {'slug': 'invoices', 'title': 'Invoices', 'path': '/invoices', 'icon': 'receipt', 'order': 2, 'required_permissions': ['invoices:read']},
            {'slug': 'payments', 'title': 'Payments', 'path': '/payments', 'icon': 'credit-card', 'order': 3, 'required_permissions': ['payments:read']},
        ]
    },
    {
        'slug': 'feedback', 'title': 'Feedback', 'path': '/feedback', 'icon': 'message-square', 'order': 4,
        'required_permissions': ['feedback:read'], 'children': []
    },
    {
        'slug': 'reports', 'title': 'Reports', 'path': '/reports', 'icon': 'chart-bar', 'order': 5,
        'required_permissions': ['reports:read'], 'children': []
    },
    {
        'slug': 'admin', 'title': 'Administration', 'path': '/admin', 'icon': 'settings', 'order': 99,
        'required_permissions': ['users:read'],
        'children': [
            {'slug': 'users', 'title': 'Users', 'path': '/admin/users', 'icon': 'user-cog', 'order': 1, 'required_permissions': ['users:read']},
            {'slug': 'roles', 'title': 'Roles & Permissions', 'path': '/admin/roles', 'icon': 'shield', 'order': 2, 'required_permissions': ['roles:read']},
            {'slug': 'packages', 'title': 'Packages', 'path': '/admin/packages', 'icon': 'box', 'order': 3, 'required_permissions': ['packages:read']},
            {'slug': 'utilities', 'title': 'Utilities', 'path': '/admin/utilities', 'icon': 'zap', 'order': 4, 'required_permissions': ['utilities:read']},
            {'slug': 'logs', 'title': 'Audit Logs', 'path': '/admin/logs', 'icon': 'list', 'order': 5, 'required_permissions': ['logs:read']},
        ]
    },
]


class Command(BaseCommand):
    help = 'Seed default permissions, roles, and menu items'

    @transaction.atomic
    def handle(self, *args, **options):
        # Permissions
        code_to_perm = {}
        for codename, resource, action, desc in PERMISSIONS:
            perm, _ = Permission.objects.get_or_create(
                codename=codename,
                defaults={
                    'resource': resource,
                    'action': action,
                    'name': codename.replace(':', ' ').title(),
                    'description': desc,
                }
            )
            code_to_perm[codename] = perm
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(code_to_perm)} permissions"))

        # Roles
        for role_name, meta in ROLES.items():
            role, _ = Role.objects.get_or_create(name=role_name, defaults={'description': meta['description'], 'is_active': True})
            role.description = meta['description']
            role.save()
            role.permissions.clear()
            if meta['permissions'] == 'ALL':
                role.permissions.set(Permission.objects.all())
            else:
                role.permissions.set([code_to_perm[c] for c in meta['permissions'] if c in code_to_perm])
        self.stdout.write(self.style.SUCCESS("Seeded roles and attached permissions"))

        # Menu
        slug_to_item = {}
        def upsert_menu(item, parent=None):
            entry, _ = MenuItem.objects.get_or_create(slug=item['slug'], defaults={
                'title': item['title'], 'path': item['path'], 'icon': item.get('icon',''), 'order': item.get('order',0), 'parent': parent, 'is_active': True
            })
            # update fields
            entry.title = item['title']
            entry.path = item['path']
            entry.icon = item.get('icon','')
            entry.order = item.get('order',0)
            entry.parent = parent
            entry.is_active = True
            entry.save()
            # permissions
            entry.required_permissions.clear()
            perms = [code_to_perm[c] for c in item.get('required_permissions', []) if c in code_to_perm]
            if perms:
                entry.required_permissions.add(*perms)
            slug_to_item[entry.slug] = entry
            for child in item.get('children', []):
                upsert_menu(child, parent=entry)

        for root in MENU:
            upsert_menu(root, parent=None)
        self.stdout.write(self.style.SUCCESS("Seeded menu items"))

        self.stdout.write(self.style.SUCCESS('RBAC seed completed'))

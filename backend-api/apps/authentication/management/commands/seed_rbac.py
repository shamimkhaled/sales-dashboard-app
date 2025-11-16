from django.core.management.base import BaseCommand
from django.db import transaction
from apps.authentication.models import Permission, Role, MenuItem


PERMISSIONS = [
    # Users
    ('users:read', 'Users', 'read', 'Read users'),
    ('users:write', 'Users', 'update', 'Create/Update/Delete users'),
    # Customers
    ('customers:read', 'customers', 'read', 'Read customers'),
    ('customers:update', 'customers', 'update', 'Modify customers'),
    ('customers:import', 'customers', 'import', 'Import customers'),
    ('customers:export', 'customers', 'export', 'Export customers'),
    # Prospects
    ('prospects:read', 'prospects', 'read', 'Read prospects'),
    ('prospects:update', 'prospects', 'update', 'Modify prospects'),
    # Bills
    ('bills:read', 'bills', 'read', 'Read bills'),
    ('bills:create', 'bills', 'create', 'Create bills'),
    ('bills:update', 'bills', 'update', 'Update bills'),
    ('bills:import', 'bills', 'import', 'Import bills'),
    ('bills:export', 'bills', 'export', 'Export bills'),
    # Reports & Logs
    ('reports:read', 'reports', 'read', 'Read reports'),
    ('logs:read', 'logs', 'read', 'Read logs'),
    ('settings:read', 'settings', 'read', 'View settings'),

    # Roles
    ('role:read', 'role', 'read', 'Read roles'),
    ('role:write', 'role', 'update', 'Create/Update/Delete roles'), 

]

ROLES = {
    'super_admin': {
        'description': 'Super Administrator with full access',
        'permissions': 'ALL',
    },
    'admin': {
        'description': 'Administrator with user and data management',
        'permissions': [
            'users:read','users:write',
            'customers:read','customers:update','customers:import','customers:export',
            'prospects:read','prospects:update',
            'bills:read','bills:create','bills:update','bills:import','bills:export',
            'reports:read','logs:read','settings:read', 'role:read', 'role:write'
        ],
    },
    'sales_manager': {
        'description': 'Sales Manager with customer/prospect oversight',
        'permissions': [
            'customers:read','customers:update','customers:export',
            'prospects:read','prospects:update',
            'bills:read','bills:create','bills:update',
            'reports:read'
        ],
    },
    'sales_person': {
        'description': 'Sales person limited to assigned accounts',
        'permissions': [
            'customers:read','prospects:read','prospects:update', 'sales_person:update',
            # 'bills:read','bills:create','bills:update',
            'reports:read'
        ],
    },
    'user': {
        'description': 'Regular user with limited access',
        'permissions': [
            'customers:read','bills:read','reports:read'
        ],
    },
}

MENU = [
    {
        'slug': 'dashboard', 'title': 'Dashboard', 'path': '/dashboard', 'icon': 'dashboard', 'order': 1,
        'required_permissions': ['reports:read'], 'children': []
    },
    {
        'slug': 'customers', 'title': 'Customers', 'path': '/customers', 'icon': 'users', 'order': 2,
        'required_permissions': ['customers:read'], 'children': []
    },
    {
        'slug': 'prospects', 'title': 'Prospects', 'path': '/prospects', 'icon': 'target', 'order': 3,
        'required_permissions': ['prospects:read'], 'children': []
    },
    {
        'slug': 'bills', 'title': 'Bills', 'path': '/bills', 'icon': 'file-invoice', 'order': 4,
        'required_permissions': ['bills:read'], 'children': []
    },
    {
        'slug': 'reports', 'title': 'Reports', 'path': '/reports', 'icon': 'chart', 'order': 5,
        'required_permissions': ['reports:read'], 'children': []
    },
    {
        'slug': 'admin', 'title': 'Admin', 'path': '/admin', 'icon': 'settings', 'order': 99,
        'required_permissions': ['users:read'], 'children': [
            {'slug': 'users', 'title': 'Users', 'path': '/admin/users', 'icon': 'user-cog', 'order': 1, 'required_permissions': ['users:read']},
            {'slug': 'roles', 'title': 'Roles', 'path': '/admin/roles', 'icon': 'shield', 'order': 2, 'required_permissions': ['users:write']},
            {'slug': 'logs', 'title': 'Logs', 'path': '/admin/logs', 'icon': 'list', 'order': 3, 'required_permissions': ['logs:read']},
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

"""
Swagger tags configuration for organizing bill APIs
"""
from drf_yasg import openapi

# Define tag groups for better organization in Swagger UI
SWAGGER_TAGS = [
    {
        'name': '1. Bill Records (Bandwidth/Reseller)',
        'description': 'Unified bill entry system for all customer types (Bandwidth/Reseller, MAC Partner, SOHO)'
    },
    {
        'name': '2. Pricing Periods',
        'description': 'Manage variable pricing periods within billing cycles'
    },
    {
        'name': '3. Daily Bill Amounts',
        'description': 'Track and calculate daily bill amounts for accurate revenue reporting'
    },
    {
        'name': '4. Packages',
        'description': 'Manage MAC and SOHO packages (speed, rate, type)'
    },
    {
        'name': '5. MAC Partners',
        'description': 'Manage MAC/Channel Partner/Franchise partners and their end-customers'
    },
    {
        'name': '6. MAC End Customers',
        'description': 'Manage end-customers under MAC partners (200+ customers with different packages/rates)'
    },
    {
        'name': '7. MAC Bills',
        'description': 'Generate and manage bills for MAC partners with commission calculation'
    },
    {
        'name': '8. SOHO Customers',
        'description': 'Manage SOHO/Home customers with packages'
    },
    {
        'name': '9. SOHO Bills',
        'description': 'Generate and manage bills for SOHO customers'
    },
    {
        'name': '10. Payments',
        'description': 'Track all payments received with dates and payment methods'
    },
    {
        'name': '11. Revenue Analytics',
        'description': 'Get revenue breakdowns by customer type (Daily, Weekly, Monthly, Yearly)'
    },
]


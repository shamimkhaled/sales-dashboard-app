const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sales Dashboard API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for Sales Dashboard Analytics System',
      contact: {
        name: 'Development Team',
        email: 'support@salesdashboard.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development Server',
      },
      {
        url: 'http://localhost:5000/api',
        description: 'Alternative Development Server',
      },
    ],

    
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'User ID',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'admin', 'user'],
              description: 'User role',
            },
            is_active: {
              type: 'boolean',
              description: 'User active status',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
            rememberMe: {
              type: 'boolean',
              description: 'Remember me option',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
            accessToken: {
              type: 'string',
              description: 'JWT access token',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
            expiresIn: {
              type: 'string',
              description: 'Token expiration time',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              description: 'Username',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'admin', 'user'],
              description: 'User role (optional, defaults to user)',
            },
          },
        },
        ActivityLog: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Activity log ID',
            },
            user_id: {
              type: 'integer',
              description: 'User ID who performed the action',
            },
            username: {
              type: 'string',
              description: 'Username',
            },
            action: {
              type: 'string',
              description: 'Action performed',
            },
            resource: {
              type: 'string',
              description: 'Resource type affected',
            },
            resource_id: {
              type: 'integer',
              description: 'Resource ID affected',
            },
            details: {
              type: 'string',
              description: 'Action details in JSON format',
            },
            ip_address: {
              type: 'string',
              description: 'User IP address',
            },
            user_agent: {
              type: 'string',
              description: 'User agent string',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp',
            },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Role ID',
            },
            name: {
              type: 'string',
              description: 'Role name',
            },
            description: {
              type: 'string',
              description: 'Role description',
            },
            permissions: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Role permissions',
            },
          },
        },
        Customer: {
          type: 'object',
          required: ['serial_number', 'name_of_party'],
          properties: {
            id: {
              type: 'integer',
              description: 'Customer ID',
            },
            serial_number: {
              type: 'integer',
              description: 'Unique serial number',
            },
            name_of_party: {
              type: 'string',
              description: 'Name of the party/company',
            },
            address: {
              type: 'string',
              description: 'Customer address',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Customer email',
            },
            proprietor_name: {
              type: 'string',
              description: 'Name of proprietor',
            },
            phone_number: {
              type: 'string',
              description: 'Contact phone number',
            },
            link_id: {
              type: 'string',
              description: 'Link ID',
            },
            remarks: {
              type: 'string',
              description: 'Additional remarks',
            },
            kam: {
              type: 'string',
              description: 'Key Account Manager',
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive', 'Suspended'],
              description: 'Customer status',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },


        Bill: {
          type: 'object',
          required: ['customer_id'],
          properties: {
            id: {
              type: 'integer',
              description: 'Bill ID',
            },
            customer_id: {
              type: 'integer',
              description: 'Associated customer ID',
            },
            nttn_cap: {
              type: 'string',
              description: 'NTTN CAP',
            },
            nttn_com: {
              type: 'string',
              description: 'NTTN COM',
            },
            active_date: {
              type: 'string',
              format: 'date',
              description: 'Service active date',
            },
            billing_date: {
              type: 'string',
              format: 'date',
              description: 'Billing date',
            },
            termination_date: {
              type: 'string',
              format: 'date',
              description: 'Service termination date',
            },
            iig_qt: {
              type: 'number',
              format: 'float',
              description: 'IIG-QT quantity',
            },
            iig_qt_price: {
              type: 'number',
              format: 'float',
              description: 'IIG-QT price',
            },
            fna: {
              type: 'number',
              format: 'float',
              description: 'FNA quantity',
            },
            fna_price: {
              type: 'number',
              format: 'float',
              description: 'FNA price',
            },
            ggc: {
              type: 'number',
              format: 'float',
              description: 'GGC quantity',
            },
            ggc_price: {
              type: 'number',
              format: 'float',
              description: 'GGC price',
            },
            cdn: {
              type: 'number',
              format: 'float',
              description: 'CDN quantity',
            },
            cdn_price: {
              type: 'number',
              format: 'float',
              description: 'CDN price',
            },
            bdix: {
              type: 'number',
              format: 'float',
              description: 'BDIX quantity',
            },
            bdix_price: {
              type: 'number',
              format: 'float',
              description: 'BDIX price',
            },
            baishan: {
              type: 'number',
              format: 'float',
              description: 'BAISHAN quantity',
            },
            baishan_price: {
              type: 'number',
              format: 'float',
              description: 'BAISHAN price',
            },
            total_bill: {
              type: 'number',
              format: 'float',
              description: 'Total bill amount',
            },
            total_received: {
              type: 'number',
              format: 'float',
              description: 'Total amount received',
            },
            total_due: {
              type: 'number',
              format: 'float',
              description: 'Total due amount',
            },
            discount: {
              type: 'number',
              format: 'float',
              description: 'Discount amount',
            },
            remarks: {
              type: 'string',
              description: 'Bill remarks',
            },
            status: {
              type: 'string',
              enum: ['Active', 'Inactive', 'Terminated'],
              description: 'Bill status',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        BillWithCustomer: {
          type: 'object',
          description: 'Bill record with associated customer information',
          allOf: [
            { $ref: '#/components/schemas/Bill' },
            {
              type: 'object',
              properties: {
                serial_number: {
                  type: 'integer',
                  description: 'Customer serial number',
                },
                name_of_party: {
                  type: 'string',
                  description: 'Customer name',
                },
                address: {
                  type: 'string',
                  description: 'Customer address',
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'Customer email',
                },
                proprietor_name: {
                  type: 'string',
                  description: 'Customer proprietor name',
                },
                phone_number: {
                  type: 'string',
                  description: 'Customer phone number',
                },
                link_id: {
                  type: 'string',
                  description: 'Customer link ID',
                },
                kam: {
                  type: 'string',
                  description: 'Key Account Manager',
                },
                customer_status: {
                  type: 'string',
                  enum: ['Active', 'Inactive', 'Suspended'],
                  description: 'Customer status',
                },
                customer_remarks: {
                  type: 'string',
                  description: 'Customer remarks',
                },
              },
            },
          ],
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            status: {
              type: 'integer',
              description: 'HTTP status code',
            },
          },
        },
      },
    },
  },
  apis: [
    '../routes/authRoutes.js',
    '../routes/userRoutes.js',
    '../routes/activityLogRoutes.js',
    '../routes/customerRoutes.js',
    '../routes/billRoutes.js',
    '../routes/dshboardRoutes.js',
    '../routes/uploadRotues.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

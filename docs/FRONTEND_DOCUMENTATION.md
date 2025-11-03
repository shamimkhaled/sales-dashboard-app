# Frontend Documentation - Sales Dashboard Analytics

## 🎨 Overview

The frontend is a modern React application with an aristocratic design aesthetic, built using Vite, React Router, and Tailwind CSS. It provides an elegant, premium user experience for sales analytics and data management.

## 🏗️ Architecture

### Technology Stack
- **Framework**: React 19.1.1 with Hooks
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 3.x with custom design system
- **Routing**: React Router DOM 7.9.5
- **HTTP Client**: Axios 1.13.1
- **Icons**: React Icons 5.5.0
- **Charts**: Chart.js 4.5.1 with react-chartjs-2 5.3.1

### Project Structure
```
frontend/
├── public/
│   └── vite.svg                    # Vite favicon
├── src/
│   ├── components/                 # Reusable UI components
│   │   ├── Navbar.jsx             # Main navigation
│   │   ├── KPICard.jsx            # KPI display cards
│   │   ├── LoadingSpinner.jsx     # Loading indicators
│   │   └── ErrorAlert.jsx         # Notification alerts
│   ├── pages/                     # Page components
│   │   ├── Dashboard.jsx          # Main dashboard
│   │   └── DataEntry.jsx          # Data input forms
│   ├── services/                  # API service layer
│   │   ├── api.js                 # Axios configuration
│   │   ├── customerService.js     # Customer API calls
│   │   ├── billService.js         # Bill API calls
│   │   └── dashboardService.js    # Dashboard API calls
│   ├── App.jsx                    # Main app component
│   ├── App.css                    # Legacy styles (minimal)
│   ├── index.css                  # Tailwind CSS + custom styles
│   └── main.jsx                   # React entry point
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite configuration
└── eslint.config.js               # ESLint configuration
```

## 🎨 Design System

### Color Palette
```css
--primary-gold: #D4AF37;        /* Primary gold */
--primary-gold-light: #E6C84A;  /* Light gold */
--primary-gold-dark: #B8860B;   /* Dark gold */
--secondary-silver: #C0C0C0;    /* Silver */
--accent-platinum: #E5E4E2;     /* Platinum */
--dark-ebony: #0C0C0C;          /* Deep black */
--dark-charcoal: #1A1A1A;       /* Charcoal */
--dark-slate: #2D2D2D;          /* Slate */
--text-light: #F8F9FA;          /* Light text */
--text-muted: #ADB5BD;          /* Muted text */
```

### Typography
- **Headings**: Cormorant Garamond (serif, elegant)
- **Body**: Inter (sans-serif, modern)
- **Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Key Design Principles
1. **Aristocratic Luxury**: Gold accents, elegant spacing, premium feel
2. **Modern UX**: Smooth animations, glassmorphism, responsive design
3. **Accessibility**: Proper contrast, keyboard navigation, screen reader support
4. **Performance**: Optimized animations, lazy loading, efficient rendering

## 🧩 Components Documentation

### Navbar Component (`Navbar.jsx`)

#### Purpose
Premium navigation bar with glassmorphism effects and responsive design.

#### Props
None (uses React Router for navigation)

#### Features
- **Glassmorphism**: Backdrop blur with transparency
- **Responsive**: Mobile hamburger menu
- **Animations**: Smooth hover effects and transitions
- **Active States**: Visual indication of current page

#### Usage
```jsx
import Navbar from './components/Navbar';

// Automatically renders navigation
<Navbar />
```

#### CSS Classes Used
- `navbar-luxury`: Main navigation container
- `navbar-brand-luxury`: Logo/brand styling
- `nav-link-luxury`: Navigation link styling

### KPICard Component (`KPICard.jsx`)

#### Purpose
Display key performance indicators with aristocratic styling and animations.

#### Props
```jsx
interface KPICardProps {
  title: string;           // KPI label
  value: string | number;  // KPI value
  icon: React.Component;   // Icon component
  color?: 'gold' | 'success' | 'danger' | 'primary'; // Color theme
}
```

#### Features
- **3D Effects**: Hover animations with elevation
- **Color Coding**: Different themes for different metrics
- **Icon Integration**: Scalable vector icons
- **Responsive**: Adapts to different screen sizes

#### Usage
```jsx
import KPICard from './components/KPICard';
import { FaUsers } from 'react-icons/fa';

<KPICard
  title="Total Customers"
  value="1,234"
  icon={FaUsers}
  color="gold"
/>
```

### LoadingSpinner Component (`LoadingSpinner.jsx`)

#### Purpose
Display loading states with aristocratic styling.

#### Props
```jsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';  // Spinner size
  message?: string;                  // Optional loading message
}
```

#### Features
- **Multiple Sizes**: sm (24px), md (32px), lg (48px), xl (64px)
- **Custom Messages**: Optional text display
- **Smooth Animation**: CSS-based rotation animation
- **Accessibility**: Proper ARIA labels

#### Usage
```jsx
import LoadingSpinner from './components/LoadingSpinner';

// Default size with message
<LoadingSpinner message="Loading data..." />

// Small size, no message
<LoadingSpinner size="sm" />
```

### ErrorAlert Component (`ErrorAlert.jsx`)

#### Purpose
Display error, success, warning, and info messages with elegant styling.

#### Props
```jsx
interface ErrorAlertProps {
  message: string;                    // Alert message
  type?: 'error' | 'success' | 'warning' | 'info'; // Alert type
  onClose?: () => void;              // Close handler
  className?: string;                // Additional CSS classes
}
```

#### Features
- **Multiple Types**: Error, success, warning, info
- **Auto-dismiss**: Optional close functionality
- **Icons**: Type-specific icons
- **Animations**: Smooth slide-in effects
- **Accessibility**: Proper ARIA roles and labels

#### Usage
```jsx
import ErrorAlert from './components/ErrorAlert';

<ErrorAlert
  message="Data saved successfully!"
  type="success"
  onClose={() => setError(null)}
/>
```

## 📄 Pages Documentation

### Dashboard Page (`Dashboard.jsx`)

#### Purpose
Main analytics dashboard displaying KPIs and performance metrics.

#### State Management
```jsx
const [overview, setOverview] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

#### Features
- **Real-time KPIs**: Customer count, billing amounts, collection rates
- **Performance Indicators**: Visual progress bars and metrics
- **Error Handling**: Graceful error display with retry options
- **Responsive Layout**: Grid system adapting to screen sizes
- **Animations**: Fade-in effects for smooth loading

#### API Integration
- Fetches data from `/api/dashboard/overview`
- Handles loading and error states
- Provides refresh functionality

### DataEntry Page (`DataEntry.jsx`)

#### Purpose
Form for creating customer records and associated billing information.

#### State Management
```jsx
const [formData, setFormData] = useState({
  serial_number: '',
  name_of_party: '',
  email: '',
  phone_number: '',
  total_bill: '',
  total_received: '',
  discount: '',
  status: 'Active',
});
const [loading, setLoading] = useState(false);
const [message, setMessage] = useState(null);
const [calculatedDue, setCalculatedDue] = useState(0);
```

#### Features
- **Auto-calculation**: Real-time due amount calculation
- **Form Validation**: Client-side validation with visual feedback
- **Dual Creation**: Creates both customer and bill records
- **Success/Error Handling**: Comprehensive feedback system
- **Responsive Design**: Two-column layout on larger screens

#### Form Fields
- **Customer Info**: Serial number, name, contact details
- **Billing Info**: Amounts, discounts, status
- **Calculated Fields**: Due amount (auto-calculated)

## 🔧 Services Layer

### API Service (`api.js`)

#### Configuration
```javascript
const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});
```

#### Features
- **Environment-aware**: Different URLs for development/production
- **Interceptors**: Request/response interceptors for error handling
- **Error Handling**: Centralized error processing
- **Timeout**: 10-second request timeout

#### Error Handling
- **Network Errors**: Connection issues
- **Server Errors**: 4xx/5xx responses
- **Timeout Errors**: Request timeouts
- **Validation Errors**: Form validation failures

### Specialized Services

#### Customer Service (`customerService.js`)
```javascript
const customerService = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};
```

#### Bill Service (`billService.js`)
```javascript
const billService = {
  getAll: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  delete: (id) => api.delete(`/bills/${id}`),
};
```

#### Dashboard Service (`dashboardService.js`)
```javascript
const dashboardService = {
  getOverview: () => api.get('/dashboard/overview'),
  getTopCustomers: () => api.get('/dashboard/top-customers'),
  getRevenueByService: () => api.get('/dashboard/revenue-by-service'),
  getCollectionStatus: () => api.get('/dashboard/collection-status'),
  getCustomerStatus: () => api.get('/dashboard/customer-status'),
};
```

## 🎨 Styling System

### Tailwind CSS Configuration

#### Custom Components (in `index.css`)
```css
@layer components {
  .card-aristocratic {
    @apply bg-gradient-to-br from-gray-800/90 to-gray-900/90;
    @apply backdrop-blur-xl border border-gold-500/20;
    @apply rounded-2xl shadow-luxury transition-all duration-500;
    @apply hover:shadow-2xl hover:border-gold-400/40 hover:-translate-y-2;
  }

  .btn-luxury {
    @apply relative overflow-hidden bg-gradient-to-r from-gold-500 to-gold-600;
    @apply text-gray-900 font-semibold uppercase tracking-wide;
    @apply px-8 py-4 rounded-xl shadow-lg hover:shadow-xl;
    @apply transform hover:-translate-y-1 transition-all duration-300;
    @apply border-2 border-gold-400;
  }

  .form-control-aristocratic {
    @apply bg-gray-800/50 backdrop-blur-sm border-2 border-gold-500/20;
    @apply rounded-xl text-white placeholder-gray-400 px-4 py-3;
    @apply transition-all duration-300 focus:bg-gray-700/50;
    @apply focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20;
  }
}
```

#### Utility Classes
```css
@layer utilities {
  .shadow-luxury { box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); }
  .shadow-elegant { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
  .text-gold-400 { color: var(--primary-gold); }
  .bg-gold-400 { background-color: var(--primary-gold); }
}
```

### Responsive Design
- **Mobile-first**: Base styles for mobile, enhanced for larger screens
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Grid System**: Flexbox-based responsive grids
- **Typography**: Fluid typography with clamp() functions

## 🚀 Performance Optimizations

### Code Splitting
- **Route-based**: Automatic code splitting with React Router
- **Component Lazy Loading**: Dynamic imports for heavy components
- **Vendor Chunking**: Separate chunks for node_modules

### Image Optimization
- **SVG Icons**: Scalable vector graphics
- **CSS-based Animations**: Hardware-accelerated animations
- **Minimal Images**: Icon-based design reduces image dependencies

### Bundle Analysis
```bash
npm run build
# Analyze bundle with vite-bundle-analyzer
```

## 🧪 Testing Strategy

### Component Testing
```jsx
import { render, screen } from '@testing-library/react';
import KPICard from './components/KPICard';

test('renders KPI card with correct data', () => {
  render(<KPICard title="Test" value="100" icon={FaTest} />);
  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
});
```

### Integration Testing
- **API Integration**: Mock API responses
- **Form Submissions**: End-to-end form testing
- **Navigation**: Route testing with React Router

## 🔧 Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables
```env
# .env.local
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Sales Dashboard Analytics
```

### Build Configuration (`vite.config.js`)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

## 📱 Browser Support

### Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Polyfills
- **CSS Grid**: Autoprefixer handles vendor prefixes
- **ES6 Features**: Vite provides necessary polyfills
- **Fetch API**: Axios handles HTTP requests

## ♿ Accessibility

### WCAG 2.1 AA Compliance
- **Color Contrast**: Minimum 4.5:1 ratio
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Proper heading hierarchy

### Accessibility Features
- **ARIA Labels**: Descriptive labels for screen readers
- **Focus Traps**: Modal focus management
- **Skip Links**: Navigation shortcuts
- **Alt Text**: Icon descriptions

## 🔮 Future Enhancements

### Planned Features
- [ ] Dark/light theme toggle
- [ ] Advanced data visualization charts
- [ ] Real-time notifications
- [ ] Offline support with service workers
- [ ] Progressive Web App (PWA) features
- [ ] Multi-language support (i18n)
- [ ] Advanced form validation
- [ ] Data export functionality

### Technical Improvements
- [ ] Component library extraction
- [ ] Storybook for component documentation
- [ ] Cypress for E2E testing
- [ ] Performance monitoring
- [ ] Error tracking and reporting
- [ ] Bundle size optimization

---

**Component Version**: 1.0.0
**Last Updated**: November 2024
**React Version**: 19.1.1
**Tailwind Version**: 3.x
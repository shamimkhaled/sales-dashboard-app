/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#D4AF37',
          500: '#E6C84A',
          600: '#B8860B',
        },
        silver: {
          400: '#C0C0C0',
        },
        platinum: {
          400: '#E5E4E2',
        },
        ebony: {
          900: '#0C0C0C',
        },
        charcoal: {
          800: '#1A1A1A',
        },
        slate: {
          700: '#2D2D2D',
        },
      },
      fontFamily: {
        'cormorant': ['Cormorant Garamond', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 20px 60px rgba(0, 0, 0, 0.3)',
        'elegant': '0 10px 30px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        'luxury': '16px',
        'elegant': '12px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in-left': 'slideInLeft 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
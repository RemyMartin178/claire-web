/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: '#64748b',
        accent: '#06b6d4',
        'subtle-bg': '#f8f7f4',
        'subtle-active-bg': '#e7e5e4',
        // Palette cohérente pour le dark mode
        'sidebar-bg': '#0f1115',
        'sidebar-border': 'rgba(255, 255, 255, 0.1)',
        'chat-bg': '#343541',
        'card-bg': '#202123',
        'text-main': '#ffffff',
        'text-secondary': '#9ca3af',
        'text-muted': '#6b7280',
        'accent-light': '#9ca3af',
        'hover-bg': 'rgba(255, 255, 255, 0.05)',
        'active-bg': 'rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'zoom-in': 'zoomIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'zoom-out': 'zoomOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(20px) scale(0.95)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)' 
          },
        },
        slideIn: {
          '0%': { 
            transform: 'translateX(-100%) scale(0.95)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0) scale(1)', 
            opacity: '1'
          },
        },
        slideInRight: {
          '0%': { 
            transform: 'translateX(100%) scale(0.95)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0) scale(1)', 
            opacity: '1'
          },
        },
        slideUp: {
          '0%': { 
            transform: 'translateY(100%)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'translateY(0)', 
            opacity: '1'
          },
        },
        slideDown: {
          '0%': { 
            transform: 'translateY(-100%)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'translateY(0)', 
            opacity: '1'
          },
        },
        scaleIn: {
          '0%': { 
            transform: 'scale(0.8)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'scale(1)', 
            opacity: '1'
          },
        },
        zoomIn: {
          '0%': { 
            transform: 'scale(0.9)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'scale(1)', 
            opacity: '1'
          },
        },
        zoomOut: {
          '0%': { 
            transform: 'scale(1.1)', 
            opacity: '0'
          },
          '100%': { 
            transform: 'scale(1)', 
            opacity: '1'
          },
        },
        bounceGentle: {
          '0%, 100%': { 
            transform: 'translateY(0) scale(1)' 
          },
          '50%': { 
            transform: 'translateY(-8px) scale(1.02)' 
          },
        },
        pulseSoft: {
          '0%, 100%': { 
            opacity: '1', 
            transform: 'scale(1)'
          },
          '50%': { 
            opacity: '0.8', 
            transform: 'scale(1.05)'
          },
        },
        shimmer: {
          '0%': { 
            backgroundPosition: '-200px 0' 
          },
          '100%': { 
            backgroundPosition: 'calc(200px + 100%) 0' 
          },
        },
        float: {
          '0%, 100%': { 
            transform: 'translateY(0px)' 
          },
          '50%': { 
            transform: 'translateY(-10px)' 
          },
        },
        glow: {
          '0%': { 
            boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)' 
          },
          '100%': { 
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' 
          },
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'large': '0 8px 24px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-strong': '0 0 30px rgba(59, 130, 246, 0.5)',
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
        'cluely': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'cluely-hover': '0 12px 40px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      transitionTimingFunction: {
        'cluely': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-soft': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
} 
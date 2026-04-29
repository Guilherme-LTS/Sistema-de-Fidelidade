/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Primária: Teal */
        teal: {
          50: '#f0fdf9',
          100: '#dffaf4',
          200: '#bef3e8',
          300: '#7eead6',
          400: '#5ce1d0',
          500: '#0f766e', /* PRIMARY */
          600: '#0d6662',
          700: '#0b5f58', /* DARK */
          800: '#094a45',
          900: '#073c37',
        },
        /* Secundária: Gold/Amarelo */
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f4c542', /* SECONDARY */
          600: '#ffe768', /* LIGHT VARIANT */
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
        },
        /* Terciária: Verde */
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#16a34a', /* TERTIARY */
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
          900: '#052e16',
        },
        /* Neutras Customizadas */
        stone: {
          50: '#f8f9fb', /* BG */
          100: '#f3f5f9',
          200: '#e5e7eb',
          300: '#d7deea', /* BORDER */
          400: '#9ca7cb',
          500: '#667085', /* TEXT SECONDARY */
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937', /* TEXT PRIMARY */
          900: '#111827',
        },
        /* Semânticas */
        success: {
          500: '#1f8a52',
          600: '#16a34a',
        },
        warning: {
          500: '#d97706',
          600: '#ea580c',
        },
        danger: {
          500: '#dc2626',
          600: '#b91c1c',
        },
        info: {
          500: '#0369a1',
          600: '#0284c7',
        },
      },
      fontFamily: {
        heading: ['"Sora"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        body: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      spacing: {
        /* 8px base system */
        xs: '0.25rem', /* 4px */
        sm: '0.5rem', /* 8px */
        md: '0.75rem', /* 12px */
        lg: '1rem', /* 16px */
        xl: '1.5rem', /* 24px */
        '2xl': '2rem', /* 32px */
        '3xl': '3rem', /* 48px */
        '4xl': '4rem', /* 64px */
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
        sm: '0 2px 4px rgba(0, 0, 0, 0.08)',
        md: '0 8px 24px rgba(0, 0, 0, 0.08)',
        lg: '0 16px 48px rgba(0, 0, 0, 0.1)',
        xl: '0 24px 64px rgba(0, 0, 0, 0.12)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '180ms',
        slow: '250ms',
        'very-slow': '350ms',
      },
      transitionTimingFunction: {
        'ease': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}


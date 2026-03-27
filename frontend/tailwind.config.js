/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        slate: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 4px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10)',
        'modal': '0 24px 60px rgba(0,0,0,0.18)',
      }
    },
  },
  plugins: [],
}
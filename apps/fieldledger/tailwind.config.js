/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ] },
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        carbon: {
          950: '#070a0f',
          900: '#0b0f17',
          850: '#111722',
          800: '#182130',
          700: '#253247',
          600: '#374761',
        },
        safety: {
          orange: '#f97316',
          flame: '#ea580c',
          amber: '#f59e0b',
          hazard: '#eab308',
          verified: '#10b981',
          danger: '#ef4444',
          cyan: '#06b6d4',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        dark: {
          800: '#182130',
          850: '#111722',
          900: '#0b0f17',
          950: '#070a0f',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-orange': '0 0 25px -5px rgba(249, 115, 22, 0.3)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glow-danger': '0 0 25px -5px rgba(239, 68, 68, 0.3)',
        'tactile': '0 2px 0 0 rgba(255, 255, 255, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}

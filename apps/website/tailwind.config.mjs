/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
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
        accent: {
          fire: '#f97316',
          hood: '#f59e0b',
          grease: '#06b6d4',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

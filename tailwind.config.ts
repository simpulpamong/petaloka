import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Segoe UI',
          'Roboto',
          'system-ui',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7fe',
          200: '#c0d4fd',
          300: '#94b8fb',
          400: '#6193f6',
          500: '#3d6ff1',
          600: '#2750e5',
          700: '#203dc9',
          800: '#2034a2',
          900: '#20307f',
          950: '#1a204e',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.06), 0 8px 24px -12px rgb(15 23 42 / 0.18)',
        pop: '0 12px 40px -8px rgb(15 23 42 / 0.28)',
      },
    },
  },
  plugins: [],
};

export default config;

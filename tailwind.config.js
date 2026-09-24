/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f4',
          100: '#dcf2e3',
          200: '#bbe4ca',
          300: '#8bcfa4',
          400: '#54b178',
          500: '#319757',
          600: '#237a47',
          700: '#1d613a',
          800: '#1a4d31',
          900: '#163f2a',
          950: '#0a2415',
        },
      },
    },
  },
  plugins: [],
};

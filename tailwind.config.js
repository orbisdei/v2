/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f0f8',
          100: '#d9d9ec',
          200: '#b3b3d9',
          300: '#8c8cc6',
          400: '#6666b3',
          500: '#40409f',
          600: '#2d2d7f',
          700: '#1e1e5f',
          800: '#181852',
          900: '#111140',
          950: '#0a0a2e',
        },
        gold: {
          50: '#fefcf0',
          100: '#fdf6d1',
          200: '#fbeea3',
          300: '#f8e06b',
          400: '#f4ce3a',
          500: '#e8b810',
          600: '#c9950c',
          700: '#a0700d',
          800: '#845a12',
          900: '#714a14',
        },
      },
      fontFamily: {
        mont: ['Mont', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

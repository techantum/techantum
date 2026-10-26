/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        secondary: { DEFAULT: '#4F46E5', foreground: '#FFFFFF' },
      },
      fontFamily: {
        bricolage: ['var(--font-bricolage)', 'sans-serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

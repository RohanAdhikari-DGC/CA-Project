/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        practice: 'var(--practice)',
        info: 'var(--info)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      }
    },
  },
  plugins: [],
}
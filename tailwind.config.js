/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4A90E2', // Simple blue
        secondary: '#7B8A8B', // Simple gray
        accent: '#50C878', // Simple green
        background: '#F5F7FA', // Light gray background
      },
    },
  },
  plugins: [],
}


/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#06b6d4',
        'subtle-bg': '#f8f7f4',
        'subtle-active-bg': '#e7e5e4',
        // Palette ChatGPT dark mode
        'sidebar-bg': '#202123',
        'sidebar-border': '#3f4042',
        'chat-bg': '#343541',
        'card-bg': '#444654',
        'text-main': '#d1d5db',
        'text-dimmed': '#9ca3af',
        'accent-light': '#10a37f',
      },
    },
  },
  plugins: [],
} 
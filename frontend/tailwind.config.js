/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary:       { DEFAULT: '#1F2133', light: '#2D5F8A', dark: '#142740' },
        secondary:     { DEFAULT: '#D4A843', light: '#E0BE6A', dark: '#B8912F' },
        success:       { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
        warning:       { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
        danger:        { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
        info:          { DEFAULT: '#3B82F6', light: '#DBEAFE', dark: '#1E40AF' },
        neutral:       { DEFAULT: '#6B7280', light: '#F3F4F6', dark: '#374151' },
        surface:       '#FFFFFF',
        background:    '#F8FAFC',
        'anon-dark':   '#1A1A2E',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      width:      { sidebar: '280px', 'sidebar-collapsed': '64px' },
      borderRadius: { card: '8px', input: '6px' },
    },
  },
  plugins: [],
};

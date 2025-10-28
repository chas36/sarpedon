/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        learning: {
          bg: '#0f172a',
          surface: '#1e293b',
          accent: '#3b82f6',
          success: '#10b981',
          text: '#f1f5f9',
          muted: '#64748b'
        },
        admin: {
          bg: '#18181b',
          surface: '#27272a',
          accent: '#8b5cf6',
          warning: '#f59e0b',
          danger: '#ef4444',
          text: '#fafafa',
          muted: '#71717a'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}

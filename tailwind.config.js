/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hrta: {
          bg: '#070A10',
          card: '#0D131F',
          cardBorder: '#1F2B3E',
          cardHover: '#141D2E',
          accent: '#00F0FF',
          accentGlow: 'rgba(0, 240, 255, 0.15)',
          blue: '#0066FF',
          red: '#EF4444',
          redGlow: 'rgba(239, 68, 68, 0.2)',
          emerald: '#10B981',
          emeraldGlow: 'rgba(16, 185, 129, 0.2)',
          text: '#F8FAFC',
          muted: '#94A3B8',
          border: '#1E293B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 240, 255, 0.35)',
        'glow-red': '0 0 25px -3px rgba(239, 68, 68, 0.4)',
        'glow-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
        'tactile': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-10px)' },
          '40%, 80%': { transform: 'translateX(10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        shake: 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vega: {
          black: '#000000',
          surface1: '#18181c',
          surface2: '#1e1e24',
          surface3: '#28272f',
          navPill: '#383740',
          ctaPrimary: '#ede7eb',
          ctaText: '#1c1b1f',
          pillBg: '#202024',
          textPrimary: '#ffffff',
          textSecondary: '#8e8e93',
          error: '#8e0e1b',
          errorBright: '#e53935',
          success: '#4caf50',
          border: 'rgba(255,255,255,0.05)',
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      aspectRatio: {
        'poster': '2 / 3',
        'hero': '16 / 9',
      },
      boxShadow: {
        'tv-focus': '0 0 0 3px rgba(255, 255, 255, 0.4), 0 10px 30px rgba(0, 0, 0, 0.8)',
        'card': '0 8px 24px rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
}

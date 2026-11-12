/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // UI chrome
        abyss: '#1A262E',
        charcoal: '#24333C',
        rim: '#486273',
        // Ocean depth
        ocean: '#365569',
        shallows: '#5E93A3',
        // Land
        sand: '#F2E7CD',
        timber: '#8A7968',
        // Factions
        terra: {
          DEFAULT: '#C84630',
          dark: '#A33623',
        },
        cobalt: {
          DEFAULT: '#2B6CB0',
          light: '#4E85C6',
        },
        // Treasury
        brass: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        // Text
        parchment: '#F8FAFC',
        foam: '#CBD5E1',
        // Status
        ok: '#34D399',
        warn: '#FBBF24',
        danger: '#E05252',
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 2px 12px -2px rgba(10, 18, 24, 0.55)',
        inset: 'inset 0 1px 0 rgba(248, 250, 252, 0.1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sway: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        sway: 'sway 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

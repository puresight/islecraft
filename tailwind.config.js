/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // UI chrome
        abyss: '#0B1114',
        charcoal: '#111A1F',
        rim: '#3D545F',
        // Ocean depth
        ocean: '#16262E',
        shallows: '#28444B',
        // Land
        sand: '#D8C596',
        timber: '#4D6B53',
        // Factions
        terra: {
          DEFAULT: '#B85D3D',
          dark: '#9A4C32',
        },
        cobalt: {
          DEFAULT: '#3A6B88',
          light: '#4E85A6',
        },
        // Treasury
        brass: {
          DEFAULT: '#D4A346',
          dark: '#B08634',
        },
        // Text
        parchment: '#E8E2CE',
        foam: '#9FB4AC',
        // Status
        ok: '#6FA287',
        warn: '#C98F3D',
        danger: '#B85D3D',
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 2px 12px -2px rgba(5, 10, 13, 0.6)',
        inset: 'inset 0 1px 0 rgba(232, 226, 206, 0.08)',
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

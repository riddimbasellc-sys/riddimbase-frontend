/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'rb-bg': '#020617',
        'rb-surface': '#051423',
        'rb-surface-alt': '#071b2e',
        'rb-accent': '#10B981',
        'rb-accent-soft': '#22C55E',
        'rb-orange': '#F97316',
        // Caribbean palette additions
        'rb-trop-blue': '#00b4d8',
        'rb-trop-blue-deep': '#0077b6',
        'rb-trop-cyan': '#14e2ff',
        'rb-sun-yellow': '#ffc300',
        'rb-sun-gold': '#ffb000',
        'rb-fiery-red': '#ff4d4f',
        'rb-rum-red': '#d7263d',
        'rb-coral': '#ff6f61',
        'rb-palm-green': '#0ba360',
        'rb-palm-dark': '#06623b',
        'rb-glow': '#faff00',
      },
      boxShadow: {
        'rb-soft': '0 18px 45px rgba(15,23,42,0.8)',
        'rb-gloss-btn': '0 6px 18px -4px rgba(0,180,216,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        'rb-gloss-panel': '0 12px 32px -8px rgba(0,119,182,0.35), 0 4px 12px rgba(0,0,0,0.5)',
      },
      dropShadow: {
        'rb-glow': '0 0 8px rgba(255,195,0,0.45)',
      },
      backgroundImage: theme => ({
        'rb-caribbean': 'linear-gradient(135deg, #02111d 0%, #051f33 40%, #092f4a 70%, #0b3d5e 100%)',
        'rb-gloss-stripes': 'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 6px, rgba(255,255,255,0.02) 6px 12px)',
        'rb-trop-sunrise': 'linear-gradient(90deg, #0077b6 0%, #00b4d8 35%, #ffc300 70%, #ff4d4f 100%)',
        'rb-trop-radial': 'radial-gradient(circle at 30% 30%, rgba(0,180,216,0.35), transparent 60%)',
      }),
      borderRadius: {
        'xl2': '1.25rem',
      },
      transitionTimingFunction: {
        'snappy': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

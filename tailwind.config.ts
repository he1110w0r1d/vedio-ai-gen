import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: '#131315',
        'surface-dim': '#131315',
        'surface-bright': '#39393b',
        'surface-container-lowest': '#0e0e10',
        'surface-container-low': '#1c1b1d',
        'surface-container': '#201f21',
        'surface-container-high': '#2a2a2c',
        'surface-container-highest': '#353437',
        'on-surface': '#e5e1e4',
        'on-surface-variant': '#b9cacb',
        outline: '#849495',
        'outline-variant': '#3a494b',
        'surface-tint': '#00dbe7',
        primary: '#e1fdff',
        'primary-container': '#00f2ff',
        'on-primary-container': '#006a71',
        'primary-fixed': '#74f5ff',
        'primary-fixed-dim': '#00dbe7',
        'on-primary-fixed': '#002022',
        secondary: '#d0bcff',
        'secondary-container': '#571bc1',
        error: '#ffb4ab',
        'error-container': '#93000a',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        neon: '0 0 24px rgba(0, 219, 231, 0.18)',
      },
      maxWidth: {
        studio: '1440px',
      },
    },
  },
  plugins: [],
} satisfies Config;

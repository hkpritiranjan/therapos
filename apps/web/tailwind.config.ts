import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-sidebar': 'var(--bg-sidebar)',

        // Accents
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },

        // Text
        text: {
          primary: 'var(--text-primary)',
          mid: 'var(--text-mid)',
          muted: 'var(--text-muted)',
        },

        // Status colors
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',

        // Border
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        glow: '0 0 0 1px var(--accent)',
        card: '0 1px 3px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [forms],
};

export default config;

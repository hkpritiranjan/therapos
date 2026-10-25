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
        success: '#1F7A5A',
        warning: '#8A5A00',
        danger: '#B8324D',
        info: '#3B55C9',

        // Border
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'Poppins', 'system-ui', 'sans-serif'],
        serif: ['var(--font-alegreya)', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
      boxShadow: {
        glow: '0 0 0 1px var(--accent)',
        card: '0 6px 22px rgba(91,75,224,0.08)',
      },
    },
  },
  plugins: [forms],
};

export default config;

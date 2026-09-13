/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#34d399',
          500: '#10b981', // Juniper emerald
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        paper: {
          50: '#FBFBF9',  // Warm architectural canvas
          100: '#F5F4EF',
          200: '#EAE7DE',
          300: '#DEDACF',
          card: '#FFFFFF',
          border: '#E8E5DD',
          ink: '#191817',
          muted: '#6E6A63',
        },
        obsidian: {
          950: '#0C0D0E', // True warm obsidian canvas
          900: '#131518', // Card surface
          850: '#191B1F',
          800: '#23272D', // Border
          700: '#313740',
          ink: '#F0EFEA',
          muted: '#8F939A',
        },
        terracotta: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#0C0D0E',
        },
        surface: {
          light: '#FBFBF9',
          card: '#FFFFFF',
          darkBg: '#0C0D0E',
          darkCard: '#131518',
          darkBorder: '#23272D',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['Space Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'soft': '0 2px 14px -2px rgba(25, 24, 23, 0.05)',
        'paper': '0 1px 3px 0 rgba(25, 24, 23, 0.04), 0 6px 24px -2px rgba(25, 24, 23, 0.07)',
        'paper-hover': '0 12px 36px -4px rgba(25, 24, 23, 0.12), 0 2px 8px 0 rgba(25, 24, 23, 0.04)',
        'hover-lift': '0 12px 32px -4px rgba(25, 24, 23, 0.12)',
        'dark-soft': '0 4px 24px -2px rgba(0, 0, 0, 0.6)',
        'obsidian-card': '0 4px 24px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow-emerald': '0 0 25px -3px rgba(16, 185, 129, 0.35)',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.625rem',
      }
    },
  },
  plugins: [],
}

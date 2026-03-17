import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-light': 'var(--border-light)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        golden: 'var(--golden)',
        'golden-dark': 'var(--golden-dark)',
        olive: 'var(--olive)',
        espresso: 'var(--espresso)',
        cream: 'var(--cream)',
        parchment: 'var(--parchment)',
        success: 'var(--success)',
      },
      boxShadow: {
        menu: '0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(180,130,60,0.2) inset, 0 2px 6px rgba(60,36,21,0.08), 0 8px 24px rgba(60,36,21,0.06)',
        btn: '0 3px 8px rgba(60,36,21,0.25), 0 1px 2px rgba(60,36,21,0.15)',
      },
    },
  },
  plugins: [],
}
export default config

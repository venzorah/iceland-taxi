import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: 'var(--navy)',
        'navy-2': 'var(--navy-2)',
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        card: 'var(--card)',
        heading: 'var(--heading)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'on-primary': 'var(--on-primary)',
        mint: 'var(--mint)',
        'mint-text': 'var(--mint-text)',
        cyan: 'var(--cyan)',
        link: 'var(--link)',
        line: 'var(--border)',
        input: 'var(--input)',
        'input-line': 'var(--input-border)',
        focus: 'var(--focus)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      fontFamily: {
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

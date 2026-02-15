import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'electric-green': '#00FF41',
        'deep-navy': '#0F172A',
        'navy-800': '#1E293B',
        'navy-700': '#334155',
      },
    },
  },
  plugins: [],
}
export default config

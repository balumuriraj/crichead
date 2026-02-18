import type { Config } from 'tailwindcss'
import { Colors } from '@crichead/core'

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
        'electric-green': Colors.electricGreen,
        'deep-navy': Colors.deepNavy,
        'navy-800': Colors.gray800,
        'navy-700': Colors.gray700,
      },
    },
  },
  plugins: [],
}
export default config

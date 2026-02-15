import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Crichead - Cricket Scoring Ecosystem',
  description: 'Professional cricket scoring and management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

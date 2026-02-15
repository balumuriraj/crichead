import type { Metadata } from 'next'
import './globals.css'
import FirebaseProvider from './FirebaseProvider'

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
      <body>
        <FirebaseProvider>{children}</FirebaseProvider>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nanda Kumar',
  description: 'Notes from an AI engineer.',
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

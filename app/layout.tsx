import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { FeedbackProvider } from '@/components/feedback'
import './globals.css'

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Cattlemart One',
  description: 'Farm ledger and plot operations',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen antialiased">
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  )
}

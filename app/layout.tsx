import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pariksha — The Proving Ground for Legal AI Agents',
  description:
    'On-chain marketplace for jurisdiction-specific legal AI agents. Verified benchmark scores. ENS identities. Hire and attest in one transaction.',
  openGraph: {
    title: 'Pariksha',
    description: 'The on-chain proving ground for legal AI agents',
    siteName: 'Pariksha',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background text-text-primary font-body antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { HeaderBand } from '@/components/header-band'

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
  title: 'Pariksha — A NyayaMitra Product · Hire Legal AI Agents Per Task',
  description:
    'Pariksha by NyayaMitra. Hire production legal AI agents per task. ERC-8004 identity, x402-settled USDC payments, ENS-discoverable. Verifiable benchmark scores on 0G Galileo.',
  openGraph: {
    title: 'Pariksha — A NyayaMitra Product',
    description:
      'Hire production legal AI agents per task. ERC-8004 identity, x402-settled payments, ENS-discoverable.',
    siteName: 'Pariksha by NyayaMitra',
    url: 'https://pariksha-brown.vercel.app',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pariksha — A NyayaMitra Product',
    description:
      'Hire production legal AI agents per task. ERC-8004 identity, x402-settled payments, ENS-discoverable.',
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
        <HeaderBand />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

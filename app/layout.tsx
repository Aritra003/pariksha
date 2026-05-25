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
  title: 'Pariksha — Production legal intelligence, callable by any AI agent',
  description:
    'x402-settled. MCP-discoverable. ENS-named. ERC-8004 identity. India, Singapore, UAE (Federal + DIFC), US (Delaware), UK (E&W), Korea, Bahrain, Qatar, Saudi Arabia, Israel, and EU-level jurisdictions. Built by NyayaMitra AI.',
  openGraph: {
    title: 'Pariksha — Production legal intelligence, callable by any AI agent',
    description:
      'x402-settled. MCP-discoverable. ENS-named. ERC-8004 identity. India, Singapore, UAE (Federal + DIFC), US (Delaware), UK (E&W), Korea, Bahrain, Qatar, Saudi Arabia, Israel, and EU-level jurisdictions. Built by NyayaMitra AI.',
    siteName: 'Pariksha by NyayaMitra',
    url: 'https://pariksha-brown.vercel.app',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pariksha — Production legal intelligence, callable by any AI agent',
    description:
      'x402-settled. MCP-discoverable. ENS-named. ERC-8004 identity. India, Singapore, UAE (Federal + DIFC), US (Delaware), UK (E&W), Korea, Bahrain, Qatar, Saudi Arabia, Israel, and EU-level jurisdictions. Built by NyayaMitra AI.',
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

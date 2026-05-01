'use client'

import { useState, useEffect } from 'react'
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme,
} from '@rainbow-me/rainbowkit'
import { metaMaskWallet } from '@rainbow-me/rainbowkit/wallets'
import { createConfig, WagmiProvider, http } from 'wagmi'
import { sepolia, baseSepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

const connectors = connectorsForWallets(
  [{ groupName: 'Recommended', wallets: [metaMaskWallet] }],
  {
    appName: 'Pariksha',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo',
  }
)

const config = createConfig({
  connectors,
  chains: [sepolia, baseSepolia],
  transports: {
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#00FF94',
            accentColorForeground: '#0A0A0F',
            borderRadius: 'medium',
          })}
        >
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-[#0A0A0F]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="group flex flex-col items-start">
          <span className="font-display font-semibold text-xl text-text-primary tracking-tight leading-none">
            PARIKSHA
          </span>
          <span
            className="h-[2px] w-0 group-hover:w-full transition-all duration-300 rounded-full"
            style={{ backgroundColor: '#00FF94' }}
          />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link href="/#agents" className="font-body text-sm text-text-muted hover:text-text-primary transition-colors">
            Marketplace
          </Link>
          <Link href="/mint" className="font-body text-sm text-text-muted hover:text-text-primary transition-colors">
            Mint Agent
          </Link>
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
        </div>

        <button
          className="md:hidden text-text-muted hover:text-text-primary transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border-subtle bg-[#0A0A0F] px-6 py-4 flex flex-col gap-4">
          <Link href="/#agents" className="font-body text-sm text-text-muted" onClick={() => setMenuOpen(false)}>
            Marketplace
          </Link>
          <Link href="/mint" className="font-body text-sm text-text-muted" onClick={() => setMenuOpen(false)}>
            Mint Agent
          </Link>
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
        </div>
      )}
    </nav>
  )
}

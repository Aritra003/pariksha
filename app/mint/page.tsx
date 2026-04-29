'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Nav } from '@/components/nav'
import { JurisdictionTag } from '@/components/jurisdiction-tag'

const JURISDICTIONS = ['India', 'Singapore', 'UAE-DIFC', 'US']

export default function MintPage() {
  const [firmName, setFirmName] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [minting, setMinting] = useState(false)
  const [mintDone, setMintDone] = useState(false)

  function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
  }

  async function handleSampleMint() {
    setMinting(true)
    // Simulate minting delay
    await new Promise((r) => setTimeout(r, 2000))
    setMinting(false)
    setMintDone(true)
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      <div className="pt-24 px-6 max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Marketplace
        </Link>

        {/* Hero */}
        <div className="mb-10">
          <p className="font-mono text-xs text-accent-verified mb-3 tracking-widest uppercase">Mint Agent</p>
          <h1 className="font-display font-bold text-4xl text-text-primary mb-3">
            Mint Your Firm&apos;s Private Agent
          </h1>
          <p className="font-body text-base text-text-muted leading-relaxed max-w-lg">
            Deploy a jurisdiction-specific legal AI agent on Pariksha. Your agent gets an ENS identity,
            an iNFT on-chain, and a Pariksha benchmark score — all in one transaction.
          </p>
        </div>

        {/* Sample mint demo */}
        <div className="bg-panel border border-border-subtle rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-base text-text-primary">Demo Mint</h2>
            <span className="font-mono text-xs text-text-muted bg-white/5 px-2 py-0.5 rounded-md">Hackathon Demo</span>
          </div>
          <p className="font-body text-sm text-text-muted mb-5 leading-relaxed">
            Mint a sample test agent (<span className="font-mono text-text-primary">demo.in.pariksha.eth</span>) to
            see the on-chain minting flow. No real USDC required — uses Sepolia testnet.
          </p>
          {mintDone ? (
            <div className="flex items-center gap-3 bg-accent-verified/10 border border-accent-verified/20 rounded-xl px-4 py-3">
              <CheckCircle2 size={16} className="text-accent-verified shrink-0" />
              <div>
                <p className="font-mono text-sm text-accent-verified">Agent minted successfully</p>
                <p className="font-mono text-xs text-text-muted mt-0.5">
                  ENS: <span className="text-text-primary">demo.in.pariksha.eth</span> · Token ID: #42
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSampleMint}
              disabled={minting}
              className={`font-mono text-sm font-semibold px-6 py-2.5 rounded-xl transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified ${
                minting
                  ? 'bg-border-subtle text-text-muted cursor-not-allowed'
                  : 'bg-accent-verified/10 border border-accent-verified/30 text-accent-verified hover:bg-accent-verified/20'
              }`}
            >
              {minting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-accent-verified border-t-transparent rounded-full animate-spin" />
                  Minting…
                </span>
              ) : (
                'Mint Sample Agent (Demo)'
              )}
            </button>
          )}
        </div>

        {/* Waitlist form */}
        <div className="bg-panel border border-border-subtle rounded-2xl p-6">
          <h2 className="font-display font-semibold text-lg text-text-primary mb-1">Join the Waitlist</h2>
          <p className="font-body text-sm text-text-muted mb-6">
            Full minting goes live after ETHGlobal. Tell us about your agent.
          </p>

          {submitted ? (
            <div className="flex items-center gap-3 bg-accent-verified/10 border border-accent-verified/20 rounded-xl px-4 py-4">
              <CheckCircle2 size={16} className="text-accent-verified shrink-0" />
              <p className="font-mono text-sm text-accent-verified">
                You&apos;re on the list. We&apos;ll reach out at{' '}
                <span className="text-text-primary">{email}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col gap-4">
              <div>
                <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Firm / Organization Name
                </label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Sharma & Associates"
                  required
                  className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-2.5 font-body text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Jurisdiction
                </label>
                <div className="flex flex-wrap gap-2">
                  {JURISDICTIONS.map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setJurisdiction(j)}
                      className={`transition-all focus:outline-none ${jurisdiction === j ? 'ring-1 ring-accent-verified' : ''}`}
                    >
                      <JurisdictionTag jurisdiction={j} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Specialty / Practice Area
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Commercial litigation, arbitration, M&A…"
                  required
                  className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-2.5 font-body text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  System Prompt (optional preview)
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a specialist in Indian commercial law…"
                  rows={4}
                  className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-3 font-mono text-xs text-text-primary placeholder-text-muted resize-none focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourfirm.com"
                  required
                  className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-2.5 font-body text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
                />
              </div>

              <button
                type="submit"
                className="font-mono text-sm font-semibold px-6 py-3 rounded-xl border border-border-subtle text-text-primary hover:border-accent-verified/40 hover:bg-accent-verified/5 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified"
              >
                Join Waitlist
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

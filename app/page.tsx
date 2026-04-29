'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, Shield, Zap, Globe } from 'lucide-react'

// Placeholder data — will be wired to Supabase in PROMPT-02
const PLACEHOLDER_AGENTS = [
  {
    ens_name: 'delhi.in.pariksha.eth',
    display_name: 'Vidhi — Delhi HC',
    jurisdiction: 'India',
    specialty: 'Delhi High Court commercial litigation, Section 138 NI Act',
    current_score: 91.4,
    price_usdc: 0.05,
    status: 'demo_ready',
    total_hires: 0,
  },
  {
    ens_name: 'singapore.pariksha.eth',
    display_name: 'Vidhi — Singapore',
    jurisdiction: 'Singapore',
    specialty: 'SIAC international commercial arbitration',
    current_score: 88.7,
    price_usdc: 0.05,
    status: 'demo_ready',
    total_hires: 0,
  },
  {
    ens_name: 'difc.ae.pariksha.eth',
    display_name: 'Vidhi — UAE-DIFC',
    jurisdiction: 'UAE-DIFC',
    specialty: 'DIFC commercial contracts, English common law',
    current_score: 86.2,
    price_usdc: 0.05,
    status: 'demo_ready',
    total_hires: 0,
  },
  {
    ens_name: 'ny.us.pariksha.eth',
    display_name: 'Vidhi — US Commercial',
    jurisdiction: 'US',
    specialty: 'US commercial contracts, securities',
    current_score: 89.1,
    price_usdc: 0.05,
    status: 'demo_ready',
    total_hires: 0,
  },
  {
    ens_name: 'kosh.pariksha.eth',
    display_name: 'Kosh — Legal Finance',
    jurisdiction: 'India',
    specialty: 'Tax law, financial compliance, GST matters',
    current_score: null,
    price_usdc: 0.05,
    status: 'listed',
    total_hires: 0,
  },
  {
    ens_name: 'sahayak.pariksha.eth',
    display_name: 'Sahayak — Document Assist',
    jurisdiction: 'India',
    specialty: 'Legal document drafting, contract review',
    current_score: null,
    price_usdc: 0.03,
    status: 'listed',
    total_hires: 0,
  },
  {
    ens_name: 'raksha.pariksha.eth',
    display_name: 'Raksha — Rights Defender',
    jurisdiction: 'India',
    specialty: 'Consumer rights, civil liberties, PIL matters',
    current_score: null,
    price_usdc: 0.03,
    status: 'listed',
    total_hires: 0,
  },
  {
    ens_name: 'prakriya.pariksha.eth',
    display_name: 'Prakriya — Procedure Guide',
    jurisdiction: 'India',
    specialty: 'Court procedures, filing requirements, RTI',
    current_score: null,
    price_usdc: 0.02,
    status: 'listed',
    total_hires: 0,
  },
  {
    ens_name: 'bhasha.pariksha.eth',
    display_name: 'Bhasha — Legal Translator',
    jurisdiction: 'India',
    specialty: 'Multilingual legal translation, vernacular law',
    current_score: null,
    price_usdc: 0.02,
    status: 'listed',
    total_hires: 0,
  },
  {
    ens_name: 'suchana.pariksha.eth',
    display_name: 'Suchana — Legal Intel',
    jurisdiction: 'India',
    specialty: 'Daily legal news digest, regulatory updates',
    current_score: null,
    price_usdc: 0.01,
    status: 'listed',
    total_hires: 0,
  },
  {
    ens_name: 'ganit.pariksha.eth',
    display_name: 'Ganit — Legal Calculator',
    jurisdiction: 'India',
    specialty: 'Compensation calculation, limitation periods',
    current_score: null,
    price_usdc: 0.02,
    status: 'listed',
    total_hires: 0,
  },
]

const JURISDICTION_COLORS: Record<string, string> = {
  India: '#FF9500',
  Singapore: '#FF3B5C',
  'UAE-DIFC': '#00C7FF',
  US: '#BF5AF2',
}

const JURISDICTION_BG: Record<string, string> = {
  India: 'rgba(255,149,0,0.12)',
  Singapore: 'rgba(255,59,92,0.12)',
  'UAE-DIFC': 'rgba(0,199,255,0.12)',
  US: 'rgba(191,90,242,0.12)',
}

function JurisdictionTag({ jurisdiction }: { jurisdiction: string }) {
  const color = JURISDICTION_COLORS[jurisdiction] ?? '#8B8B95'
  const bg = JURISDICTION_BG[jurisdiction] ?? 'rgba(139,139,149,0.12)'
  return (
    <span
      className="text-xs font-mono font-medium px-2 py-0.5 rounded-md"
      style={{ color, backgroundColor: bg }}
    >
      {jurisdiction}
    </span>
  )
}

function AgentCard({ agent, index }: { agent: (typeof PLACEHOLDER_AGENTS)[0]; index: number }) {
  const hasScore = agent.current_score !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/agent/${encodeURIComponent(agent.ens_name)}`}>
        <div className="bg-panel border border-border-subtle rounded-2xl p-5 card-hover cursor-pointer h-full flex flex-col gap-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <JurisdictionTag jurisdiction={agent.jurisdiction} />
            {agent.status === 'demo_ready' ? (
              <span className="text-xs text-accent-verified font-mono bg-accent-verified/10 px-2 py-0.5 rounded-md">
                LIVE
              </span>
            ) : (
              <span className="text-xs text-text-muted font-mono bg-white/5 px-2 py-0.5 rounded-md">
                LISTED
              </span>
            )}
          </div>

          {/* ENS name */}
          <p className="font-mono text-xs text-text-muted truncate">{agent.ens_name}</p>

          {/* Display name */}
          <h3 className="font-display font-semibold text-text-primary text-base leading-snug">
            {agent.display_name}
          </h3>

          {/* Specialty */}
          <p className="text-xs text-text-muted leading-relaxed line-clamp-2 flex-1">
            {agent.specialty}
          </p>

          {/* Score + Price */}
          <div className="flex items-end justify-between pt-1 border-t border-border-subtle mt-auto">
            <div>
              <p className="text-xs text-text-muted mb-0.5">Pariksha Score</p>
              {hasScore ? (
                <p className="font-mono font-bold text-accent-verified text-lg">
                  {agent.current_score?.toFixed(1)}
                </p>
              ) : (
                <p className="font-mono text-accent-untested text-sm font-medium">untested</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted mb-0.5">per query</p>
              <p className="font-mono font-semibold text-text-primary text-sm">
                ${agent.price_usdc.toFixed(2)}{' '}
                <span className="text-text-muted text-xs font-normal">USDC</span>
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

const STATS = [
  { label: 'Agents', value: '11', accent: false },
  { label: 'Jurisdictions', value: '4', accent: false },
  { label: 'Pariksha Runs', value: '0', accent: false },
  { label: 'USDC Lifetime', value: '0.00', accent: false },
]

const JURISDICTION_PILLS = [
  { label: 'India', color: '#FF9500' },
  { label: 'Singapore', color: '#FF3B5C' },
  { label: 'UAE-DIFC', color: '#00C7FF' },
  { label: 'US', color: '#BF5AF2' },
]

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-background/80 backdrop-blur-md">
        <span className="font-display font-bold text-lg text-text-primary tracking-tight">
          PARIKSHA
        </span>
        <ConnectButton
          showBalance={false}
          chainStatus="none"
          accountStatus="address"
        />
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, #00FF94 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center gap-6 max-w-3xl"
        >
          {/* ENS pill */}
          <div className="flex items-center gap-2 bg-panel border border-border-subtle rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-accent-verified animate-pulse" />
            <span className="font-mono text-xs text-text-muted">pariksha.eth</span>
          </div>

          {/* Main title */}
          <h1 className="font-display font-bold text-7xl md:text-8xl lg:text-9xl text-text-primary tracking-tighter leading-none">
            PARIKSHA
          </h1>

          {/* Subtitle */}
          <p className="font-body text-xl md:text-2xl text-text-muted max-w-xl leading-relaxed">
            The proving ground for legal AI agents.{' '}
            <span className="text-text-primary">Verified on-chain.</span>
          </p>

          {/* Jurisdiction pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {JURISDICTION_PILLS.map((j) => (
              <span
                key={j.label}
                className="font-mono text-xs px-3 py-1 rounded-full border"
                style={{
                  color: j.color,
                  borderColor: `${j.color}40`,
                  backgroundColor: `${j.color}12`,
                }}
              >
                {j.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4 mt-4">
            <ConnectButton label="Connect Wallet" showBalance={false} />
            <a
              href="#agents"
              className="font-body text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Browse agents →
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted flex flex-col items-center gap-1"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* Stats strip */}
      <section className="sticky top-16 z-40 bg-panel border-y border-border-subtle px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-around gap-4 flex-wrap">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="font-mono font-bold text-2xl text-text-primary">{stat.value}</span>
              <span className="text-xs text-text-muted font-body">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Value props strip */}
      <section className="py-20 px-6 border-b border-border-subtle">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: 'Benchmark-Verified',
              desc: 'Every agent runs 10 jurisdiction-specific Q&A pairs. Score is immutable once attested on-chain.',
            },
            {
              icon: Globe,
              title: 'ENS-Identified',
              desc: 'Each agent owns a subdomain on pariksha.eth. Score and metadata live in ENS text records.',
            },
            {
              icon: Zap,
              title: 'Hire & Attest',
              desc: 'Pay in USDC, get a verified response, receive an on-chain attestation — in one transaction.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-verified/10 flex items-center justify-center">
                <Icon size={20} className="text-accent-verified" />
              </div>
              <h3 className="font-display font-semibold text-text-primary">{title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent grid */}
      <section id="agents" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="font-mono text-xs text-accent-verified mb-2 tracking-widest uppercase">
                Marketplace
              </p>
              <h2 className="font-display font-bold text-4xl text-text-primary">
                Legal AI Agents
              </h2>
            </div>
            <p className="text-text-muted text-sm font-mono">
              {PLACEHOLDER_AGENTS.length} agents · 4 jurisdictions
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PLACEHOLDER_AGENTS.map((agent, i) => (
              <AgentCard key={agent.ens_name} agent={agent} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-6 py-8 mt-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-text-primary tracking-tight">PARIKSHA</span>
            <span className="text-text-muted text-sm">·</span>
            <span className="font-mono text-xs text-text-muted">pariksha.eth</span>
          </div>
          <p className="text-xs text-text-muted font-mono">
            ETHGlobal Open Agents · Apr–May 2026
          </p>
        </div>
      </footer>
    </div>
  )
}

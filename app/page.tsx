'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, Shield, Zap, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Agent {
  ens_name: string
  display_name: string
  jurisdiction: string
  specialty: string
  current_score: number | null
  price_usdc: number
  status: string
  total_hires: number
}

interface Stats {
  agentCount: number
  totalParikshaRuns: number
  totalLifetimeUsdc: number
}

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

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const hasScore = agent.current_score !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Link href={`/agent/${encodeURIComponent(agent.ens_name)}`}>
        <div className="bg-panel border border-border-subtle rounded-2xl p-5 card-hover cursor-pointer h-full flex flex-col gap-3">
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

          <p className="font-mono text-xs text-text-muted truncate">{agent.ens_name}</p>

          <h3 className="font-display font-semibold text-text-primary text-base leading-snug">
            {agent.display_name}
          </h3>

          <p className="text-xs text-text-muted leading-relaxed line-clamp-2 flex-1">
            {agent.specialty}
          </p>

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

const JURISDICTION_FILTERS = ['All', 'India', 'Singapore', 'UAE-DIFC', 'US']

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<Stats>({ agentCount: 0, totalParikshaRuns: 0, totalLifetimeUsdc: 0 })
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents ?? [])
        setStats(data.stats ?? { agentCount: 0, totalParikshaRuns: 0, totalLifetimeUsdc: 0 })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const visibleAgents =
    filter === 'All' ? agents : agents.filter((a) => a.jurisdiction === filter)

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-background/80 backdrop-blur-md">
        <span className="font-display font-bold text-lg text-text-primary tracking-tight">
          PARIKSHA
        </span>
        <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 relative overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, #00FF94 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center gap-6 max-w-3xl"
        >
          <div className="flex items-center gap-2 bg-panel border border-border-subtle rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-accent-verified animate-pulse" />
            <span className="font-mono text-xs text-text-muted">pariksha.eth</span>
          </div>

          <h1 className="font-display font-bold text-7xl md:text-8xl lg:text-9xl text-text-primary tracking-tighter leading-none">
            PARIKSHA
          </h1>

          <p className="font-body text-xl md:text-2xl text-text-muted max-w-xl leading-relaxed">
            The proving ground for legal AI agents.{' '}
            <span className="text-text-primary">Verified on-chain.</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {['India', 'Singapore', 'UAE-DIFC', 'US'].map((j) => (
              <span
                key={j}
                className="font-mono text-xs px-3 py-1 rounded-full border"
                style={{
                  color: JURISDICTION_COLORS[j],
                  borderColor: `${JURISDICTION_COLORS[j]}40`,
                  backgroundColor: `${JURISDICTION_COLORS[j]}12`,
                }}
              >
                {j}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <ConnectButton label="Connect Wallet" showBalance={false} />
            <a href="#agents" className="font-body text-sm text-text-muted hover:text-text-primary transition-colors">
              Browse agents →
            </a>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted flex flex-col items-center gap-1"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* Stats strip — live from DB */}
      <section className="sticky top-16 z-40 bg-panel border-y border-border-subtle px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-around gap-4 flex-wrap">
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono font-bold text-2xl text-text-primary">{stats.agentCount}</span>
            <span className="text-xs text-text-muted font-body">Agents</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono font-bold text-2xl text-text-primary">4</span>
            <span className="text-xs text-text-muted font-body">Jurisdictions</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono font-bold text-2xl text-text-primary">{stats.totalParikshaRuns}</span>
            <span className="text-xs text-text-muted font-body">Pariksha Runs</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-mono font-bold text-2xl text-text-primary">${stats.totalLifetimeUsdc.toFixed(2)}</span>
            <span className="text-xs text-text-muted font-body">USDC Lifetime</span>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="py-20 px-6 border-b border-border-subtle">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: 'Benchmark-Verified',
              desc: 'Every agent runs jurisdiction-specific Q&A pairs. Score is immutable once attested on-chain.',
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
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="font-mono text-xs text-accent-verified mb-2 tracking-widest uppercase">
                Marketplace
              </p>
              <h2 className="font-display font-bold text-4xl text-text-primary">Legal AI Agents</h2>
            </div>
            <p className="text-text-muted text-sm font-mono">
              {visibleAgents.length} agents · {filter === 'All' ? '4' : '1'} jurisdiction{filter === 'All' ? 's' : ''}
            </p>
          </div>

          {/* Jurisdiction filter chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {JURISDICTION_FILTERS.map((j) => {
              const isActive = filter === j
              const color = j === 'All' ? '#8B8B95' : JURISDICTION_COLORS[j]
              return (
                <button
                  key={j}
                  onClick={() => setFilter(j)}
                  className="font-mono text-xs px-4 py-1.5 rounded-full border transition-all"
                  style={{
                    color: isActive ? '#0A0A0F' : color,
                    borderColor: color,
                    backgroundColor: isActive ? color : `${color}18`,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {j}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-panel border border-border-subtle rounded-2xl p-5 h-52 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleAgents.map((agent, i) => (
                <AgentCard key={agent.ens_name} agent={agent} index={i} />
              ))}
            </div>
          )}
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
          <p className="text-xs text-text-muted font-mono">ETHGlobal Open Agents · Apr–May 2026</p>
        </div>
      </footer>
    </div>
  )
}

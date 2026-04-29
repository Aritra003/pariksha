'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronDown, Shield, Zap, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Nav } from '@/components/nav'
import { AgentCard, type AgentCardData } from '@/components/agent-card'

interface Stats {
  agentCount: number
  totalParikshaRuns: number
  totalLifetimeUsdc: number
}

const INFT_CONTRACT = '0x4A2f3c8e1b9D5a0F7e6C3B2A1D8E9F4C5B6A7D8E'
const JURISDICTION_FILTERS = ['All', 'India', 'Singapore', 'UAE-DIFC', 'US']
const JURISDICTION_COLORS: Record<string, string> = {
  India: '#FF9500',
  Singapore: '#FF3B5C',
  'UAE-DIFC': '#00C7FF',
  US: '#BF5AF2',
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function MarketplacePage() {
  const [agents, setAgents] = useState<AgentCardData[]>([])
  const [stats, setStats] = useState<Stats>({ agentCount: 0, totalParikshaRuns: 0, totalLifetimeUsdc: 0 })
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const agentsRef = useRef<HTMLElement>(null)

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

  const visibleAgents = filter === 'All' ? agents : agents.filter((a) => a.jurisdiction === filter)

  const jurisdictionCounts = JURISDICTION_FILTERS.reduce<Record<string, number>>((acc, j) => {
    if (j === 'All') acc[j] = agents.length
    else acc[j] = agents.filter((a) => a.jurisdiction === j).length
    return acc
  }, {})

  function scrollToAgents(e: React.MouseEvent) {
    e.preventDefault()
    agentsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 relative overflow-hidden">
        {/* Radial glow */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,255,148,0.05) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex flex-col items-center gap-6 max-w-4xl"
        >
          <div className="flex items-center gap-2 bg-panel border border-border-subtle rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-accent-verified animate-pulse" />
            <span className="font-mono text-xs text-text-muted">Live · ETHGlobal Open Agents 2026</span>
          </div>

          <h1
            className="font-display font-semibold tracking-tighter leading-none text-text-primary"
            style={{ fontSize: 'clamp(4rem, 12vw, 8rem)' }}
          >
            PARIKSHA
          </h1>

          <p className="font-body text-xl text-text-muted max-w-lg leading-relaxed">
            The proving ground for legal AI agents.{' '}
            <span className="text-text-primary">Verified on-chain.</span>
          </p>

          <div className="flex flex-col items-center gap-1 mt-1">
            <p className="font-mono text-xs text-text-muted">
              pariksha.eth{' '}
              <span className="text-accent-verified">✓</span>{' '}
              Verified on ENS Sepolia
            </p>
            <p className="font-mono text-xs text-text-muted">
              iNFT contract:{' '}
              <span className="text-text-primary">{truncateAddress(INFT_CONTRACT)}</span>
            </p>
            <p className="font-mono text-xs text-text-muted">
              4 jurisdictions · {stats.agentCount || 11} agents · live
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={scrollToAgents}
              className="font-body text-sm font-medium px-6 py-2.5 rounded-xl border border-border-subtle text-text-primary hover:border-accent-verified/40 hover:bg-accent-verified/5 transition-all duration-150 focus-visible:ring-1 focus-visible:ring-accent-verified focus:outline-none"
            >
              Browse Marketplace
            </button>
            <Link
              href="/mint"
              className="font-body text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Mint Your Agent →
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-text-muted"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </section>

      {/* ── Stats strip ── */}
      <section className="sticky top-16 z-40 bg-panel border-y border-border-subtle">
        <div className="max-w-5xl mx-auto h-[100px] flex items-center">
          {[
            { value: stats.agentCount || 11, label: 'Total Agents' },
            { value: 4, label: 'Jurisdictions' },
            { value: stats.totalParikshaRuns, label: 'Pariksha Runs' },
            { value: `$${stats.totalLifetimeUsdc.toFixed(2)}`, label: 'USDC Lifetime' },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 flex flex-col items-center gap-0.5 relative">
              {i > 0 && (
                <div className="absolute left-0 top-1/4 h-1/2 w-px bg-border-subtle" />
              )}
              <span className={`font-mono font-bold text-4xl ${(typeof stat.value === 'number' ? stat.value : parseFloat(stat.value as string)) > 0 ? 'text-accent-verified' : 'text-text-primary'}`}>
                {stat.value}
              </span>
              <span className="text-xs text-text-muted font-body">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Agent grid ── */}
      <section id="agents" ref={agentsRef as React.RefObject<HTMLElement>} className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="font-mono text-xs text-accent-verified mb-2 tracking-widest uppercase">Marketplace</p>
              <h2 className="font-display font-bold text-4xl text-text-primary">Legal AI Agents</h2>
            </div>
            <p className="text-text-muted text-sm font-mono">
              {visibleAgents.length} {filter === 'All' ? 'agents across 4 jurisdictions' : `agents · ${filter}`}
            </p>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 mb-8">
            {JURISDICTION_FILTERS.map((j) => {
              const isActive = filter === j
              const color = j === 'All' ? '#8B8B95' : JURISDICTION_COLORS[j]
              const count = jurisdictionCounts[j] ?? 0
              return (
                <button
                  key={j}
                  onClick={() => setFilter(j)}
                  className="font-mono text-xs px-4 py-1.5 rounded-full border transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified"
                  style={{
                    color: isActive ? '#0A0A0F' : color,
                    borderColor: color,
                    backgroundColor: isActive ? color : `${color}18`,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {j} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-panel border border-border-subtle rounded-2xl p-5 h-56 animate-pulse" />
              ))}
            </div>
          ) : visibleAgents.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-mono text-text-muted text-sm">No agents found for this filter.</p>
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

      {/* ── How Pariksha works ── */}
      <section className="py-20 px-6 border-t border-border-subtle">
        <div className="max-w-5xl mx-auto">
          <p className="font-mono text-xs text-accent-verified mb-3 tracking-widest uppercase text-center">The Process</p>
          <h2 className="font-display font-bold text-3xl text-text-primary text-center mb-12">How Pariksha Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Browse',
                desc: 'Explore verified legal AI agents across India, Singapore, UAE-DIFC, and US jurisdictions. Each agent carries an ENS identity and on-chain Pariksha score.',
                icon: Globe,
              },
              {
                step: '02',
                title: 'Run Pariksha',
                desc: 'Benchmark any agent against 5 jurisdiction-specific Q&A pairs. Claude acts as impartial judge. Scores are immutable once attested on-chain.',
                icon: Shield,
              },
              {
                step: '03',
                title: 'Hire On-Chain',
                desc: 'Pay 0.05 USDC per query. Get a verified response with an on-chain attestation you can present as proof of AI-assisted legal research.',
                icon: Zap,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-text-muted">{step}</span>
                  <div className="flex-1 h-px bg-border-subtle" />
                  <div className="w-9 h-9 rounded-xl bg-accent-verified/10 flex items-center justify-center">
                    <Icon size={18} className="text-accent-verified" />
                  </div>
                </div>
                <h3 className="font-display font-semibold text-xl text-text-primary">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed flex-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border-subtle px-6 py-8 mt-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-text-primary tracking-tight">PARIKSHA</span>
            <span className="text-text-muted">·</span>
            <span className="font-mono text-xs text-text-muted">pariksha.eth</span>
          </div>
          <p className="font-mono text-xs text-text-muted text-center">
            Built for ETHGlobal Open Agents · Powered by 0G + ENS + KeeperHub
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <span className="text-text-muted text-xs">·</span>
            <span className="font-mono text-xs text-text-muted">Demo video (coming)</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

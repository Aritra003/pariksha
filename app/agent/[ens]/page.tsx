'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Nav } from '@/components/nav'
import { JurisdictionTag } from '@/components/jurisdiction-tag'
import { EnsPill } from '@/components/ens-pill'
import { ScoreDisplay } from '@/components/score-display'

interface Agent {
  ens_name: string
  display_name: string
  jurisdiction: string
  specialty: string
  current_score: number | null
  price_usdc: number
  status: string
  total_hires: number
  lifetime_usdc_earned: number
  total_pariksha_runs: number
  training_examples_count: number
  minted_at: string | null
  inft_address: string | null
  inft_token_id: string | null
  owner_address: string | null
  corpus_version: string | null
  backend_endpoint: string | null
  system_prompt: string | null
}

interface Run {
  id: string
  final_score: number
  attestation_tx_hash: string | null
  run_at: string
}

interface Badge {
  id: string
  badge_type: string
  awarded_at: string
  tx_hash: string | null
}

function ageDays(minted_at: string | null | undefined): string {
  if (!minted_at) return '—'
  const days = Math.floor((Date.now() - new Date(minted_at).getTime()) / 86400000)
  return `${days}d`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="text-text-muted hover:text-text-primary transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={12} className="text-accent-verified" /> : <Copy size={12} />}
    </button>
  )
}

function truncate(s: string | null | undefined, n = 20) {
  if (!s) return '—'
  return s.length > n ? s.slice(0, 8) + '...' + s.slice(-6) : s
}

export default function AgentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const ens = decodeURIComponent(params.ens as string)

  const [agent, setAgent] = useState<Agent | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/agents/${encodeURIComponent(ens)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Agent not found')
        return r.json()
      })
      .then((data) => {
        setAgent(data.agent)
        setRuns(data.scoreHistory ?? [])
        setBadges(data.badges ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [ens])

  const chartData = runs
    .slice()
    .reverse()
    .map((r) => ({
      date: new Date(r.run_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: r.final_score,
    }))

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
        <Nav />
        <div className="pt-28 px-6 max-w-5xl mx-auto space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-panel border border-border-subtle rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0F' }}>
        <Nav />
        <div className="text-center">
          <p className="font-mono text-accent-untested mb-4">{error ?? 'Agent not found'}</p>
          <button onClick={() => router.push('/')} className="font-mono text-sm text-text-muted hover:text-text-primary">
            ← Back to Marketplace
          </button>
        </div>
      </div>
    )
  }

  const explorerBase = 'https://sepolia.etherscan.io/address/'

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      <div className="pt-24 px-6 max-w-5xl mx-auto">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Marketplace
        </Link>

        {/* ── Hero ── */}
        <div className="bg-panel border border-border-subtle rounded-2xl p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <JurisdictionTag jurisdiction={agent.jurisdiction} />
                {agent.status === 'demo_ready' && (
                  <span className="flex items-center gap-1.5 font-mono text-xs text-accent-verified">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-verified animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              <div>
                <h1 className="font-display font-bold text-3xl text-text-primary mb-1">{agent.display_name}</h1>
                <EnsPill ens={agent.ens_name} />
              </div>
              <p className="text-sm text-text-muted leading-relaxed max-w-lg">{agent.specialty}</p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              <Link
                href={`/pariksha/${encodeURIComponent(ens)}`}
                className="font-mono text-sm font-medium px-5 py-2.5 rounded-xl border border-border-subtle text-text-primary hover:border-accent-verified/50 hover:bg-accent-verified/5 transition-all text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified"
              >
                Run Pariksha (free)
              </Link>
              <Link
                href={`/hire/${encodeURIComponent(ens)}`}
                className="font-mono text-sm font-medium px-5 py-2.5 rounded-xl bg-accent-verified/10 border border-accent-verified/30 text-accent-verified hover:bg-accent-verified/20 transition-all text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified"
              >
                Hire · ${agent.price_usdc.toFixed(2)} USDC
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border-subtle">
            <p className="font-mono text-xs text-text-muted mb-2 uppercase tracking-wider">Pariksha Score</p>
            <ScoreDisplay score={agent.current_score} size="xl" animate={true} />
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Age', value: ageDays(agent.minted_at) },
            { label: 'Total Hires', value: agent.total_hires ?? 0 },
            { label: 'Lifetime USDC', value: `$${(agent.lifetime_usdc_earned ?? 0).toFixed(2)}` },
            { label: 'Training Examples', value: agent.training_examples_count ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="bg-panel border border-border-subtle rounded-2xl p-5 flex flex-col gap-1">
              <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
              <p className="font-mono font-bold text-2xl text-text-primary tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* ── iNFT details ── */}
          <div className="bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="font-display font-semibold text-lg text-text-primary">iNFT Details</h2>
            <div className="space-y-3">
              {[
                {
                  label: 'Contract',
                  value: agent.inft_address,
                  href: agent.inft_address ? `${explorerBase}${agent.inft_address}` : undefined,
                },
                { label: 'Token ID', value: agent.inft_token_id },
                {
                  label: 'Owner',
                  value: agent.owner_address,
                  href: agent.owner_address ? `${explorerBase}${agent.owner_address}` : undefined,
                },
                { label: 'Corpus Version', value: agent.corpus_version },
                { label: 'Backend Endpoint', value: agent.backend_endpoint },
              ].map(({ label, value, href }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-text-muted shrink-0">{label}</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs text-text-primary truncate">{truncate(value, 24)}</span>
                    {value && <CopyButton text={value} />}
                    {href && (
                      <a href={href} target="_blank" rel="noreferrer" className="text-text-muted hover:text-text-primary transition-colors">
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Badges ── */}
          <div className="bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="font-display font-semibold text-lg text-text-primary">Badges</h2>
            {badges.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="font-mono text-xs text-text-muted text-center">No badges yet</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <div
                    key={b.id}
                    className="bg-accent-rare/10 border border-accent-rare/30 rounded-xl px-3 py-2 flex flex-col gap-0.5"
                  >
                    <span className="font-mono text-xs font-semibold text-accent-rare">{b.badge_type}</span>
                    <span className="font-mono text-[10px] text-text-muted">
                      {new Date(b.awarded_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Score history ── */}
        <div className="bg-panel border border-border-subtle rounded-2xl p-6 mb-6">
          <h2 className="font-display font-semibold text-lg text-text-primary mb-6">Score History</h2>
          {chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="font-mono text-sm text-text-muted">
                No Pariksha runs yet — be the first to test this agent
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8B8B95', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#8B8B95', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#14141A',
                    border: '1px solid #2A2A35',
                    borderRadius: 8,
                    fontFamily: 'JetBrains Mono',
                    fontSize: 12,
                    color: '#F5F5F7',
                  }}
                  labelStyle={{ color: '#8B8B95', marginBottom: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#00FF94"
                  strokeWidth={2}
                  dot={{ fill: '#00FF94', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#00FF94' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── System prompt preview ── */}
        <div className="bg-panel border border-border-subtle rounded-2xl overflow-hidden mb-6">
          <button
            onClick={() => setPromptOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified"
          >
            <div>
              <h2 className="font-display font-semibold text-base text-text-primary">System Prompt Preview</h2>
              <p className="font-mono text-xs text-text-muted mt-0.5">What this agent has been told</p>
            </div>
            {promptOpen ? (
              <ChevronUp size={16} className="text-text-muted" />
            ) : (
              <ChevronDown size={16} className="text-text-muted" />
            )}
          </button>
          {promptOpen && (
            <div className="border-t border-border-subtle px-6 py-4">
              {agent.system_prompt ? (
                <pre className="font-mono text-xs text-text-muted whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                  {agent.system_prompt}
                </pre>
              ) : (
                <p className="font-mono text-xs text-text-muted">No system prompt stored for this agent.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

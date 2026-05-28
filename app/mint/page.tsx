'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Nav } from '@/components/nav'
import { JurisdictionTag } from '@/components/jurisdiction-tag'

const JURISDICTIONS = ['India', 'Singapore', 'UAE-DIFC', 'US']
const PRICES = [
  { label: '$0.01', value: 0.01 },
  { label: '$0.05', value: 0.05 },
  { label: '$0.10', value: 0.10 },
]
const JURISDICTION_SUFFIX: Record<string, string> = {
  India: 'in',
  Singapore: 'sg',
  'UAE-DIFC': 'ae',
  US: 'us',
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
}

type MintResult = {
  ensName: string
  tokenId: number
  txHash: string
  status?: string
  warning?: string
  trust_scan?: {
    passed: boolean
    warnings: { code: string; message: string }[]
    framework_checks: Record<string, boolean>
  }
}

type TrustReviewOutcome = {
  outcome: 'passed' | 'failed'
  benchmark_score: number
  threshold: number
  new_status: string
  badge_tx_hash: string | null
}

type MintError = {
  message: string
  issues?: { code: string; severity: string; message: string }[]
}

export default function MintPage() {
  const { address, isConnected } = useAccount()

  const [agentName, setAgentName] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [priceUsdc, setPriceUsdc] = useState(0.05)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<MintError | null>(null)
  const [result, setResult] = useState<MintResult | null>(null)
  const [trustReview, setTrustReview] = useState<TrustReviewOutcome | null>(null)
  const [trustReviewRunning, setTrustReviewRunning] = useState(false)
  const [trustReviewError, setTrustReviewError] = useState<string | null>(null)

  const ensPreview = useMemo(() => {
    const slug = slugify(agentName)
    const suffix = jurisdiction ? JURISDICTION_SUFFIX[jurisdiction] : null
    if (!slug || !suffix) return null
    return `${slug}.${suffix}.pariksha.eth`
  }, [agentName, jurisdiction])

  const isValid =
    isConnected &&
    agentName.length >= 3 &&
    agentName.length <= 30 &&
    !!jurisdiction &&
    specialty.length >= 10 &&
    specialty.length <= 100 &&
    systemPrompt.length >= 50 &&
    systemPrompt.length <= 2000

  async function handleMint(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || !address) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agents/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName,
          jurisdiction,
          specialty,
          systemPrompt,
          priceUsdc,
          ownerAddress: address,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError({
          message: data.error ?? 'Mint failed. Please try again.',
          issues: data.issues,
        })
      } else {
        setResult(data)
      }
    } catch {
      setError({ message: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // Auto-trigger trust review after successful mint
  useEffect(() => {
    if (!result || result.status !== 'pending_review' || trustReview || trustReviewRunning) return
    setTrustReviewRunning(true)
    setTrustReviewError(null)
    fetch(`/api/agents/${encodeURIComponent(result.ensName)}/trust-review`, { method: 'POST' })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          setTrustReviewError(data.error ?? 'Trust review failed.')
        } else {
          setTrustReview(data)
        }
      })
      .catch(() => setTrustReviewError('Trust review network error.'))
      .finally(() => setTrustReviewRunning(false))
  }, [result, trustReview, trustReviewRunning])

  if (result) {
    const reviewPassed = trustReview?.outcome === 'passed'
    const reviewFailed = trustReview?.outcome === 'failed'

    const headlineIcon = reviewPassed ? (
      <ShieldCheck size={40} className="text-accent-verified" />
    ) : reviewFailed ? (
      <ShieldAlert size={40} className="text-red-400" />
    ) : trustReviewRunning ? (
      <Loader2 size={40} className="text-accent-verified animate-spin" />
    ) : (
      <CheckCircle2 size={40} className="text-accent-verified" />
    )

    const headlineText = reviewPassed
      ? 'Agent Verified & Live'
      : reviewFailed
      ? 'Agent Minted — Trust Review Failed'
      : trustReviewRunning
      ? 'Reviewing Agent…'
      : 'Agent Minted'

    const headlineSub = reviewPassed
      ? 'Trust-reviewed and listed in the marketplace.'
      : reviewFailed
      ? 'Agent minted on-chain but is hidden from the marketplace.'
      : trustReviewRunning
      ? 'Running benchmark gate. This takes ~30 seconds.'
      : 'Your legal AI agent is minted on 0G Galileo. Trust review starting…'

    const borderClass = reviewFailed
      ? 'border-red-400/30'
      : 'border-accent-verified/30'

    return (
      <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
        <Nav />
        <div className="pt-32 px-6 max-w-2xl mx-auto">
          <div className={`bg-panel border ${borderClass} rounded-2xl p-8 text-center`}>
            <div className="flex justify-center mb-4">{headlineIcon}</div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-2">
              {headlineText}
            </h1>
            <p className="font-body text-sm text-text-muted mb-6">{headlineSub}</p>

            <div className="bg-white/5 rounded-xl p-4 text-left font-mono text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-text-muted">ENS</span>
                <span className="text-accent-verified">{result.ensName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Token ID</span>
                <span className="text-text-primary">#{result.tokenId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Tx</span>
                <a
                  href={`https://chainscan-galileo.0g.ai/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-primary hover:text-accent-verified flex items-center gap-1 transition-colors"
                >
                  {result.txHash.slice(0, 10)}…{result.txHash.slice(-6)}
                  <ExternalLink size={10} />
                </a>
              </div>
              {trustReview && (
                <>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Benchmark</span>
                    <span className={reviewPassed ? 'text-accent-verified' : 'text-red-400'}>
                      {trustReview.benchmark_score.toFixed(1)} / 100 (threshold {trustReview.threshold})
                    </span>
                  </div>
                  {trustReview.badge_tx_hash && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">TRUST_REVIEWED badge</span>
                      <a
                        href={`https://chainscan-galileo.0g.ai/tx/${trustReview.badge_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-primary hover:text-accent-verified flex items-center gap-1 transition-colors"
                      >
                        {trustReview.badge_tx_hash.slice(0, 10)}…{trustReview.badge_tx_hash.slice(-6)}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {result.warning && (
              <p className="font-mono text-xs text-yellow-400 bg-yellow-400/10 rounded-xl px-4 py-3 mb-6">
                ⚠ {result.warning}
              </p>
            )}
            {result.trust_scan?.warnings && result.trust_scan.warnings.length > 0 && (
              <div className="font-mono text-xs text-yellow-400/80 bg-yellow-400/5 rounded-xl px-4 py-3 mb-6 text-left">
                <p className="text-yellow-400 mb-2 font-semibold">Prompt-safety warnings (non-blocking):</p>
                <ul className="list-disc list-inside space-y-1">
                  {result.trust_scan.warnings.map((w) => (
                    <li key={w.code}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {trustReviewError && (
              <p className="font-mono text-xs text-yellow-400 bg-yellow-400/10 rounded-xl px-4 py-3 mb-6">
                ⚠ Trust review error: {trustReviewError}
              </p>
            )}
            {reviewFailed && (
              <p className="font-mono text-xs text-red-400/90 bg-red-400/5 rounded-xl px-4 py-3 mb-6 text-left">
                Benchmark score {trustReview.benchmark_score.toFixed(1)} is below the trust-pass threshold ({trustReview.threshold}).
                The agent is minted on-chain but hidden from the public marketplace. Revise the system prompt and re-mint.
              </p>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                href={`/agent/${encodeURIComponent(result.ensName)}`}
                className="font-mono text-sm font-semibold px-5 py-2.5 rounded-xl bg-accent-verified/10 border border-accent-verified/30 text-accent-verified hover:bg-accent-verified/20 transition-all"
              >
                View Agent Profile
              </Link>
              <Link
                href={`/pariksha/${encodeURIComponent(result.ensName)}`}
                className="font-mono text-sm font-semibold px-5 py-2.5 rounded-xl border border-border-subtle text-text-primary hover:border-accent-verified/40 transition-all"
              >
                Run Pariksha
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      <div className="pt-32 px-6 max-w-2xl mx-auto">
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
            Mint Your Legal AI Agent
          </h1>
          <p className="font-body text-base text-text-muted leading-relaxed max-w-lg">
            Deploy a jurisdiction-specific legal AI agent on Pariksha. Your agent gets an ENS
            identity, an iNFT on 0G Galileo, and a Pariksha benchmark score.
          </p>
        </div>

        {/* Wallet gate */}
        {!isConnected ? (
          <div className="bg-panel border border-border-subtle rounded-2xl p-8 text-center">
            <p className="font-body text-sm text-text-muted mb-6">
              Connect your wallet to mint a legal AI agent.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <form onSubmit={handleMint} className="bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col gap-6">

            {/* Agent name */}
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                Agent Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Sharma Legal"
                minLength={3}
                maxLength={30}
                required
                className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-2.5 font-body text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
              />
              {ensPreview && (
                <p className="font-mono text-xs text-text-muted mt-1.5">
                  ENS: <span className="text-accent-verified">{ensPreview}</span>
                </p>
              )}
            </div>

            {/* Jurisdiction */}
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                Jurisdiction <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {JURISDICTIONS.map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setJurisdiction(j)}
                    className={`transition-all focus:outline-none ${jurisdiction === j ? 'ring-1 ring-accent-verified rounded-full' : ''}`}
                  >
                    <JurisdictionTag jurisdiction={j} />
                  </button>
                ))}
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                Specialty / Practice Area <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Criminal litigation, Tax law, M&A..."
                minLength={10}
                maxLength={100}
                required
                className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-2.5 font-body text-sm text-text-primary placeholder-text-muted focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
              />
              <p className="font-mono text-xs text-text-muted mt-1 text-right">
                {specialty.length}/100
              </p>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                System Prompt <span className="text-red-400">*</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={`You are a specialist in Indian commercial law with expertise in high-court litigation. You provide accurate, jurisdiction-specific legal analysis. Always clarify you are not a substitute for qualified legal counsel. When citing case law, include year, court, and citation number.`}
                rows={6}
                minLength={50}
                maxLength={2000}
                required
                className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-3 font-mono text-xs text-text-primary placeholder-text-muted resize-none focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
              />
              <p className="font-mono text-xs text-text-muted mt-1 text-right">
                {systemPrompt.length}/2000
              </p>
            </div>

            {/* Price */}
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                Price per Query (USDC)
              </label>
              <div className="flex gap-2">
                {PRICES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriceUsdc(p.value)}
                    className={`font-mono text-sm px-4 py-2 rounded-xl border transition-all focus:outline-none ${
                      priceUsdc === p.value
                        ? 'border-accent-verified/50 bg-accent-verified/10 text-accent-verified'
                        : 'border-border-subtle text-text-muted hover:border-accent-verified/30'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Owner address (read-only) */}
            <div>
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-2">
                Owner Wallet
              </label>
              <p className="font-mono text-xs text-text-primary bg-white/5 rounded-xl px-4 py-2.5 break-all">
                {address}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="font-mono text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-3">
                <p>{error.message}</p>
                {error.issues && error.issues.length > 0 && (
                  <ul className="list-disc list-inside mt-2 space-y-1 text-red-400/90">
                    {error.issues.map((i) => (
                      <li key={i.code}>
                        <span className="opacity-70">[{i.severity}]</span> {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`font-mono text-sm font-semibold px-6 py-3 rounded-xl transition-all focus:outline-none ${
                isValid && !loading
                  ? 'bg-accent-verified/10 border border-accent-verified/30 text-accent-verified hover:bg-accent-verified/20 focus-visible:ring-1 focus-visible:ring-accent-verified'
                  : 'bg-border-subtle text-text-muted cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-accent-verified border-t-transparent rounded-full animate-spin" />
                  Minting on 0G Galileo…
                </span>
              ) : (
                'Mint Agent'
              )}
            </button>

            <p className="font-mono text-xs text-text-muted text-center">
              Minting is free. The iNFT is minted by the Pariksha backend on 0G Galileo testnet.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

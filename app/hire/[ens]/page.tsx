'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, Copy, Check, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { Nav } from '@/components/nav'
import { JurisdictionTag } from '@/components/jurisdiction-tag'
import { EnsPill } from '@/components/ens-pill'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface Agent {
  ens_name: string
  display_name: string
  jurisdiction: string
  specialty: string
  price_usdc: number
}

type StepStatus = 'pending' | 'running' | 'done'

interface Step {
  label: string
  detail?: string
  status: StepStatus
  txHash?: string
}

interface HireResult {
  hireId: string
  agentEns: string
  response: string
  usdcPaid: number
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

export default function HirePage() {
  const params = useParams()
  const ens = decodeURIComponent(params.ens as string)
  const { address, isConnected } = useAccount()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [agentLoading, setAgentLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [steps, setSteps] = useState<Step[]>([])
  const [result, setResult] = useState<HireResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/agents/${encodeURIComponent(ens)}`)
      .then((r) => r.json())
      .then((d) => setAgent(d.agent))
      .catch(console.error)
      .finally(() => setAgentLoading(false))
  }, [ens])

  async function runHire() {
    if (!query.trim()) return
    setPhase('running')
    setErrorMsg(null)

    const initialSteps: Step[] = [
      { label: 'Approving USDC…', status: 'running' },
      { label: 'Settling payment via KeeperHub…', status: 'pending' },
      { label: 'Querying agent…', status: 'pending' },
      { label: 'Writing attestation…', status: 'pending' },
    ]
    setSteps(initialSteps)

    // Mock step 1 — USDC approval (simulated)
    await new Promise((r) => setTimeout(r, 1200))
    setSteps((s) => {
      const n = [...s]
      n[0] = { ...n[0], status: 'done', txHash: '0xmock_usdc_approval' }
      n[1] = { ...n[1], status: 'running' }
      return n
    })

    // Mock step 2 — KeeperHub (simulated)
    await new Promise((r) => setTimeout(r, 1000))
    setSteps((s) => {
      const n = [...s]
      n[1] = { ...n[1], status: 'done', txHash: '0xmock_keeper_settle' }
      n[2] = { ...n[2], status: 'running' }
      return n
    })

    // Step 3 — real API call
    try {
      const res = await fetch('/api/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentEns: ens,
          query,
          buyerAddress: address ?? '0x0000000000000000000000000000000000000000',
          usdcPaid: agent?.price_usdc ?? 0.05,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Hire failed')
      }

      const data: HireResult = await res.json()

      setSteps((s) => {
        const n = [...s]
        n[2] = { ...n[2], status: 'done' }
        n[3] = { ...n[3], status: 'running' }
        return n
      })

      // Mock attestation step
      await new Promise((r) => setTimeout(r, 800))
      setSteps((s) => {
        const n = [...s]
        n[3] = { ...n[3], status: 'done', txHash: '0xmock_attestation' }
        return n
      })

      setResult(data)
      setPhase('done')
    } catch (e: unknown) {
      setSteps((s) => {
        const n = [...s]
        const running = n.findIndex((x) => x.status === 'running')
        if (running >= 0) n[running] = { ...n[running], status: 'pending' }
        return n
      })
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setPhase('error')
    }
  }

  const canHire = isConnected && query.trim().length >= 10

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      <div className="pt-24 px-6 max-w-2xl mx-auto">
        <Link
          href={`/agent/${encodeURIComponent(ens)}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Agent Profile
        </Link>

        {/* Agent header */}
        <div className="bg-panel border border-border-subtle rounded-2xl p-5 mb-6">
          {agentLoading ? (
            <div className="h-10 bg-border-subtle/30 rounded-xl animate-pulse" />
          ) : agent ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <JurisdictionTag jurisdiction={agent.jurisdiction} />
                </div>
                <h1 className="font-display font-semibold text-lg text-text-primary">{agent.display_name}</h1>
                <EnsPill ens={agent.ens_name} />
              </div>
              <div className="text-right shrink-0">
                <p className="font-mono text-[10px] text-text-muted mb-0.5 uppercase tracking-wider">Per query</p>
                <p className="font-mono font-bold text-xl text-accent-verified">${agent.price_usdc.toFixed(2)}</p>
                <p className="font-mono text-[10px] text-text-muted">USDC</p>
              </div>
            </div>
          ) : null}
        </div>

        {phase === 'idle' || phase === 'error' ? (
          <>
            {/* Query input */}
            <div className="bg-panel border border-border-subtle rounded-2xl p-6 mb-4">
              <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
                Your Legal Query
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Ask ${agent?.display_name ?? 'this agent'} a ${agent?.jurisdiction ?? 'legal'} law question…`}
                rows={5}
                className="w-full bg-transparent border border-border-subtle rounded-xl px-4 py-3 font-body text-sm text-text-primary placeholder-text-muted resize-none focus:outline-none focus-visible:border-accent-verified/50 focus-visible:ring-1 focus-visible:ring-accent-verified transition-colors"
              />
              {query.trim().length > 0 && query.trim().length < 10 && (
                <p className="font-mono text-xs text-accent-untested mt-2">Please enter at least 10 characters.</p>
              )}
            </div>

            {/* Pricing */}
            <div className="bg-panel border border-border-subtle rounded-2xl p-5 mb-6">
              <h3 className="font-mono text-xs text-text-muted uppercase tracking-wider mb-4">Pricing</h3>
              <div className="space-y-2">
                {[
                  { label: 'Base price', value: `$${agent?.price_usdc?.toFixed(2) ?? '0.05'} USDC` },
                  { label: 'Network fee', value: '~$0.001 USDC' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="font-body text-sm text-text-muted">{label}</span>
                    <span className="font-mono text-sm text-text-primary">{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className="font-body text-sm font-semibold text-text-primary">Total</span>
                  <span className="font-mono font-bold text-accent-verified">
                    ${((agent?.price_usdc ?? 0.05) + 0.001).toFixed(3)} USDC
                  </span>
                </div>
              </div>
            </div>

            {phase === 'error' && (
              <div className="bg-accent-untested/10 border border-accent-untested/30 rounded-xl px-4 py-3 mb-4">
                <p className="font-mono text-xs text-accent-untested">{errorMsg}</p>
              </div>
            )}

            {!isConnected ? (
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-xs text-text-muted">Connect wallet to hire this agent</p>
                <ConnectButton />
              </div>
            ) : (
              <button
                onClick={runHire}
                disabled={!canHire}
                className={`w-full font-mono text-sm font-semibold py-3.5 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-verified focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F] ${
                  canHire
                    ? 'bg-accent-verified text-[#0A0A0F] hover:opacity-90 active:scale-95'
                    : 'bg-border-subtle text-text-muted cursor-not-allowed'
                }`}
              >
                Hire · ${((agent?.price_usdc ?? 0.05) + 0.001).toFixed(3)} USDC
              </button>
            )}
          </>
        ) : phase === 'running' ? (
          /* Progress modal */
          <div className="bg-panel border border-border-subtle rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="text-accent-verified animate-spin" />
              <p className="font-mono text-sm text-text-primary">Processing your hire…</p>
            </div>
            <div className="flex flex-col gap-4">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  {step.status === 'done' ? (
                    <CheckCircle2 size={16} className="text-accent-verified shrink-0 mt-0.5" />
                  ) : step.status === 'running' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-accent-verified border-t-transparent animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <Circle size={16} className="text-text-muted shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-mono text-sm ${step.status === 'pending' ? 'text-text-muted' : 'text-text-primary'}`}>
                      {step.label}
                    </p>
                    {step.txHash && step.status === 'done' && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="font-mono text-[10px] text-text-muted truncate max-w-[200px]">{step.txHash}</span>
                        <CopyButton text={step.txHash} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Done */
          <div className="flex flex-col gap-6">
            <div className="bg-panel border border-border-subtle rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-accent-verified" />
                <p className="font-mono text-sm text-accent-verified">Hire complete</p>
              </div>
              <div>
                <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">Agent Response</p>
                <div className="bg-background/50 border border-border-subtle rounded-xl p-4">
                  <p className="font-body text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {result?.response}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2 border-t border-border-subtle">
                <div>
                  <p className="font-mono text-[10px] text-text-muted">Hire ID</p>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-xs text-text-primary">{result?.hireId?.slice(0, 12)}…</span>
                    {result?.hireId && <CopyButton text={result.hireId} />}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-text-muted">Paid</p>
                  <p className="font-mono text-xs text-accent-verified">${result?.usdcPaid?.toFixed(3)} USDC</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPhase('idle')
                  setResult(null)
                  setQuery('')
                }}
                className="flex-1 font-mono text-sm py-2.5 rounded-xl border border-border-subtle text-text-primary hover:border-accent-verified/40 hover:bg-accent-verified/5 transition-all text-center"
              >
                Hire Again
              </button>
              <Link
                href={`/pariksha/${encodeURIComponent(ens)}`}
                className="flex-1 font-mono text-sm py-2.5 rounded-xl border border-border-subtle text-text-muted hover:text-text-primary transition-all text-center"
              >
                Run Pariksha
              </Link>
              <button
                onClick={() => {
                  if (result) {
                    const blob = new Blob([result.response], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${ens}-response.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }
                }}
                className="flex-1 font-mono text-sm py-2.5 rounded-xl border border-border-subtle text-text-muted hover:text-text-primary transition-all text-center"
              >
                Save to Matter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

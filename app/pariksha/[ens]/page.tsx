'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { Nav } from '@/components/nav'
import { JurisdictionTag } from '@/components/jurisdiction-tag'
import { ScoreDisplay } from '@/components/score-display'

interface Agent {
  ens_name: string
  display_name: string
  jurisdiction: string
  price_usdc: number
  current_score: number | null
}

interface PerQuestion {
  questionId: string
  score: number
  reasoning: string
  agentAnswer?: string
  goldenAnswer?: string
  question?: string
}

interface RunResult {
  runId: string
  agentEns: string
  finalScore: number
  perQuestionScores: PerQuestion[]
  judgeReasoning: string
  elapsedMs: number
  questionCount: number
}

type QuestionStatus = 'pending' | 'running' | 'scored'

const FAKE_QUESTIONS = [
  'Question 1 of 5',
  'Question 2 of 5',
  'Question 3 of 5',
  'Question 4 of 5',
  'Question 5 of 5',
]

export default function ParikshaRunPage() {
  const params = useParams()
  const ens = decodeURIComponent(params.ens as string)

  const [agent, setAgent] = useState<Agent | null>(null)
  const [agentLoading, setAgentLoading] = useState(true)

  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<RunResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [questionStatuses, setQuestionStatuses] = useState<QuestionStatus[]>(Array(5).fill('pending'))
  const [openQ, setOpenQ] = useState<number | null>(null)
  const confettiRef = useRef(false)

  useEffect(() => {
    fetch(`/api/agents/${encodeURIComponent(ens)}`)
      .then((r) => r.json())
      .then((d) => setAgent(d.agent))
      .catch(console.error)
      .finally(() => setAgentLoading(false))
  }, [ens])

  async function beginPariksha() {
    setPhase('running')
    setQuestionStatuses(Array(5).fill('pending'))
    setResult(null)
    setErrorMsg(null)

    // Animate fake question progression while API runs
    let current = 0
    const interval = setInterval(() => {
      if (current < 5) {
        setQuestionStatuses((prev) => {
          const next = [...prev]
          if (current > 0) next[current - 1] = 'scored'
          next[current] = 'running'
          return next
        })
        current++
      }
    }, 4000)

    try {
      const res = await fetch('/api/pariksha/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentEns: ens }),
      })
      clearInterval(interval)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Run failed')
      }

      const data: RunResult = await res.json()
      setQuestionStatuses(Array(5).fill('scored'))
      setResult(data)
      setPhase('done')
    } catch (e: unknown) {
      clearInterval(interval)
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
      setPhase('error')
    }
  }

  // Confetti on done
  useEffect(() => {
    if (phase === 'done' && result && !confettiRef.current) {
      confettiRef.current = true
      import('canvas-confetti').then((m) => {
        m.default({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#00FF94', '#00C7FF', '#BF5AF2'],
        })
      })
    }
  }, [phase, result])

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      <div className="pt-24 px-6 max-w-3xl mx-auto">
        <Link
          href={`/agent/${encodeURIComponent(ens)}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Agent Profile
        </Link>

        {/* Header */}
        <div className="bg-panel border border-border-subtle rounded-2xl p-6 mb-6">
          {agentLoading ? (
            <div className="h-12 bg-border-subtle/30 rounded-xl animate-pulse" />
          ) : agent ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <JurisdictionTag jurisdiction={agent.jurisdiction} />
                </div>
                <h1 className="font-display font-bold text-2xl text-text-primary">{agent.display_name}</h1>
                <p className="font-mono text-xs text-text-muted mt-0.5">{agent.ens_name}</p>
              </div>
              {phase !== 'idle' && phase !== 'running' && agent.current_score !== null && (
                <div className="text-right">
                  <p className="font-mono text-[10px] text-text-muted mb-1 uppercase tracking-wider">Previous Score</p>
                  <ScoreDisplay score={agent.current_score} size="sm" animate={false} />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* ── Idle — Begin ── */}
        {phase === 'idle' && (
          <div className="bg-panel border border-border-subtle rounded-2xl p-10 flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent-verified/10 flex items-center justify-center">
              <span className="font-mono text-2xl text-accent-verified font-bold">P</span>
            </div>
            <div>
              <h2 className="font-display font-bold text-2xl text-text-primary mb-2">Pariksha Test</h2>
              <p className="font-body text-sm text-text-muted max-w-sm leading-relaxed">
                5 jurisdiction-specific legal questions. Claude acts as impartial judge. Score is
                recorded on-chain. Free to run.
              </p>
            </div>
            <button
              onClick={beginPariksha}
              className="font-mono text-base font-semibold px-8 py-3.5 rounded-xl bg-accent-verified text-[#0A0A0F] hover:opacity-90 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-verified focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0F]"
            >
              Begin Pariksha →
            </button>
          </div>
        )}

        {/* ── Running ── */}
        {phase === 'running' && (
          <div className="bg-panel border border-border-subtle rounded-2xl p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-verified animate-pulse" />
              <p className="font-mono text-sm text-text-primary">Pariksha Test in Progress…</p>
            </div>
            <p className="font-mono text-xs text-text-muted">
              Calling agent, judging responses. This takes 20–45 seconds.
            </p>
            <div className="flex flex-col gap-2">
              {FAKE_QUESTIONS.map((q, i) => (
                <div key={i} className="flex items-center gap-3">
                  {questionStatuses[i] === 'scored' ? (
                    <CheckCircle2 size={16} className="text-accent-verified shrink-0" />
                  ) : questionStatuses[i] === 'running' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-accent-verified border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <Circle size={16} className="text-text-muted shrink-0" />
                  )}
                  <span className={`font-mono text-xs ${questionStatuses[i] === 'pending' ? 'text-text-muted' : 'text-text-primary'}`}>
                    {q}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="bg-panel border border-accent-untested/30 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <p className="font-mono text-accent-untested">{errorMsg}</p>
            <button
              onClick={() => setPhase('idle')}
              className="font-mono text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              ← Try again
            </button>
          </div>
        )}

        {/* ── Done ── */}
        {phase === 'done' && result && (
          <div className="flex flex-col gap-6">
            {/* Final score reveal */}
            <div className="bg-panel border border-border-subtle rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
              <p className="font-mono text-xs text-text-muted uppercase tracking-widest">Final Pariksha Score</p>
              <ScoreDisplay score={result.finalScore} size="xl" animate={true} />
              <p className="font-mono text-xs text-text-muted max-w-sm leading-relaxed">{result.judgeReasoning}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono text-[10px] text-text-muted">
                  {result.questionCount} questions · {(result.elapsedMs / 1000).toFixed(1)}s
                </span>
                {result.runId && (
                  <>
                    <span className="text-text-muted">·</span>
                    <span className="font-mono text-[10px] text-text-muted">Run ID: {result.runId.slice(0, 8)}…</span>
                  </>
                )}
              </div>
            </div>

            {/* Per-question breakdown */}
            <div className="bg-panel border border-border-subtle rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle">
                <h3 className="font-display font-semibold text-base text-text-primary">Per-Question Breakdown</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {result.perQuestionScores.map((q, i) => (
                  <div key={q.questionId}>
                    <button
                      onClick={() => setOpenQ(openQ === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-white/2 transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={14} className="text-accent-verified shrink-0" />
                        <span className="font-mono text-xs text-text-primary">Question {i + 1}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-accent-verified">{q.score}/20</span>
                        {openQ === i ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                      </div>
                    </button>
                    {openQ === i && (
                      <div className="px-6 pb-5 flex flex-col gap-4">
                        <div>
                          <p className="font-mono text-[10px] text-text-muted uppercase tracking-wider mb-1">Judge Reasoning</p>
                          <p className="font-mono text-xs text-text-muted leading-relaxed">{q.reasoning}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/hire/${encodeURIComponent(ens)}`}
              className="font-mono text-sm font-semibold px-6 py-3.5 rounded-xl bg-accent-verified/10 border border-accent-verified/30 text-accent-verified hover:bg-accent-verified/20 transition-all text-center focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified"
            >
              Hire This Agent · ${agent?.price_usdc?.toFixed(2) ?? '0.05'} USDC
            </Link>

            {/* Run again */}
            <button
              onClick={() => { setPhase('idle'); confettiRef.current = false }}
              className="font-mono text-xs text-text-muted hover:text-text-primary transition-colors text-center"
            >
              Run Pariksha again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

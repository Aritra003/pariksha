'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Nav } from '@/components/nav'
import { WorkflowCard, type WorkflowCardData } from '@/components/workflow-card'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agents?type=workflow')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load workflows')
        return r.json()
      })
      .then((data) => setWorkflows(data.agents ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#0A0A0F' }}>
      <Nav />

      <div className="pt-32 px-6 max-w-6xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Marketplace
        </Link>

        <div className="mb-10">
          <p className="font-mono text-xs text-accent-rare mb-3 tracking-widest uppercase">
            Workflows
          </p>
          <h1 className="font-display font-bold text-4xl text-text-primary mb-3">
            Named Legal Workflows
          </h1>
          <p className="font-body text-base text-text-muted leading-relaxed max-w-2xl">
            Task-scoped legal AI workflows (cheque-bounce notices, RERA complaints,
            stamp-duty calculation, MSME vendor review, cross-border NDA triage, GST
            notice response). Each returns structured JSON output. Paid per-call in
            USDC via x402 on Base Sepolia.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-panel border border-border-subtle rounded-2xl h-56 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="font-mono text-sm text-red-400">{error}</p>
        ) : workflows.length === 0 ? (
          <div className="bg-panel border border-border-subtle rounded-2xl p-10 text-center">
            <p className="font-mono text-sm text-text-muted">
              No workflows are minted yet. Workflows will appear here once minted on 0G Galileo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((w, i) => (
              <WorkflowCard key={w.ens_name} workflow={w} index={i} />
            ))}
          </div>
        )}

        <p className="font-mono text-xs text-text-muted mt-10 max-w-2xl">
          Workflows are accessible programmatically via the Pariksha MCP server at{' '}
          <code className="text-text-primary">/api/mcp</code> — tools named{' '}
          <code>cheque_bounce_notice</code>, <code>rera_complaint</code>,{' '}
          <code>stamp_duty_calc</code>, <code>msme_vendor_review</code>,{' '}
          <code>cross_border_nda_triage</code>, <code>gst_notice_response</code>.
        </p>
      </div>
    </div>
  )
}

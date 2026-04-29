'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { JurisdictionTag } from './jurisdiction-tag'
import { ScoreDisplay } from './score-display'

export interface AgentCardData {
  ens_name: string
  display_name: string
  jurisdiction: string
  specialty: string
  current_score: number | null
  price_usdc: number
  status: string
  total_hires: number
  minted_at?: string | null
}

function ageDays(minted_at: string | null | undefined): string {
  if (!minted_at) return '—'
  const days = Math.floor((Date.now() - new Date(minted_at).getTime()) / 86400000)
  return `${days}d`
}

interface Props {
  agent: AgentCardData
  index?: number
}

export function AgentCard({ agent, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link href={`/agent/${encodeURIComponent(agent.ens_name)}`} aria-label={`View ${agent.display_name}`}>
        <div className="group bg-panel border border-border-subtle rounded-2xl p-5 flex flex-col gap-3 h-full cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-accent-verified/50 hover:shadow-[0_0_20px_rgba(0,255,148,0.06)]">
          <div className="flex items-start justify-between gap-2">
            <JurisdictionTag jurisdiction={agent.jurisdiction} />
            {agent.status === 'demo_ready' ? (
              <span className="flex items-center gap-1.5 font-mono text-xs text-accent-verified">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-verified animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-mono text-xs text-yellow-400/70">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/70" />
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

          <div className="flex items-end justify-between pt-2 border-t border-border-subtle mt-auto">
            <div>
              <p className="text-[10px] font-mono text-text-muted mb-1 uppercase tracking-wider">Score</p>
              <ScoreDisplay score={agent.current_score} size="sm" animate={false} />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-text-muted mb-1 uppercase tracking-wider">Per query</p>
              <p className="font-mono font-semibold text-text-primary text-sm">
                ${agent.price_usdc.toFixed(2)}{' '}
                <span className="text-text-muted text-xs font-normal">USDC</span>
              </p>
            </div>
          </div>

          <p className="font-mono text-[10px] text-text-muted">
            Age: {ageDays(agent.minted_at)} · Hires: {agent.total_hires ?? 0}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { JurisdictionTag } from './jurisdiction-tag'

export interface WorkflowCardData {
  ens_name: string
  display_name: string
  jurisdiction: string
  specialty: string
  price_usdc: number
  status: string
  total_hires: number
  minted_at?: string | null
}

interface Props {
  workflow: WorkflowCardData
  index?: number
}

export function WorkflowCard({ workflow, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        href={`/agent/${encodeURIComponent(workflow.ens_name)}`}
        aria-label={`View workflow ${workflow.display_name}`}
      >
        <div className="group bg-panel border border-border-subtle rounded-2xl p-5 flex flex-col gap-3 h-full cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-accent-rare/50 hover:shadow-[0_0_20px_rgba(176,148,255,0.06)]">
          <div className="flex items-start justify-between gap-2">
            <JurisdictionTag jurisdiction={workflow.jurisdiction} />
            <span className="font-mono text-[10px] text-accent-rare uppercase tracking-widest">
              Workflow
            </span>
          </div>

          <p className="font-mono text-xs text-text-muted truncate">{workflow.ens_name}</p>

          <h3 className="font-display font-semibold text-text-primary text-base leading-snug">
            {workflow.display_name}
          </h3>

          <p className="text-xs text-text-muted leading-relaxed line-clamp-3 flex-1">
            {workflow.specialty}
          </p>

          <div className="flex items-end justify-between pt-2 border-t border-border-subtle mt-auto">
            <div>
              <p className="text-[10px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                Per workflow
              </p>
              <p className="font-mono font-semibold text-text-primary text-sm">
                ${workflow.price_usdc.toFixed(2)}{' '}
                <span className="text-text-muted text-xs font-normal">USDC</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-text-muted mb-1 uppercase tracking-wider">
                Calls
              </p>
              <p className="font-mono font-semibold text-text-primary text-sm tabular-nums">
                {workflow.total_hires ?? 0}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

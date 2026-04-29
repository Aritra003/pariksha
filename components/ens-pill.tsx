'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface EnsPillProps {
  ens: string
  truncate?: boolean
}

export function EnsPill({ ens, truncate = true }: EnsPillProps) {
  const [copied, setCopied] = useState(false)

  const display = truncate && ens.length > 20 ? ens.slice(0, 16) + '...' : ens

  async function handleCopy() {
    await navigator.clipboard.writeText(ens)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-text-muted bg-panel border border-border-subtle rounded-md px-2 py-1">
      <span title={ens}>{display}</span>
      <button
        onClick={handleCopy}
        className="text-text-muted hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-verified rounded"
        aria-label="Copy ENS name"
      >
        {copied ? <Check size={11} className="text-accent-verified" /> : <Copy size={11} />}
      </button>
    </span>
  )
}

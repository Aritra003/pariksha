const COLORS: Record<string, string> = {
  India: 'bg-jurisdiction-india/10 text-jurisdiction-india border-jurisdiction-india/30',
  Singapore: 'bg-jurisdiction-singapore/10 text-jurisdiction-singapore border-jurisdiction-singapore/30',
  'UAE-DIFC': 'bg-jurisdiction-difc/10 text-jurisdiction-difc border-jurisdiction-difc/30',
  US: 'bg-jurisdiction-us/10 text-jurisdiction-us border-jurisdiction-us/30',
}

export function JurisdictionTag({ jurisdiction }: { jurisdiction: string }) {
  const cls = COLORS[jurisdiction] ?? 'bg-white/5 text-text-muted border-white/10'
  return (
    <span
      className={`inline-flex items-center font-mono text-xs font-medium px-2 py-0.5 rounded-[4px] border ${cls}`}
    >
      {jurisdiction}
    </span>
  )
}

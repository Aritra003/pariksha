import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function HeaderBand() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-10 border-b border-border-subtle bg-[#070710]">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link
          href="https://www.nyayamitraai.org"
          className="flex items-center gap-2 group"
        >
          <span className="font-display font-semibold text-sm text-text-primary tracking-tight leading-none">
            NyayaMitra
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-text-muted uppercase tracking-widest">
            AI
          </span>
        </Link>

        <span className="hidden md:inline font-mono text-[11px] text-text-muted">
          Pariksha · A NyayaMitra Product
        </span>

        <Link
          href="https://www.nyayamitraai.org"
          className="flex items-center gap-1 font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
        >
          Back to NyayaMitra
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

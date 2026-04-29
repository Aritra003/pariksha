import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .order('status', { ascending: false })
    .order('current_score', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[api/agents] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }

  // Aggregate stats
  const totalRuns = agents?.reduce((sum, a) => sum + (a.total_pariksha_runs ?? 0), 0) ?? 0
  const totalUsdc = agents?.reduce((sum, a) => sum + (a.lifetime_usdc_earned ?? 0), 0) ?? 0

  return NextResponse.json({
    agents: agents ?? [],
    stats: {
      agentCount: agents?.length ?? 0,
      totalParikshaRuns: totalRuns,
      totalLifetimeUsdc: totalUsdc,
    },
  })
}

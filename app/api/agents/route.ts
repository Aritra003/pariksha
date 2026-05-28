import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const typeParam = url.searchParams.get('type') ?? 'agent'

  let query = supabaseAdmin
    .from('agents')
    .select('*')
    .not('status', 'in', '("archived","pending_review","trust_failed")')
    // Hide unbenchmarked listed agents (placeholders with no score) from the
    // public grid. Kept condition: NOT(status='listed' AND current_score IS NULL),
    // expressed in PostgREST as: status != 'listed' OR current_score IS NOT NULL.
    .or('status.neq.listed,current_score.not.is.null')
    .order('status', { ascending: false })
    .order('current_score', { ascending: false, nullsFirst: false })

  if (typeParam !== 'all') {
    query = query.eq('type', typeParam)
  }

  const { data: agents, error } = await query

  if (error) {
    console.error('[api/agents] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }

  const totalRuns = agents?.reduce((sum, a) => sum + (a.total_pariksha_runs ?? 0), 0) ?? 0
  const totalUsdc = agents?.reduce((sum, a) => sum + (a.lifetime_usdc_earned ?? 0), 0) ?? 0

  return NextResponse.json({
    agents: agents ?? [],
    type: typeParam,
    stats: {
      agentCount: agents?.length ?? 0,
      totalParikshaRuns: totalRuns,
      totalLifetimeUsdc: totalUsdc,
    },
  })
}

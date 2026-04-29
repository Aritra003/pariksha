import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { ens: string } }
) {
  const ensName = decodeURIComponent(params.ens)

  const [agentRes, runsRes, badgesRes] = await Promise.all([
    supabaseAdmin.from('agents').select('*').eq('ens_name', ensName).single(),
    supabaseAdmin
      .from('pariksha_runs')
      .select('id, final_score, attestation_tx_hash, run_at')
      .eq('agent_ens', ensName)
      .order('run_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('badges')
      .select('*')
      .eq('agent_ens', ensName),
  ])

  if (agentRes.error || !agentRes.data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({
    agent: agentRes.data,
    scoreHistory: runsRes.data ?? [],
    badges: badgesRes.data ?? [],
  })
}

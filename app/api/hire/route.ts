import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  let body: {
    agentEns: string
    query: string
    buyerAddress: string
    paymentTxHash?: string
    usdcPaid?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentEns, query, buyerAddress, paymentTxHash, usdcPaid } = body

  if (!agentEns || !query || !buyerAddress) {
    return NextResponse.json(
      { error: 'agentEns, query, and buyerAddress are required' },
      { status: 400 }
    )
  }

  // Fetch agent
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('ens_name, jurisdiction, price_usdc, status')
    .eq('ens_name', agentEns)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Determine agent slug for proxy
  let slug = 'vidhi'
  if (agentEns.startsWith('raksha')) slug = 'raksha'
  else if (agentEns.startsWith('kosh')) slug = 'kosh'
  else if (agentEns.startsWith('sahayak')) slug = 'sahayak'

  // Resolve base URL from the incoming request (handles any port in dev)
  const host = request.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
  let response = ''

  try {
    const proxyRes = await fetch(`${baseUrl}/api/proxy/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        jurisdiction: agent.jurisdiction,
        ensName: agentEns,
      }),
    })

    if (proxyRes.ok) {
      const data = await proxyRes.json()
      response = data.response ?? ''
    } else {
      console.error(`[api/hire] proxy returned ${proxyRes.status}`)
      response = 'Agent temporarily unavailable. Please try again shortly.'
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[api/hire] proxy fetch error: ${msg}`)
    response = 'Agent temporarily unavailable. Please try again shortly.'
  }

  const actualUsdc = usdcPaid ?? agent.price_usdc

  // Insert hire record
  const { data: hire, error: hireErr } = await supabaseAdmin
    .from('hires')
    .insert({
      agent_ens: agentEns,
      buyer_address: buyerAddress,
      query,
      response,
      usdc_paid: actualUsdc,
      payment_tx_hash: paymentTxHash ?? null,
      attestation_tx_hash: null, // PROMPT-05 will wire KeeperHub attestation
    })
    .select('id')
    .single()

  if (hireErr) {
    console.error('[api/hire] insert error:', hireErr.message)
    // Return the response anyway — don't block the user
  }

  // Update agent counters
  const { data: current } = await supabaseAdmin
    .from('agents')
    .select('total_hires, lifetime_usdc_earned')
    .eq('ens_name', agentEns)
    .single()

  if (current) {
    await supabaseAdmin
      .from('agents')
      .update({
        total_hires: (current.total_hires ?? 0) + 1,
        lifetime_usdc_earned: (current.lifetime_usdc_earned ?? 0) + actualUsdc,
      })
      .eq('ens_name', agentEns)
  }

  return NextResponse.json({
    hireId: hire?.id ?? null,
    agentEns,
    response,
    usdcPaid: actualUsdc,
    // TODO PROMPT-05: attestationTxHash from KeeperHub
  })
}

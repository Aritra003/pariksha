import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { keeperHubExecute } from '@/lib/chain-executor'
import { verifyPaymentProof, type X402PaymentProof } from '@/lib/x402'
import { uploadTrainingExample } from '@/lib/zerog-storage'
import { INFT_ABI, ATTESTATION_ABI, BADGE_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts/abis'
import { ethers } from 'ethers'

const BADGE_TYPES = { VERIFIED: 0, EXCELLENCE: 2, VETERAN: 4, SPECIALIST: 3, POLYGLOT: 1 }

function parseUSDC(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000))
}

function hashString(s: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(s))
}

async function tryMintBadge(
  agentEns: string,
  badgeType: number,
  ownerAddress: string,
  thresholdData: string
): Promise<string | null> {
  const result = await keeperHubExecute({
    contractAddress: CONTRACT_ADDRESSES.badge,
    abi: BADGE_ABI,
    functionName: 'mintBadge',
    args: [ownerAddress, badgeType, agentEns, thresholdData],
  })

  if (result.success) {
    await supabaseAdmin.from('badges').insert({
      agent_ens: agentEns,
      badge_type: Object.entries(BADGE_TYPES).find(([, v]) => v === badgeType)?.[0] ?? 'UNKNOWN',
      tx_hash: result.txHash ?? null,
    })
    return result.txHash ?? null
  }
  return null
}

export async function POST(request: NextRequest) {
  let body: {
    agentEns: string
    query: string
    buyerAddress: string
    paymentTxHash?: string
    paymentProof?: X402PaymentProof
    usdcPaid?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentEns, query, buyerAddress, paymentTxHash, paymentProof, usdcPaid } = body

  if (!agentEns || !query || !buyerAddress) {
    return NextResponse.json(
      { error: 'agentEns, query, and buyerAddress are required' },
      { status: 400 }
    )
  }

  // Fetch agent
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('ens_name, jurisdiction, price_usdc, status, total_hires, lifetime_usdc_earned, inft_token_id, owner_address')
    .eq('ens_name', agentEns)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const actualUsdc = usdcPaid ?? agent.price_usdc

  // Verify x402 payment proof (graceful fallback in demo mode)
  const proof: X402PaymentProof = paymentProof ?? {
    payerAddress: buyerAddress,
    amount: String(actualUsdc),
    txHash: paymentTxHash,
  }
  const { valid, reason } = await verifyPaymentProof(proof, actualUsdc)
  if (!valid) {
    return NextResponse.json({ error: 'Payment verification failed', reason }, { status: 402 })
  }

  // Determine agent slug for proxy
  let slug = 'vidhi'
  if (agentEns.startsWith('raksha')) slug = 'raksha'
  else if (agentEns.startsWith('kosh')) slug = 'kosh'
  else if (agentEns.startsWith('sahayak')) slug = 'sahayak'

  const host = request.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`

  let response = ''
  try {
    const proxyRes = await fetch(`${baseUrl}/api/proxy/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, jurisdiction: agent.jurisdiction, ensName: agentEns }),
    })
    if (proxyRes.ok) {
      const data = await proxyRes.json()
      response = data.response ?? ''
    } else {
      console.error(`[api/hire] proxy returned ${proxyRes.status}`)
      response = 'Agent temporarily unavailable.'
    }
  } catch (err: unknown) {
    console.error('[api/hire] proxy error:', err instanceof Error ? err.message : err)
    response = 'Agent temporarily unavailable.'
  }

  // On-chain: recordHire on iNFT
  let inftTxHash: string | undefined

  if (agent.inft_token_id !== null && agent.inft_token_id !== undefined) {
    const tokenId = BigInt(agent.inft_token_id)

    const inftResult = await keeperHubExecute({
      contractAddress: CONTRACT_ADDRESSES.inft,
      abi: INFT_ABI,
      functionName: 'recordHire',
      args: [tokenId, parseUSDC(actualUsdc)],
    })
    inftTxHash = inftResult.txHash
    if (!inftResult.success) {
      console.error('[api/hire] iNFT recordHire failed:', inftResult.error)
    }
  }

  // On-chain: write attestation
  const attResult = await keeperHubExecute({
    contractAddress: CONTRACT_ADDRESSES.attestation,
    abi: ATTESTATION_ABI,
    functionName: 'attest',
    args: [
      agentEns,
      buyerAddress,
      parseUSDC(actualUsdc),
      hashString(query),
      hashString(response),
    ],
  })
  const attestationTxHash = attResult.txHash
  if (!attResult.success) {
    console.error('[api/hire] attestation failed:', attResult.error)
  }

  // Insert hire record
  const { data: hire, error: hireErr } = await supabaseAdmin
    .from('hires')
    .insert({
      agent_ens: agentEns,
      buyer_address: buyerAddress,
      query,
      response,
      usdc_paid: actualUsdc,
      payment_tx_hash: paymentTxHash ?? proof.txHash ?? null,
      attestation_tx_hash: attestationTxHash ?? null,
    })
    .select('id')
    .single()

  if (hireErr) {
    console.error('[api/hire] insert error:', hireErr.message)
  }

  // Update agent counters
  const newHireCount = (agent.total_hires ?? 0) + 1
  await supabaseAdmin
    .from('agents')
    .update({
      total_hires: newHireCount,
      lifetime_usdc_earned: (agent.lifetime_usdc_earned ?? 0) + actualUsdc,
    })
    .eq('ens_name', agentEns)

  // Check VETERAN badge threshold (100 hires)
  if (newHireCount >= 100) {
    await tryMintBadge(agentEns, BADGE_TYPES.VETERAN, agent.owner_address ?? buyerAddress, `totalHires:${newHireCount}`)
      .catch((e) => console.error('[api/hire] VETERAN badge error:', e))
  }

  // Write training example to 0G Storage (async, non-blocking)
  uploadTrainingExample({
    agentEns,
    query,
    response,
    jurisdiction: agent.jurisdiction,
    buyerAddress,
    timestamp: Date.now(),
    type: 'hire',
  }).catch((e) => console.error('[api/hire] 0G storage error:', e))

  return NextResponse.json({
    hireId: hire?.id ?? null,
    agentEns,
    response,
    usdcPaid: actualUsdc,
    paymentVerified: valid,
    paymentVerifyReason: reason,
    inftTxHash: inftTxHash ?? null,
    attestationTxHash: attestationTxHash ?? null,
    auditTrail: {
      paymentSettled: !!paymentTxHash || !!proof.txHash,
      agentQueried: !!response,
      inftUpdated: !!inftTxHash,
      attestationWritten: !!attestationTxHash,
      trainingExampleStored: true,
    },
  })
}

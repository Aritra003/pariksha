import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { ethers } from 'ethers'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPaymentProof, generate402Response, type X402PaymentProof } from '@/lib/x402'
import { keeperHubExecute } from '@/lib/chain-executor'
import { INFT_ABI, ATTESTATION_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts/abis'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? '0x3f308C4ddc76570737326d3bD828511A4853680c'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pariksha-brown.vercel.app'

const SLUG_UPSTREAM: Record<string, string | undefined> = {
  vidhi: process.env.NYAYAMITRA_VIDHI_PROXY_URL,
  kosh: process.env.NYAYAMITRA_KOSH_PROXY_URL,
  sahayak: process.env.NYAYAMITRA_SAHAYAK_PROXY_URL,
  raksha: process.env.NYAYAMITRA_RAKSHA_PROXY_URL,
}

function parseUSDC(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000))
}

function hashString(s: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(s))
}

// Resolve ENS name from route param (may be ENS or legacy slug)
function ensFromParam(agentParam: string, bodyEns?: string): string {
  if (bodyEns) return bodyEns
  if (agentParam.includes('.')) return agentParam
  return ''
}

// Derive NyayaMitra slug from ENS name or param
function slugFromParam(agentParam: string): string {
  if (!agentParam.includes('.')) return agentParam
  if (agentParam.startsWith('vidhi') || agentParam.startsWith('delhi')) return 'vidhi'
  if (agentParam.startsWith('kosh')) return 'kosh'
  if (agentParam.startsWith('sahayak')) return 'sahayak'
  if (agentParam.startsWith('raksha')) return 'raksha'
  return agentParam.split('.')[0]
}

async function getAgentByEns(ensName: string) {
  if (!ensName) return null
  const { data } = await supabaseAdmin
    .from('agents')
    .select('ens_name, jurisdiction, system_prompt, price_usdc, inft_token_id, owner_address')
    .eq('ens_name', ensName)
    .single()
  return data
}

async function callUpstream(
  agentSlug: string,
  query: string,
  jurisdiction: string,
  context?: string
): Promise<string | null> {
  const upstreamUrl = SLUG_UPSTREAM[agentSlug]
  if (!upstreamUrl) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    const res = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NYAYAMITRA_PROXY_API_KEY ?? '',
      },
      body: JSON.stringify({ query, jurisdiction, context }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (res.ok) {
      const data = await res.json()
      return data.response ?? JSON.stringify(data)
    }
    console.error(`[proxy/${agentSlug}] upstream ${res.status}`)
  } catch (err: unknown) {
    console.error(`[proxy/${agentSlug}] upstream error: ${err instanceof Error ? err.message : err}`)
  }
  return null
}

async function callAnthropic(systemPrompt: string, query: string, jurisdiction: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `[Jurisdiction: ${jurisdiction}]\n\n${query}` }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

// ── GET — return x402 Payment Required ─────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { agent: string } }
) {
  const agentParam = params.agent
  const ensName = ensFromParam(agentParam)

  // Look up agent price (default 0.05 USDC)
  let priceUsdc = 0.05
  if (ensName) {
    const agent = await getAgentByEns(ensName)
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    priceUsdc = agent.price_usdc ?? 0.05
  }

  const amountMicro = String(Math.round(priceUsdc * 1_000_000))
  const resourceUrl = `${APP_URL}/api/proxy/${agentParam}`

  return generate402Response({
    amount: amountMicro,
    recipient: TREASURY,
    description: `Pariksha legal AI hire — ${priceUsdc} USDC per query${ensName ? ` (${ensName})` : ''}`,
    resourceUrl,
  })
}

// ── POST — serve agent response, optionally recording hire on-chain ─────────

export async function POST(
  request: NextRequest,
  { params }: { params: { agent: string } }
) {
  let body: {
    query: string
    jurisdiction?: string
    context?: string
    ensName?: string
    buyer_wallet?: string
    buyer_address?: string
    payment_tx_hash?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    query,
    context,
    ensName: bodyEns,
    buyer_wallet,
    buyer_address,
    payment_tx_hash,
  } = body

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const agentParam = params.agent
  const ensName = ensFromParam(agentParam, bodyEns)
  const agentSlug = slugFromParam(agentParam)

  // Look up agent for jurisdiction / system_prompt
  const agentRow = ensName ? await getAgentByEns(ensName) : null
  const jurisdiction = body.jurisdiction ?? agentRow?.jurisdiction ?? 'India'
  const systemPrompt =
    agentRow?.system_prompt ??
    'You are a specialized legal AI agent. Provide accurate, jurisdiction-appropriate legal information. Always clarify you are not a substitute for qualified legal counsel.'

  // Call agent
  const upstream = await callUpstream(agentSlug, query, jurisdiction, context)
  let response: string
  try {
    response = upstream ?? (await callAnthropic(systemPrompt, query, jurisdiction))
  } catch (err: unknown) {
    console.error(`[proxy/${agentSlug}] Anthropic error: ${err instanceof Error ? err.message : err}`)
    return NextResponse.json({ error: 'Agent unavailable' }, { status: 503 })
  }

  const source = upstream ? 'nyayamitra' : 'anthropic-fallback'

  // ── Demo mode (no payment proof) ──────────────────────────────────────────
  if (!payment_tx_hash) {
    return NextResponse.json({
      response,
      source,
      demo_mode: true,
      message: 'Demo mode: pass payment_tx_hash (USDC transfer on Base Sepolia) for on-chain attestation.',
    })
  }

  // ── Paid mode — verify payment and record on-chain ────────────────────────
  const buyerAddress = buyer_wallet ?? buyer_address ?? ''
  const priceUsdc = agentRow?.price_usdc ?? 0.05

  const proof: X402PaymentProof = {
    payerAddress: buyerAddress,
    amount: String(priceUsdc),
    txHash: payment_tx_hash,
  }

  const { valid, reason } = await verifyPaymentProof(proof, priceUsdc)
  if (!valid) {
    return NextResponse.json({ error: 'Payment verification failed', reason }, { status: 402 })
  }

  // Record hire on iNFT
  let inftTxHash: string | null = null
  if (agentRow?.inft_token_id !== null && agentRow?.inft_token_id !== undefined) {
    const inftResult = await keeperHubExecute({
      contractAddress: CONTRACT_ADDRESSES.inft,
      abi: INFT_ABI,
      functionName: 'recordHire',
      args: [BigInt(agentRow.inft_token_id), parseUSDC(priceUsdc)],
    })
    inftTxHash = inftResult.txHash ?? null
    if (!inftResult.success) console.error('[proxy] iNFT recordHire failed:', inftResult.error)
  }

  // Write attestation
  const attResult = await keeperHubExecute({
    contractAddress: CONTRACT_ADDRESSES.attestation,
    abi: ATTESTATION_ABI,
    functionName: 'attest',
    args: [
      ensName || agentParam,
      buyerAddress || TREASURY,
      parseUSDC(priceUsdc),
      hashString(query),
      hashString(response),
    ],
  })
  const attestationTxHash = attResult.txHash ?? null

  // Insert hire record in DB
  await supabaseAdmin.from('hires').insert({
    agent_ens: ensName || agentParam,
    buyer_address: buyerAddress,
    query,
    response,
    usdc_paid: priceUsdc,
    payment_tx_hash,
    attestation_tx_hash: attestationTxHash,
  })

  // Update agent counters
  if (agentRow) {
    await supabaseAdmin
      .from('agents')
      .update({
        total_hires: (agentRow as unknown as { total_hires?: number }).total_hires ?? 0 + 1,
        lifetime_usdc_earned: ((agentRow as unknown as { lifetime_usdc_earned?: number }).lifetime_usdc_earned ?? 0) + priceUsdc,
      })
      .eq('ens_name', ensName)
  }

  return NextResponse.json({
    response,
    source,
    demo_mode: false,
    payment_verified: true,
    payment_verify_reason: reason,
    on_chain_attestation_tx: attestationTxHash,
    inft_tx: inftTxHash,
  })
}

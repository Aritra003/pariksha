import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { supabaseAdmin } from '@/lib/supabase'
import { INFT_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts/abis'

export const dynamic = 'force-dynamic'

const JURISDICTION_SUFFIX: Record<string, string> = {
  India: 'in',
  Singapore: 'sg',
  'UAE-DIFC': 'ae',
  US: 'us',
}

const PRICE_OPTIONS = [0.01, 0.05, 0.10]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
}

export async function POST(request: NextRequest) {
  let body: {
    agentName: string
    jurisdiction: string
    specialty: string
    systemPrompt: string
    priceUsdc: number
    ownerAddress: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentName, jurisdiction, specialty, systemPrompt, priceUsdc, ownerAddress } = body

  // Validate required fields
  if (!agentName || !jurisdiction || !specialty || !systemPrompt || !ownerAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (agentName.length < 3 || agentName.length > 30) {
    return NextResponse.json({ error: 'agentName must be 3–30 chars' }, { status: 400 })
  }
  if (specialty.length < 10 || specialty.length > 100) {
    return NextResponse.json({ error: 'specialty must be 10–100 chars' }, { status: 400 })
  }
  if (systemPrompt.length < 50 || systemPrompt.length > 2000) {
    return NextResponse.json({ error: 'systemPrompt must be 50–2000 chars' }, { status: 400 })
  }
  if (!PRICE_OPTIONS.includes(priceUsdc)) {
    return NextResponse.json({ error: 'priceUsdc must be 0.01, 0.05, or 0.10' }, { status: 400 })
  }
  if (!JURISDICTION_SUFFIX[jurisdiction]) {
    return NextResponse.json({ error: 'Invalid jurisdiction' }, { status: 400 })
  }
  if (!ethers.isAddress(ownerAddress)) {
    return NextResponse.json({ error: 'Invalid ownerAddress' }, { status: 400 })
  }

  const slug = slugify(agentName)
  if (!slug) {
    return NextResponse.json({ error: 'Agent name produces an empty slug' }, { status: 400 })
  }

  const suffix = JURISDICTION_SUFFIX[jurisdiction]
  const ensName = `${slug}.${suffix}.pariksha.eth`

  // Check uniqueness
  const { data: existing } = await supabaseAdmin
    .from('agents')
    .select('ens_name')
    .eq('ens_name', ensName)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: `ENS ${ensName} is already taken` }, { status: 409 })
  }

  // Mint iNFT on 0G Galileo
  const pk = process.env.DEPLOYER_PRIVATE_KEY
  if (!pk) {
    return NextResponse.json({ error: 'Backend signer not configured' }, { status: 503 })
  }

  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
  )
  const signer = new ethers.Wallet(pk, provider)
  const contract = new ethers.Contract(CONTRACT_ADDRESSES.inft, INFT_ABI, signer)

  let tokenId: number
  let txHash: string

  try {
    const tx: ethers.TransactionResponse = await contract['mint'](
      ownerAddress,
      ensName,
      jurisdiction,
      specialty,
      ''
    )
    const receipt = await tx.wait()
    txHash = tx.hash

    // Extract tokenId from ERC-721 Transfer event (from=0x0)
    const transferSig = ethers.id('Transfer(address,address,uint256)')
    const zeroTopic = ethers.zeroPadValue('0x00', 32)
    const mintLog = receipt?.logs.find(
      (l: { topics: readonly string[] }) => l.topics[0] === transferSig && l.topics[1] === zeroTopic
    )
    if (mintLog) {
      tokenId = Number(BigInt(mintLog.topics[3]))
    } else {
      // Fallback: totalSupply - 1
      const ts: bigint = await contract['totalSupply']()
      tokenId = Number(ts) - 1
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[agents/mint] on-chain mint failed:', msg)
    return NextResponse.json({ error: `On-chain mint failed: ${msg}` }, { status: 500 })
  }

  // Insert agent into Supabase
  const { error: insertErr } = await supabaseAdmin.from('agents').insert({
    ens_name: ensName,
    display_name: agentName,
    jurisdiction,
    specialty,
    system_prompt: systemPrompt,
    price_usdc: priceUsdc,
    owner_address: ownerAddress,
    inft_token_id: tokenId,
    inft_address: CONTRACT_ADDRESSES.inft,
    backend_endpoint: 'https://pariksha-brown.vercel.app/api/proxy/anthropic-fallback',
    status: 'community_minted',
    minted_by_user: true,
    total_pariksha_runs: 0,
    total_hires: 0,
    current_score: null,
  })

  if (insertErr) {
    console.error('[agents/mint] Supabase insert error:', insertErr.message)
    // Token is already minted on-chain — return partial success so user can record the tx
    return NextResponse.json({
      ensName,
      tokenId,
      txHash,
      warning: 'Agent minted on-chain but DB record failed. Contact support with your tx hash.',
    })
  }

  console.log(`[agents/mint] Minted ${ensName} (token #${tokenId}) for ${ownerAddress} — tx: ${txHash}`)

  return NextResponse.json({ ensName, tokenId, txHash })
}

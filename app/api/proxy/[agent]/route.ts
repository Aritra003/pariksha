import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AGENT_URL_MAP: Record<string, string | undefined> = {
  vidhi: process.env.NYAYAMITRA_VIDHI_PROXY_URL,
  kosh: process.env.NYAYAMITRA_KOSH_PROXY_URL,
  sahayak: process.env.NYAYAMITRA_SAHAYAK_PROXY_URL,
  raksha: process.env.NYAYAMITRA_RAKSHA_PROXY_URL,
}

// Derives agent slug from the ENS name (e.g. "delhi.in.pariksha.eth" → "vidhi")
function ensToSlug(ensName: string): string {
  if (ensName.startsWith('raksha')) return 'raksha'
  if (ensName.startsWith('kosh')) return 'kosh'
  if (ensName.startsWith('sahayak')) return 'sahayak'
  return 'vidhi'
}

async function fallbackToAnthropic(
  systemPrompt: string,
  query: string,
  jurisdiction: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `[Jurisdiction: ${jurisdiction}]\n\n${query}` }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

export async function POST(
  request: NextRequest,
  { params }: { params: { agent: string } }
) {
  let body: { query: string; jurisdiction: string; context?: string; ensName?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { query, jurisdiction, context, ensName } = body

  if (!query || !jurisdiction) {
    return NextResponse.json({ error: 'query and jurisdiction are required' }, { status: 400 })
  }

  const agentSlug = params.agent
  const upstreamUrl = AGENT_URL_MAP[agentSlug]

  // Try NyayaMitra upstream first
  if (upstreamUrl) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NYAYAMITRA_PROXY_API_KEY ?? '',
        },
        body: JSON.stringify({ query, jurisdiction, context }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (upstream.ok) {
        const data = await upstream.json()
        return NextResponse.json({ response: data.response ?? data, source: 'nyayamitra' })
      }

      console.error(`[proxy/${agentSlug}] upstream returned ${upstream.status}, falling back`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[proxy/${agentSlug}] upstream fetch error: ${msg}, falling back`)
    }
  }

  // Fallback: fetch system_prompt from DB and call Anthropic directly
  const lookupEns = ensName ?? ''
  let systemPrompt =
    "You are a specialized legal AI agent. Provide accurate, jurisdiction-appropriate legal information. Always clarify you are not a substitute for qualified legal counsel."

  if (lookupEns) {
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('system_prompt')
      .eq('ens_name', lookupEns)
      .single()

    if (agent?.system_prompt) systemPrompt = agent.system_prompt
  }

  try {
    const response = await fallbackToAnthropic(systemPrompt, query, jurisdiction)
    return NextResponse.json({ response, source: 'anthropic-fallback' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[proxy/${agentSlug}] Anthropic fallback error: ${msg}`)
    return NextResponse.json({ error: 'Agent unavailable' }, { status: 503 })
  }
}

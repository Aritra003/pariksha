import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// ── Tool definitions ─────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'legal_research',
    description:
      'Jurisdiction-grounded legal research from Vidhi agents. Covers Delhi HC commercial litigation (IN, IN-*), SIAC arbitration (SG), DIFC commercial contracts (AE-DIFC), UAE Federal civil & commercial (AE), US commercial generalist (US), Delaware corporate & US federal securities specialist (US-DE), England & Wales commercial (UK), South Korea commercial (KR), Bahrain (BH), Qatar (QA), Saudi Arabia (SA), Israel (IL), and EU-level law (EU). Returns analysis with citations. 0.05 USDC per call, settled via x402 on Base Sepolia. Demo mode available without payment, rate-limited.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The legal research question.',
          maxLength: 500,
        },
        jurisdiction: {
          type: 'string',
          enum: ['IN', 'IN-DL', 'IN-MH', 'SG', 'AE-DIFC', 'AE', 'US', 'US-DE', 'UK', 'KR', 'BH', 'QA', 'SA', 'IL', 'EU'],
          description: 'Jurisdiction code. IN/IN-* → Delhi HC Vidhi. SG → Singapore. AE-DIFC → DIFC. AE → UAE Federal. US → US Commercial (generalist). US-DE → Delaware corporate & federal securities (specialist). UK → England & Wales. KR → South Korea. BH → Bahrain. QA → Qatar. SA → Saudi Arabia. IL → Israel. EU → EU-level law (not member-state law).',
        },
        court_level: {
          type: 'string',
          enum: ['supreme', 'high', 'sessions', 'district'],
          description: 'Optional court-level filter for the research.',
        },
        output_format: {
          type: 'string',
          enum: ['summary', 'detailed', 'citations_only'],
          default: 'summary',
          description: 'Response shape. Defaults to summary.',
        },
        payment_tx_hash: {
          type: 'string',
          description: 'USDC transfer tx hash on Base Sepolia (recipient 0x3f308C4ddc76570737326d3bD828511A4853680c). Omit for demo mode.',
        },
      },
      required: ['query', 'jurisdiction'],
    },
  },
  {
    name: 'precedent_lookup',
    description:
      'Verified case-law citation lookup from Kosh agent. Never returns unverified citations. Indian case law focus (Delhi HC + Supreme Court). 0.05 USDC per call, settled via x402 on Base Sepolia.',
    inputSchema: {
      type: 'object',
      properties: {
        legal_question: {
          type: 'string',
          description: 'The legal question or topic to find precedents for.',
        },
        jurisdiction: {
          type: 'string',
          description: 'Jurisdiction code (e.g. IN, IN-DL).',
        },
        section: {
          type: 'string',
          description: "Statute section reference (e.g. 'Section 138 NI Act').",
        },
        date_range: {
          type: 'object',
          description: 'Optional date range to constrain precedent search.',
          properties: {
            from: { type: 'string', description: 'YYYY-MM-DD lower bound.' },
            to: { type: 'string', description: 'YYYY-MM-DD upper bound.' },
          },
        },
        payment_tx_hash: {
          type: 'string',
          description: 'USDC transfer tx hash on Base Sepolia. Omit for demo mode.',
        },
      },
      required: ['legal_question', 'jurisdiction'],
    },
  },
  {
    name: 'legal_qa',
    description:
      'Plain-language legal Q&A from Sahayak agent. Indian law focus by default. Fastest and cheapest tool. 0.01 USDC per call, settled via x402 on Base Sepolia.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The plain-language legal question.',
        },
        jurisdiction: {
          type: 'string',
          default: 'IN',
          description: 'Jurisdiction code. Defaults to IN.',
        },
        context: {
          type: 'string',
          description: 'Optional context — a contract clause, document snippet, or background fact.',
        },
        payment_tx_hash: {
          type: 'string',
          description: 'USDC transfer tx hash on Base Sepolia. Omit for demo mode.',
        },
      },
      required: ['question'],
    },
  },
]

// ── Agent ENS mapping ────────────────────────────────────────────────────

function vidhiEnsForJurisdiction(jurisdiction: string): string | null {
  const j = jurisdiction.toUpperCase()
  if (j === 'IN' || j.startsWith('IN-')) return 'delhi.in.pariksha.eth'
  if (j === 'SG') return 'vidhi.sg.pariksha.eth'
  if (j === 'AE-DIFC') return 'vidhi.ae.pariksha.eth'
  if (j === 'AE') return 'uae-federal.ae.pariksha.eth'
  if (j === 'US') return 'vidhi.us.pariksha.eth'
  if (j === 'US-DE') return 'delaware.us.pariksha.eth'
  if (j === 'UK') return 'london.uk.pariksha.eth'
  if (j === 'KR') return 'seoul.kr.pariksha.eth'
  if (j === 'BH') return 'manama.bh.pariksha.eth'
  if (j === 'QA') return 'doha.qa.pariksha.eth'
  if (j === 'SA') return 'riyadh.sa.pariksha.eth'
  if (j === 'IL') return 'tel-aviv.il.pariksha.eth'
  if (j === 'EU') return 'eu.pariksha.eth'
  return null
}

// ── Demo-mode rate limit (durable, Supabase-backed) ──────────────────────

const DEMO_LIMIT_PER_DAY = 5

function getClientIP(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

async function isDemoRateLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabaseAdmin
    .from('mcp_demo_calls')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .gte('called_at', since)
  if (error) {
    console.error('[mcp] rate-limit query error:', error.message)
    return false
  }
  return (count ?? 0) >= DEMO_LIMIT_PER_DAY
}

async function recordDemoCall(ip: string, toolName: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('mcp_demo_calls')
    .insert({ ip_address: ip, tool_name: toolName })
  if (error) console.error('[mcp] rate-limit insert error:', error.message)
}

// ── Proxy bridge ─────────────────────────────────────────────────────────

async function callProxy(
  req: NextRequest,
  slug: string,
  body: Record<string, unknown>
): Promise<{ response: string; demo_mode?: boolean; on_chain_attestation_tx?: string | null; inft_tx?: string | null }> {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`
  const res = await fetch(`${baseUrl}/api/proxy/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({} as Record<string, unknown>))
  if (!res.ok) {
    const errMsg = (data as { error?: string }).error ?? 'unknown error'
    const reason = (data as { reason?: string }).reason ? ` (${(data as { reason?: string }).reason})` : ''
    throw new Error(`Proxy ${slug} ${res.status}: ${errMsg}${reason}`)
  }
  return data as { response: string; demo_mode?: boolean; on_chain_attestation_tx?: string | null; inft_tx?: string | null }
}

// ── Tool dispatcher ──────────────────────────────────────────────────────

const DEMO_PREFIX =
  '[DEMO MODE — no payment verified. For production use, settle USDC via x402 and pass payment_tx_hash.]\n\n'

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

async function executeTool(req: NextRequest, name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const paymentTxHash = typeof args.payment_tx_hash === 'string' ? args.payment_tx_hash : undefined
  const isDemoMode = !paymentTxHash
  const ip = getClientIP(req)

  if (isDemoMode) {
    if (await isDemoRateLimited(ip)) {
      return {
        content: [
          {
            type: 'text',
            text: `Rate limit exceeded: demo mode allows ${DEMO_LIMIT_PER_DAY} calls per IP per 24 hours. To continue, settle a USDC transfer on Base Sepolia (recipient 0x3f308C4ddc76570737326d3bD828511A4853680c) and pass the tx hash as payment_tx_hash.`,
          },
        ],
        isError: true,
      }
    }
    await recordDemoCall(ip, name)
  }

  let slug: string
  let ens: string
  let proxyBody: Record<string, unknown>

  try {
    if (name === 'legal_research') {
      const query = args.query as string
      const jurisdiction = args.jurisdiction as string
      if (!query || !jurisdiction) {
        return {
          content: [{ type: 'text', text: 'legal_research requires `query` and `jurisdiction`.' }],
          isError: true,
        }
      }
      if (query.length > 500) {
        return {
          content: [{ type: 'text', text: 'legal_research `query` exceeds 500 character limit.' }],
          isError: true,
        }
      }
      const resolved = vidhiEnsForJurisdiction(jurisdiction)
      if (!resolved) {
        return {
          content: [
            {
              type: 'text',
              text: `Unsupported jurisdiction: ${jurisdiction}. Supported: IN, IN-*, SG, AE-DIFC, AE, US, UK, KR, BH, QA, SA, IL, EU.`,
            },
          ],
          isError: true,
        }
      }
      slug = 'vidhi'
      ens = resolved
      const courtLevel = (args.court_level as string | undefined) ?? 'any'
      const outputFormat = (args.output_format as string | undefined) ?? 'summary'
      const hint = `[Filter — jurisdiction: ${jurisdiction}, court_level: ${courtLevel}, output_format: ${outputFormat}]`
      proxyBody = {
        query: `${query}\n\n${hint}`,
        jurisdiction,
        ensName: ens,
        payment_tx_hash: paymentTxHash,
      }
    } else if (name === 'precedent_lookup') {
      const legalQuestion = args.legal_question as string
      const jurisdiction = args.jurisdiction as string
      if (!legalQuestion || !jurisdiction) {
        return {
          content: [
            { type: 'text', text: 'precedent_lookup requires `legal_question` and `jurisdiction`.' },
          ],
          isError: true,
        }
      }
      slug = 'kosh'
      ens = 'kosh.in.pariksha.eth'
      const section = args.section ? `Section: ${args.section as string}` : ''
      const dr = args.date_range as { from?: string; to?: string } | undefined
      const dateRange = dr && (dr.from || dr.to) ? `Date range: ${dr.from ?? ''} to ${dr.to ?? ''}` : ''
      const context = [section, dateRange].filter(Boolean).join(' | ')
      proxyBody = {
        query: legalQuestion,
        jurisdiction,
        context: context || undefined,
        ensName: ens,
        payment_tx_hash: paymentTxHash,
      }
    } else if (name === 'legal_qa') {
      const question = args.question as string
      if (!question) {
        return {
          content: [{ type: 'text', text: 'legal_qa requires `question`.' }],
          isError: true,
        }
      }
      slug = 'sahayak'
      ens = 'sahayak.in.pariksha.eth'
      proxyBody = {
        query: question,
        jurisdiction: (args.jurisdiction as string | undefined) ?? 'IN',
        context: (args.context as string | undefined) ?? undefined,
        ensName: ens,
        payment_tx_hash: paymentTxHash,
      }
    } else {
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      }
    }

    const result = await callProxy(req, slug, proxyBody)

    let text = result.response ?? '(empty response)'
    if (isDemoMode || result.demo_mode) {
      text = DEMO_PREFIX + text
    } else if (result.on_chain_attestation_tx) {
      text = `${text}\n\n[On-chain attestation tx: ${result.on_chain_attestation_tx}${result.inft_tx ? ` | iNFT tx: ${result.inft_tx}` : ''}]`
    }
    return { content: [{ type: 'text', text }] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `Tool execution error: ${message}` }],
      isError: true,
    }
  }
}

// ── JSON-RPC POST handler ────────────────────────────────────────────────

type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }

export async function POST(req: NextRequest) {
  let body: JsonRpcRequest
  try {
    body = (await req.json()) as JsonRpcRequest
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400 }
    )
  }

  const id = body.id ?? null
  const method = body.method
  const params = (body.params ?? {}) as Record<string, unknown>

  try {
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'pariksha-mcp', version: '1.0.0' },
        },
      })
    }

    if (method === 'notifications/initialized' || method === 'initialized') {
      return new NextResponse(null, { status: 204 })
    }

    if (method === 'tools/list') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } })
    }

    if (method === 'tools/call') {
      const toolName = params.name as string
      const toolArgs = (params.arguments as Record<string, unknown>) ?? {}
      const result = await executeTool(req, toolName, toolArgs)
      return NextResponse.json({ jsonrpc: '2.0', id, result })
    }

    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} })
    }

    return NextResponse.json(
      { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } },
      { status: 404 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[mcp] internal error:', message)
    return NextResponse.json(
      { jsonrpc: '2.0', id, error: { code: -32603, message: `Internal error: ${message}` } },
      { status: 500 }
    )
  }
}

// ── GET — human/discovery-friendly endpoint info ─────────────────────────

export async function GET() {
  return NextResponse.json({
    name: 'pariksha-mcp',
    version: '1.0.0',
    description: 'Pariksha MCP server — x402-paid legal AI tools',
    protocol: 'MCP 2025-03-26',
    transport: 'http-jsonrpc',
    endpoint: 'POST /api/mcp',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    payment: {
      protocol: 'x402',
      chain: 'base-sepolia',
      chain_id: 84532,
      token: 'USDC',
      token_address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      recipient: '0x3f308C4ddc76570737326d3bD828511A4853680c',
      mode: 'payment-as-input',
      note: `Pass payment_tx_hash in tool arguments after settling USDC. Demo mode (no payment_tx_hash) is rate-limited to ${DEMO_LIMIT_PER_DAY} calls per IP per 24h.`,
    },
    skill_manifest: '/skill.md',
    ai_agent: '/.well-known/ai-agent.json',
  })
}

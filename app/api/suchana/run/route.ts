import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin, supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SUCHANA_SYSTEM_PROMPT = `You are Suchana, the daily research scout for Pariksha. Your role is to synthesise recent legal developments across four jurisdictions: India, Singapore, UAE-DIFC, and US.

Based on your training knowledge and available information, identify noteworthy legal developments, regulatory changes, or significant judgments. Present structured findings that legal professionals would find actionable.

Return ONLY valid JSON with no markdown in this exact format:
{
  "findings": [
    {
      "jurisdiction": "India|Singapore|UAE-DIFC|US",
      "category": "judgment|regulation|policy|treaty",
      "title": "Brief headline",
      "summary": "2-3 sentence summary",
      "relevance": "Why this matters for commercial practice"
    }
  ],
  "scoutedAt": "<ISO timestamp>",
  "note": "Brief note on data freshness"
}`

export async function POST() {
  let findings: unknown[] = []
  let rawResponse = ''

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SUCHANA_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            'Generate a structured daily legal research digest covering India, Singapore, UAE-DIFC, and US commercial law developments. Focus on matters relevant to commercial litigation, arbitration, and corporate governance.',
        },
      ],
    })

    const block = message.content[0]
    rawResponse = block.type === 'text' ? block.text : ''

    const clean = rawResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(clean)
    findings = parsed.findings ?? []
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[suchana/run] Anthropic call failed:', msg)
    // Return empty findings rather than crash
    findings = []
  }

  if (findings.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Suchana returned no findings this run.',
      findings: [],
    })
  }

  // Store findings as training data for Suchana agent
  const corpusVersion = `v-${new Date().toISOString().slice(0, 10)}`

  try {
    await supabaseAdmin.from('training_data').insert({
      agent_ens: 'suchana.in.pariksha.eth',
      query: 'Daily legal research digest',
      response: JSON.stringify(findings),
      feedback_score: null,
      zerog_storage_pointer: null,
    })

    // Update Suchana corpus version + all agents to signal fresh data
    const { data: suchanaAgents } = await supabase
      .from('agents')
      .select('ens_name')

    if (suchanaAgents && suchanaAgents.length > 0) {
      await supabaseAdmin
        .from('agents')
        .update({ corpus_version: corpusVersion })
        .eq('ens_name', 'suchana.in.pariksha.eth')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[suchana/run] DB write error:', msg)
    // Don't fail the response — findings were generated
  }

  return NextResponse.json({
    success: true,
    corpusVersion,
    findingsCount: findings.length,
    findings,
  })
}

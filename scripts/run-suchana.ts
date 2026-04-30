/**
 * run-suchana.ts — generates fresh Suchana findings and updates DB timestamps
 * Run: npx tsx scripts/run-suchana.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

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

async function main() {
  console.log('=== Running Suchana ===')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SUCHANA_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: 'Generate a structured daily legal research digest covering India, Singapore, UAE-DIFC, and US commercial law developments. Focus on matters relevant to commercial litigation, arbitration, and corporate governance.',
    }],
  })

  const block = message.content[0]
  const raw = block.type === 'text' ? block.text : ''
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const parsed = JSON.parse(clean)
  const findings = parsed.findings ?? []

  console.log(`Found ${findings.length} findings:`)
  findings.forEach((f: { jurisdiction: string; category: string; title: string }) => {
    console.log(`  [${f.jurisdiction}/${f.category}] ${f.title}`)
  })

  const corpusVersion = `v-${new Date().toISOString().slice(0, 10)}`

  // Insert training data
  const { error: tdErr } = await supabase.from('training_data').insert({
    agent_ens: 'suchana.in.pariksha.eth',
    query: 'Daily legal research digest',
    response: JSON.stringify(findings),
    feedback_score: null,
    zerog_storage_pointer: null,
  })
  if (tdErr) console.warn('  training_data insert:', tdErr.message)
  else console.log('  ✓ training data saved')

  // Update suchana agent corpus version
  const { error: svErr } = await supabase
    .from('agents')
    .update({ corpus_version: corpusVersion })
    .eq('ens_name', 'suchana.in.pariksha.eth')
  if (svErr) console.warn('  corpus_version update:', svErr.message)
  else console.log(`  ✓ corpus_version → ${corpusVersion}`)

  // Update last_suchana_run on all demo agents to now
  const DEMO_AGENTS = [
    'delhi.in.pariksha.eth',
    'vidhi.sg.pariksha.eth',
    'vidhi.ae.pariksha.eth',
    'vidhi.us.pariksha.eth',
  ]

  for (const ens of DEMO_AGENTS) {
    // Try updating last_suchana_run if the column exists
    const { error } = await supabase
      .from('agents')
      .update({ last_suchana_run: new Date().toISOString() })
      .eq('ens_name', ens)

    if (error && !error.message.includes('column')) {
      console.warn(`  ${ens}: ${error.message}`)
    } else if (!error) {
      console.log(`  ✓ ${ens} last_suchana_run updated`)
    }
  }

  console.log('\nDone.')
  console.log(`Corpus version: ${corpusVersion}`)
  console.log(`Findings: ${findings.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })

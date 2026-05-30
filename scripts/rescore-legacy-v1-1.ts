/**
 * Re-score legacy v1.0.0 agents at engine v1.1.0 methodology
 * (3-sample mean, variance-aware). One agent per invocation, --agent flag.
 *
 * Constraints (same as score-london-uk.ts / score-seoul-kr.ts / score-eu.ts):
 *   - NO on-chain calls.
 *   - NO status change. Each agent keeps its current status ('listed' or
 *     'trust_grandfathered').
 *   - NO git commit.
 *   - DB writes (apply mode): one pariksha_runs row with variance_*+sample_count
 *     + agents.{current_score, total_pariksha_runs}. Nothing else.
 *   - Dry-run default. --apply commits.
 *
 * Usage:
 *   npx tsx scripts/rescore-legacy-v1-1.ts --agent delhi.in.pariksha.eth
 *   npx tsx scripts/rescore-legacy-v1-1.ts --agent delhi.in.pariksha.eth --apply
 *
 * Bank-path map is hard-coded below — keep it in sync with the agent roster.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'fs'

const SAMPLE_COUNT = 3
const RANGE_FLAG_THRESHOLD = 15

const AGENT_BANK_MAP: Record<string, string> = {
  'delhi.in.pariksha.eth':    'pariksha-benchmark/questions/v1.0.0/india.json',
  'kosh.in.pariksha.eth':     'pariksha-benchmark/questions/v1.0.0/india.json',
  'sahayak.in.pariksha.eth':  'pariksha-benchmark/questions/v1.0.0/india.json',
  'vidhi.sg.pariksha.eth':    'pariksha-benchmark/questions/v1.0.0/singapore.json',
  'vidhi.ae.pariksha.eth':    'pariksha-benchmark/questions/v1.0.0/uae-difc.json',
  'vidhi.us.pariksha.eth':    'pariksha-benchmark/questions/v1.0.0/us-generalist.json',
  'delaware.us.pariksha.eth': 'pariksha-benchmark/questions/v1.0.0/us-delaware-federal.json',
}

interface ParikshaQuestion {
  id: string
  question: string
  goldenAnswer: string
  category: string
}

interface BankQuestion extends ParikshaQuestion {
  jurisdiction?: string
  expected_topics?: string[]
  difficulty?: string
  last_verified?: string
  verification?: unknown
}

function parseArgs(argv: string[]): { agent: string; apply: boolean } {
  const apply = argv.includes('--apply')
  const idx = argv.indexOf('--agent')
  if (idx === -1 || !argv[idx + 1]) {
    console.error('Usage: rescore-legacy-v1-1.ts --agent <ens.pariksha.eth> [--apply]')
    process.exit(2)
  }
  return { agent: argv[idx + 1], apply }
}

async function main() {
  const { agent: AGENT_ENS, apply: APPLY } = parseArgs(process.argv)
  const BANK_PATH = AGENT_BANK_MAP[AGENT_ENS]
  if (!BANK_PATH) {
    console.error(`No bank mapping for agent '${AGENT_ENS}'. Known agents:`)
    for (const k of Object.keys(AGENT_BANK_MAP)) console.error('  -', k)
    process.exit(2)
  }

  const { scoreWithVariance } = await import('../lib/pariksha-engine')
  const { supabaseAdmin } = await import('../lib/supabase')

  const bank = JSON.parse(readFileSync(BANK_PATH, 'utf-8')) as {
    version: string
    jurisdiction_code: string
    agent_focus?: string
    questions: BankQuestion[]
  }
  const questions: ParikshaQuestion[] = bank.questions.map((q) => ({
    id: q.id,
    question: q.question,
    goldenAnswer: q.goldenAnswer,
    category: q.category,
  }))

  console.log(`\n=== Rescore ${AGENT_ENS} ${APPLY ? '(APPLY)' : '(DRY-RUN)'} — engine v1.1.0 ===\n`)
  console.log(`Bank source:  ${BANK_PATH}`)
  console.log(`Bank version: ${bank.version} (${bank.jurisdiction_code})  agent_focus=${bank.agent_focus ?? '(unset)'}`)
  console.log(`Methodology:  scoreWithVariance, sampleCount = ${SAMPLE_COUNT}`)
  console.log(`Questions:    ${questions.length} (stripped to ParikshaQuestion shape)\n`)

  const { data: before, error: beforeErr } = await supabaseAdmin
    .from('agents')
    .select('ens_name, status, current_score, total_pariksha_runs, jurisdiction, backend_endpoint, system_prompt')
    .eq('ens_name', AGENT_ENS)
    .single()

  if (beforeErr || !before) {
    console.error(`Agent ${AGENT_ENS} not found:`, beforeErr?.message)
    process.exit(1)
  }
  if (!before.system_prompt) {
    console.error(`Agent ${AGENT_ENS} has no system_prompt. Nothing to score.`)
    process.exit(1)
  }

  const legacyScore = before.current_score
  console.log('Agent state before:')
  console.log(`  status:              ${before.status}`)
  console.log(`  jurisdiction:        ${before.jurisdiction}`)
  console.log(`  current_score:       ${legacyScore} (legacy single-sample)`)
  console.log(`  total_pariksha_runs: ${before.total_pariksha_runs}`)
  console.log(`  backend_endpoint:    ${before.backend_endpoint || '(null — Anthropic-only fallback path)'}`)
  console.log(`  system_prompt:       ${before.system_prompt.length} chars`)

  console.log(`\nRunning ${SAMPLE_COUNT}-sample benchmark via scoreWithVariance…`)
  const startMs = Date.now()
  const v = await scoreWithVariance(AGENT_ENS, questions, SAMPLE_COUNT)
  const elapsedMs = Date.now() - startMs

  // Per-sample × per-question table
  console.log('\n=== Per-sample × per-question scores ===\n')
  const header = ['question', ...v.runs.map((_, i) => `run${i + 1}`), 'mean', 'range']
  console.log(`  ${header.map((h) => h.padEnd(10)).join(' ')}`)
  console.log(`  ${header.map(() => '----------').join(' ')}`)
  const flagged: { qid: string; range: number; runs: number[] }[] = []
  for (const q of questions) {
    const perRun = v.runs.map((r) => {
      const found = r.perQuestionScores.find((p) => p.questionId === q.id)
      return found ? Number(found.score) : NaN
    })
    const meanEntry = v.meanPerQuestion.find((m) => m.questionId === q.id)
    const validRuns = perRun.filter((n) => !Number.isNaN(n))
    const range = validRuns.length > 0 ? Math.max(...validRuns) - Math.min(...validRuns) : 0
    if (range > RANGE_FLAG_THRESHOLD) flagged.push({ qid: q.id, range, runs: perRun })
    const row = [
      q.id,
      ...perRun.map((n) => (Number.isNaN(n) ? '—' : String(n))),
      meanEntry ? meanEntry.meanScore.toFixed(1) : '—',
      String(range),
    ]
    console.log(`  ${row.map((c) => c.padEnd(10)).join(' ')}`)
  }

  const aggregateRange = Math.round((v.maxFinalScore - v.minFinalScore) * 10) / 10
  const delta = legacyScore != null ? Math.round((v.meanFinalScore - legacyScore) * 10) / 10 : null

  console.log('\n=== Variance aggregate ===')
  console.log(`  per-sample finals: ${v.runs.map((r) => r.finalScore).join(', ')}`)
  console.log(`  mean:              ${v.meanFinalScore}`)
  console.log(`  min:               ${v.minFinalScore}`)
  console.log(`  max:               ${v.maxFinalScore}`)
  console.log(`  range:             ${aggregateRange}`)
  console.log(`  std (n-1):         ${v.stdFinalScore}`)
  console.log(`  sample_count:      ${v.sampleCount}`)
  console.log(`  elapsed:           ${(elapsedMs / 1000).toFixed(1)}s`)

  console.log('\n=== Delta vs legacy ===')
  console.log(`  legacy single-sample: ${legacyScore}`)
  console.log(`  v1.1.0 3-sample mean: ${v.meanFinalScore}`)
  console.log(`  delta:                ${delta === null ? 'n/a' : (delta >= 0 ? `+${delta}` : `${delta}`)}`)

  console.log('\n=== Per-question variance flag ===')
  if (flagged.length === 0) {
    console.log(`  No question has per-sample range > ${RANGE_FLAG_THRESHOLD}.`)
  } else {
    console.log(`  ⚠ ${flagged.length} question(s) with range > ${RANGE_FLAG_THRESHOLD} — same pattern as London ew-001 / Seoul kr-001:`)
    for (const f of flagged) {
      console.log(`    - ${f.qid}: runs=[${f.runs.join(', ')}] range=${f.range}`)
    }
  }

  // Machine-readable summary line for the bundled-run aggregator to grep.
  const flaggedIds = flagged.map((f) => `${f.qid}(r=${f.range})`).join(';')
  console.log(
    `\nSUMMARY agent=${AGENT_ENS} legacy=${legacyScore} mean=${v.meanFinalScore} delta=${delta} std=${v.stdFinalScore} range=${aggregateRange} min=${v.minFinalScore} max=${v.maxFinalScore} flagged=${flaggedIds || '(none)'}`,
  )

  if (!APPLY) {
    console.log('\n(dry-run) Would write — NO writes performed:')
    console.log(`  • INSERT INTO pariksha_runs (agent_ens=${AGENT_ENS}, questions, per_question_scores,`)
    console.log(`      final_score=${v.meanFinalScore}, variance_min=${v.minFinalScore},`)
    console.log(`      variance_max=${v.maxFinalScore}, variance_std=${v.stdFinalScore},`)
    console.log(`      sample_count=${v.sampleCount}, judge_reasoning)`)
    console.log(`  • UPDATE agents SET current_score=${v.meanFinalScore},`)
    console.log(`      total_pariksha_runs=${(before.total_pariksha_runs ?? 0) + 1}`)
    console.log(`      WHERE ens_name='${AGENT_ENS}'    (status STAYS '${before.status}')`)
    console.log('\nNo on-chain calls. No badge mints. No status change.')
    console.log('Re-run with --apply to commit.\n')
    return
  }

  const representative = v.runs.reduce((best, r) => (r.finalScore > best.finalScore ? r : best), v.runs[0])

  const { data: runRecord, error: runErr } = await supabaseAdmin
    .from('pariksha_runs')
    .insert({
      agent_ens: AGENT_ENS,
      questions,
      agent_answers: representative.perQuestionScores.map((q) => ({ questionId: q.questionId })),
      golden_answers: questions.map((q) => ({ id: q.id, goldenAnswer: q.goldenAnswer })),
      per_question_scores: representative.perQuestionScores,
      final_score: v.meanFinalScore,
      variance_min: v.minFinalScore,
      variance_max: v.maxFinalScore,
      variance_std: v.stdFinalScore,
      sample_count: v.sampleCount,
      judge_reasoning: representative.judgeReasoning,
    })
    .select('id')
    .single()

  if (runErr || !runRecord) {
    console.error('pariksha_runs insert FAILED:', runErr?.message)
    process.exit(1)
  }

  console.log(`\n✓ pariksha_runs row id: ${runRecord.id}`)

  const newRunCount = (before.total_pariksha_runs ?? 0) + 1
  const { error: agErr } = await supabaseAdmin
    .from('agents')
    .update({
      current_score: v.meanFinalScore,
      total_pariksha_runs: newRunCount,
    })
    .eq('ens_name', AGENT_ENS)

  if (agErr) {
    console.error('agents update FAILED:', agErr.message)
    process.exit(1)
  }

  console.log(`✓ agents.current_score = ${v.meanFinalScore}`)
  console.log(`✓ agents.total_pariksha_runs = ${newRunCount}`)
  console.log(`  status unchanged: '${before.status}'`)
  console.log('\n=== Done. NO on-chain calls. NO status change. ===\n')
}

main().catch((err: unknown) => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})

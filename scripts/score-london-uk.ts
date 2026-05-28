/**
 * Pariksha scoring run for london.uk.pariksha.eth against the E&W benchmark.
 *
 * Engine v1.1.0 — uses scoreWithVariance(N=3) by default. Writes a single
 * pariksha_runs row with variance_min/max/std/sample_count alongside the
 * mean final_score. Existing constraints unchanged:
 *
 *   - NO on-chain calls. No keeperHubExecute, no INFT/badge contract.
 *   - NO status change. Agent stays at status='listed' so the marketplace
 *     visibility filter is what decides whether it surfaces.
 *   - DB writes (apply mode): one pariksha_runs row + agents.{current_score,
 *     total_pariksha_runs}. Nothing else.
 *   - Dry-run is default. --apply commits.
 *
 * Bank source: pariksha-benchmark/questions/v1.1.0-draft/england-wales.json
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const SAMPLE_COUNT = 3

const AGENT_ENS = 'london.uk.pariksha.eth'
const BANK_PATH = 'pariksha-benchmark/questions/v1.1.0-draft/england-wales.json'

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

async function main() {
  // Dynamic imports so dotenv config() above runs BEFORE the engine's
  // Anthropic/Supabase clients are instantiated at module load.
  const { scoreWithVariance } = await import('../lib/pariksha-engine')
  const { supabaseAdmin } = await import('../lib/supabase')

  const bank = JSON.parse(readFileSync(BANK_PATH, 'utf-8')) as {
    version: string
    jurisdiction_code: string
    questions: BankQuestion[]
  }
  const questions: ParikshaQuestion[] = bank.questions.map((q) => ({
    id: q.id,
    question: q.question,
    goldenAnswer: q.goldenAnswer,
    category: q.category,
  }))

  console.log(`\n=== Score ${AGENT_ENS} ${APPLY ? '(APPLY)' : '(DRY-RUN)'} — engine v1.1.0 ===\n`)
  console.log(`Bank source:  ${BANK_PATH}`)
  console.log(`Bank version: ${bank.version} (${bank.jurisdiction_code})`)
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

  console.log('Agent state before:')
  console.log(`  status:              ${before.status}`)
  console.log(`  jurisdiction:        ${before.jurisdiction}`)
  console.log(`  current_score:       ${before.current_score}`)
  console.log(`  total_pariksha_runs: ${before.total_pariksha_runs}`)
  console.log(`  backend_endpoint:    ${before.backend_endpoint || '(null — Anthropic-only path)'}`)
  console.log(`  system_prompt:       ${before.system_prompt.length} chars`)

  console.log(`\nRunning ${SAMPLE_COUNT}-sample benchmark via scoreWithVariance…`)
  const startMs = Date.now()
  const v = await scoreWithVariance(AGENT_ENS, questions, SAMPLE_COUNT)
  const elapsedMs = Date.now() - startMs

  console.log('\n=== Per-question mean across samples ===\n')
  for (const m of v.meanPerQuestion) {
    console.log(`  ${m.questionId.padEnd(8)} mean=${m.meanScore.toFixed(1)}/100`)
  }

  console.log('\n=== Variance aggregate ===')
  console.log(`  per-sample finals: ${v.runs.map((r) => r.finalScore).join(', ')}`)
  console.log(`  mean:              ${v.meanFinalScore}`)
  console.log(`  min:               ${v.minFinalScore}`)
  console.log(`  max:               ${v.maxFinalScore}`)
  console.log(`  std (n-1):         ${v.stdFinalScore}`)
  console.log(`  sample_count:      ${v.sampleCount}`)
  console.log(`  elapsed:           ${(elapsedMs / 1000).toFixed(1)}s`)

  if (!APPLY) {
    console.log('\n(dry-run) Would write — NO writes performed:')
    console.log(`  • INSERT INTO pariksha_runs (agent_ens, questions, per_question_scores,`)
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

  // APPLY: pick the highest-scoring sample's per_question_scores as the
  // representative judge_reasoning (any sample would work; using the max
  // by mean per-sample variance to preserve the most-aligned per-question
  // commentary for the dashboard).
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

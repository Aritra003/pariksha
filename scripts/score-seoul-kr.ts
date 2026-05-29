/**
 * Pariksha scoring run for seoul.kr.pariksha.eth against the Korea benchmark.
 * Engine v1.1.0 — scoreWithVariance(N=3) by default. Mirrors
 * scripts/score-london-uk.ts but points at seoul.kr and korea.json.
 *
 * Constraints:
 *   - NO on-chain calls.
 *   - NO status change (stays 'listed').
 *   - NO git commit.
 *   - DB writes (apply mode): one pariksha_runs row with variance_*+sample_count
 *     + agents.{current_score, total_pariksha_runs}. Nothing else.
 *   - Dry-run default. --apply commits.
 *
 * Bank source: pariksha-benchmark/questions/v1.1.0-draft/korea.json
 * (User's message referenced 'south-korea.json'; actual file is 'korea.json'.)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { readFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const SAMPLE_COUNT = 3

const AGENT_ENS = 'seoul.kr.pariksha.eth'
const BANK_PATH = 'pariksha-benchmark/questions/v1.1.0-draft/korea.json'

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
  const { scoreWithVariance } = await import('../lib/pariksha-engine')
  const { supabaseAdmin } = await import('../lib/supabase')

  const bank = JSON.parse(readFileSync(BANK_PATH, 'utf-8')) as {
    version: string
    jurisdiction_code: string
    questions: BankQuestion[]
  }
  // Strip verification + other extra fields to match ParikshaQuestion shape.
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
  console.log(`Questions (stripped to ParikshaQuestion shape): ${questions.length}\n`)

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

  // Per-sample × per-question table (3 × 5)
  console.log('\n=== Per-sample × per-question scores ===\n')
  const header = ['question', ...v.runs.map((_, i) => `run${i + 1}`), 'mean']
  console.log(`  ${header.map((h) => h.padEnd(8)).join(' ')}`)
  console.log(`  ${header.map(() => '--------').join(' ')}`)
  for (const q of questions) {
    const perRun = v.runs.map((r) => {
      const found = r.perQuestionScores.find((p) => p.questionId === q.id)
      return found ? String(found.score) : '—'
    })
    const meanEntry = v.meanPerQuestion.find((m) => m.questionId === q.id)
    const row = [q.id, ...perRun, meanEntry ? meanEntry.meanScore.toFixed(1) : '—']
    console.log(`  ${row.map((c) => c.padEnd(8)).join(' ')}`)
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
    console.log(`      ← will return new pariksha_runs.id on apply`)
    console.log(`  • UPDATE agents SET current_score=${v.meanFinalScore},`)
    console.log(`      total_pariksha_runs=${(before.total_pariksha_runs ?? 0) + 1}`)
    console.log(`      WHERE ens_name='${AGENT_ENS}'    (status STAYS '${before.status}')`)
    console.log('\nNo on-chain calls. No badge mints. No status change.')
    console.log('Re-run with --apply to commit.\n')
    return
  }

  // Use highest-scoring sample as representative for per_question_scores +
  // judge_reasoning (any sample's reasoning is informative; max preserves the
  // most-aligned commentary for the dashboard).
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

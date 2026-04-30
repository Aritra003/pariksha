/**
 * seed-demo-benchmarks.ts — self-contained: no @/ imports (dotenv hoisting issue)
 * Run: npx tsx scripts/seed-demo-benchmarks.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { ethers } from 'ethers'
import { INFT_ABI } from '../lib/contracts/abis'
import benchmarkQuestions from '../data/benchmark-questions.json'

// ── clients ────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const RPC = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!
const INFT_ADDR = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS!

// ── types ───────────────────────────────────────────────────────────────────

interface BenchmarkQuestion {
  id: string
  question: string
  goldenAnswer: string
  category: string
}

type BenchmarkData = Record<string, BenchmarkQuestion[]>

// ── core functions ──────────────────────────────────────────────────────────

async function callAgent(agentEns: string, question: string, jurisdiction: string, systemPrompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `[Jurisdiction: ${jurisdiction}]\n\n${question}` }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

async function judgeAnswer(question: string, goldenAnswer: string, agentAnswer: string): Promise<{ score: number; reasoning: string }> {
  const JUDGE_PROMPT = `You are a senior legal expert evaluating an AI agent's response.
Compare the agent's answer to the golden answer. Score on:
- Legal accuracy (40%)
- Citation correctness — no fabrication (30%)
- Jurisdictional appropriateness (20%)
- Reasoning quality (10%)
Return ONLY valid JSON with no markdown: { "score": <0-100>, "reasoning": "<one paragraph>" }`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    system: JUDGE_PROMPT,
    messages: [{ role: 'user', content: `QUESTION:\n${question}\n\nGOLDEN ANSWER:\n${goldenAnswer}\n\nAGENT ANSWER:\n${agentAnswer}` }],
  })
  const block = message.content[0]
  let text = block.type === 'text' ? block.text : '{}'
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    const parsed = JSON.parse(text)
    return { score: Math.max(0, Math.min(100, Number(parsed.score) || 0)), reasoning: String(parsed.reasoning ?? '') }
  } catch {
    return { score: 0, reasoning: 'Parse error' }
  }
}

async function recordOnChain(tokenId: number, score: number): Promise<string | null> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC)
    const signer = new ethers.Wallet(PRIVATE_KEY, provider)
    const inft = new ethers.Contract(INFT_ADDR, INFT_ABI, signer)
    const tx = await inft.recordParikshaRun(BigInt(tokenId), BigInt(Math.round(score * 10)))
    const receipt = await tx.wait()
    console.log(`    ✓ on-chain: ${tx.hash} (block ${receipt?.blockNumber})`)
    return tx.hash as string
  } catch (err) {
    console.warn(`    ⚠ on-chain skipped: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`)
    return null
  }
}

// ── seed one agent ──────────────────────────────────────────────────────────

async function seedAgent(agentEns: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶ ${agentEns}`)

  const data = benchmarkQuestions as unknown as BenchmarkData
  const questions: BenchmarkQuestion[] = data[agentEns] ?? []
  if (questions.length === 0) { console.log('  No questions — skipping'); return }

  const { data: agent } = await supabase
    .from('agents')
    .select('ens_name, jurisdiction, system_prompt, inft_token_id, current_score, total_pariksha_runs')
    .eq('ens_name', agentEns)
    .single()

  if (!agent) { console.error('  Agent not found in DB'); return }

  const jurisdiction = agent.jurisdiction ?? 'India'
  const systemPrompt = agent.system_prompt ?? 'You are a legal AI agent. Provide accurate jurisdiction-appropriate legal information.'

  console.log(`  Jurisdiction: ${jurisdiction} | Questions: ${questions.length}`)

  // Phase 1: get agent answers in parallel
  process.stdout.write('  Getting answers')
  const agentAnswers = await Promise.all(
    questions.map(async (q) => {
      try {
        const ans = await callAgent(agentEns, q.question, jurisdiction, systemPrompt)
        process.stdout.write('.')
        return ans
      } catch {
        process.stdout.write('✗')
        return ''
      }
    })
  )
  console.log()

  // Phase 2: judge answers in parallel
  process.stdout.write('  Judging')
  const judgeResults = await Promise.all(
    questions.map(async (q, i) => {
      const r = await judgeAnswer(q.question, q.goldenAnswer, agentAnswers[i])
      process.stdout.write('.')
      return r
    })
  )
  console.log()

  const perQuestionScores = questions.map((q, i) => ({
    questionId: q.id,
    score: judgeResults[i].score,
    reasoning: judgeResults[i].reasoning,
  }))

  const finalScore = Math.round(
    (perQuestionScores.reduce((s, q) => s + q.score, 0) / perQuestionScores.length) * 10
  ) / 10

  console.log(`  Score: ${finalScore}/100`)
  perQuestionScores.forEach((q) => console.log(`    [${q.questionId}] ${q.score}/100`))

  // On-chain
  let attestationTxHash: string | null = null
  if (agent.inft_token_id !== null && agent.inft_token_id !== undefined) {
    attestationTxHash = await recordOnChain(Number(agent.inft_token_id), finalScore)
  }

  // Insert run record
  const { data: runRecord, error: runErr } = await supabase
    .from('pariksha_runs')
    .insert({
      agent_ens: agentEns,
      questions,
      agent_answers: perQuestionScores.map((q) => ({ questionId: q.questionId })),
      golden_answers: questions.map((q) => ({ id: q.id, goldenAnswer: q.goldenAnswer })),
      per_question_scores: perQuestionScores,
      final_score: finalScore,
      judge_reasoning: perQuestionScores.map((q) => `[${q.questionId}] Score: ${q.score}/100 — ${q.reasoning}`).join('\n\n'),
      attestation_tx_hash: attestationTxHash,
    })
    .select('id')
    .single()

  if (runErr) console.warn(`  ⚠ DB insert: ${runErr.message}`)
  else console.log(`  ✓ run saved: ${runRecord?.id}`)

  // Update agent
  await supabase
    .from('agents')
    .update({ current_score: finalScore, total_pariksha_runs: (agent.total_pariksha_runs ?? 0) + 1 })
    .eq('ens_name', agentEns)
  console.log('  ✓ agent updated')
}

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  const AGENTS = [
    'delhi.in.pariksha.eth',
    'vidhi.sg.pariksha.eth',
    'vidhi.ae.pariksha.eth',
    'vidhi.us.pariksha.eth',
  ]

  console.log('=== Pariksha Benchmark Seed ===')
  console.log(`Agents: ${AGENTS.join(', ')}`)
  console.log('Calling Anthropic for each question — this will take ~2-3 minutes.\n')

  const start = Date.now()
  for (const ens of AGENTS) await seedAgent(ens)

  const elapsed = ((Date.now() - start) / 1000).toFixed(0)
  console.log(`\n=== Done in ${elapsed}s ===\n`)

  const { data: summary } = await supabase
    .from('agents')
    .select('ens_name, current_score, total_pariksha_runs')
    .in('ens_name', AGENTS)
    .order('current_score', { ascending: false })

  console.log('Final scores:')
  summary?.forEach((a) => console.log(`  ${a.ens_name}: ${a.current_score ?? 'N/A'}/100 (${a.total_pariksha_runs ?? 0} runs)`))
}

main().catch((err) => { console.error(err); process.exit(1) })

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runPariksha, type ParikshaQuestion } from '@/lib/pariksha-engine'
import benchmarkQuestions from '@/data/benchmark-questions.json'
import { keeperHubExecute } from '@/lib/chain-executor'
import { INFT_ABI, BADGE_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts/abis'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // benchmark is ~10-30s; give headroom

type BenchmarkData = Record<
  string,
  Array<{ id: string; question: string; goldenAnswer: string; category: string }>
>

const JURISDICTION_DEFAULT: Record<string, string> = {
  India: 'delhi.in.pariksha.eth',
  Singapore: 'vidhi.sg.pariksha.eth',
  'UAE-DIFC': 'vidhi.ae.pariksha.eth',
  US: 'vidhi.us.pariksha.eth',
  'US-DE': 'vidhi.us.pariksha.eth',
}

// Trust gate threshold — lower than VERIFIED (80) so the trust pass is a
// minimum-competence floor, not a quality bar. Quality is signalled by VERIFIED/EXCELLENCE.
const TRUST_PASS_THRESHOLD = 60

// Badge types from PariksaBadge contract. Type 1 was unallocated; we claim it for TRUST_REVIEWED.
const BADGE_TRUST_REVIEWED = 1

export async function POST(
  _request: NextRequest,
  { params }: { params: { ens: string } }
) {
  const ensName = decodeURIComponent(params.ens)

  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('ens_name, status, jurisdiction, owner_address, inft_token_id')
    .eq('ens_name', ensName)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  if (agent.status !== 'pending_review') {
    return NextResponse.json(
      {
        error: `Trust review only runs on pending_review agents. Current status: ${agent.status}.`,
      },
      { status: 409 }
    )
  }

  const data = benchmarkQuestions as unknown as BenchmarkData
  const fallbackKey = JURISDICTION_DEFAULT[agent.jurisdiction ?? ''] ?? 'delhi.in.pariksha.eth'
  const questions: ParikshaQuestion[] = data[ensName] ?? data[fallbackKey] ?? []

  if (questions.length === 0) {
    return NextResponse.json(
      { error: `No benchmark questions found for ${ensName} or its jurisdiction default.` },
      { status: 422 }
    )
  }

  let result
  try {
    result = await runPariksha(ensName, questions)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[trust-review] benchmark engine error: ${msg}`)
    return NextResponse.json({ error: 'Benchmark engine error', detail: msg }, { status: 500 })
  }

  const passed = result.finalScore >= TRUST_PASS_THRESHOLD

  // Record the benchmark run alongside the trust review
  const { data: runRecord } = await supabaseAdmin
    .from('pariksha_runs')
    .insert({
      agent_ens: ensName,
      questions,
      agent_answers: result.perQuestionScores.map((q) => ({ questionId: q.questionId })),
      golden_answers: questions.map((q) => ({ id: q.id, goldenAnswer: q.goldenAnswer })),
      per_question_scores: result.perQuestionScores,
      final_score: result.finalScore,
      judge_reasoning: result.judgeReasoning,
    })
    .select('id')
    .single()

  // Record on-chain attestation of the benchmark run
  let attestationTxHash: string | null = null
  if (agent.inft_token_id !== null && agent.inft_token_id !== undefined) {
    const tokenId = BigInt(agent.inft_token_id)
    const scoreOnChain = BigInt(Math.round(result.finalScore * 10))
    const inftResult = await keeperHubExecute({
      contractAddress: CONTRACT_ADDRESSES.inft,
      abi: INFT_ABI,
      functionName: 'recordParikshaRun',
      args: [tokenId, scoreOnChain],
    })
    attestationTxHash = inftResult.txHash ?? null
    if (!inftResult.success) {
      console.error('[trust-review] iNFT recordParikshaRun failed:', inftResult.error)
    }
  }

  let badgeTxHash: string | null = null
  if (passed) {
    const ownerAddress = agent.owner_address ?? CONTRACT_ADDRESSES.inft
    const badgeResult = await keeperHubExecute({
      contractAddress: CONTRACT_ADDRESSES.badge,
      abi: BADGE_ABI,
      functionName: 'mintBadge',
      args: [ownerAddress, BADGE_TRUST_REVIEWED, ensName, `score:${result.finalScore}`],
    })
    if (badgeResult.success) {
      badgeTxHash = badgeResult.txHash ?? null
      await supabaseAdmin.from('badges').insert({
        agent_ens: ensName,
        badge_type: 'TRUST_REVIEWED',
        tx_hash: badgeTxHash,
      })
    } else {
      console.error('[trust-review] TRUST_REVIEWED badge mint failed:', badgeResult.error)
    }
  }

  const newStatus = passed ? 'community_minted' : 'trust_failed'

  await supabaseAdmin
    .from('agents')
    .update({
      status: newStatus,
      current_score: result.finalScore,
      total_pariksha_runs: 1,
    })
    .eq('ens_name', ensName)

  // Update the open trust_review row (created at mint time) with the outcome
  await supabaseAdmin
    .from('trust_reviews')
    .update({
      benchmark_run_id: runRecord?.id ?? null,
      benchmark_score: result.finalScore,
      outcome: passed ? 'passed' : 'failed',
      outcome_reason: passed
        ? `Benchmark score ${result.finalScore} ≥ ${TRUST_PASS_THRESHOLD}.`
        : `Benchmark score ${result.finalScore} < ${TRUST_PASS_THRESHOLD}. Agent hidden from marketplace.`,
      badge_tx_hash: badgeTxHash,
    })
    .eq('agent_ens', ensName)
    .eq('outcome', 'pending')

  return NextResponse.json({
    ensName,
    outcome: passed ? 'passed' : 'failed',
    benchmark_score: result.finalScore,
    threshold: TRUST_PASS_THRESHOLD,
    new_status: newStatus,
    attestation_tx_hash: attestationTxHash,
    badge_tx_hash: badgeTxHash,
    per_question_scores: result.perQuestionScores,
  })
}

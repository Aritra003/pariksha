import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runPariksha, type ParikshaQuestion } from '@/lib/pariksha-engine'
import benchmarkQuestions from '@/data/benchmark-questions.json'
import { keeperHubExecute } from '@/lib/chain-executor'
import { INFT_ABI, BADGE_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts/abis'

type BenchmarkData = Record<
  string,
  Array<{ id: string; question: string; goldenAnswer: string; category: string }>
>

const BADGE_TYPES = { VERIFIED: 0, EXCELLENCE: 2 }

async function tryMintBadge(
  agentEns: string,
  badgeType: number,
  ownerAddress: string,
  thresholdData: string
): Promise<string | null> {
  const result = await keeperHubExecute({
    contractAddress: CONTRACT_ADDRESSES.badge,
    abi: BADGE_ABI,
    functionName: 'mintBadge',
    args: [ownerAddress, badgeType, agentEns, thresholdData],
  })

  if (result.success) {
    const typeName = Object.entries(BADGE_TYPES).find(([, v]) => v === badgeType)?.[0] ?? 'UNKNOWN'
    await supabaseAdmin.from('badges').insert({
      agent_ens: agentEns,
      badge_type: typeName,
      tx_hash: result.txHash ?? null,
    })
    console.log(`[pariksha/run] Minted ${typeName} badge for ${agentEns} — tx: ${result.txHash}`)
    return result.txHash ?? null
  }

  console.warn(`[pariksha/run] Badge mint failed: ${result.error}`)
  return null
}

export async function POST(request: NextRequest) {
  let body: { agentEns: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentEns } = body

  if (!agentEns) {
    return NextResponse.json({ error: 'agentEns is required' }, { status: 400 })
  }

  // Fetch agent
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('ens_name, status, total_pariksha_runs, current_score, inft_token_id, owner_address')
    .eq('ens_name', agentEns)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Load questions
  const data = benchmarkQuestions as unknown as BenchmarkData
  const questions: ParikshaQuestion[] = data[agentEns] ?? []

  if (questions.length === 0) {
    return NextResponse.json(
      { error: `No benchmark questions found for ${agentEns}` },
      { status: 422 }
    )
  }

  const startMs = Date.now()

  let result
  try {
    result = await runPariksha(agentEns, questions)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pariksha/run] engine error: ${msg}`)
    return NextResponse.json({ error: 'Benchmark engine error' }, { status: 500 })
  }

  const elapsedMs = Date.now() - startMs

  // Score stored as uint256 * 10 on-chain (1 decimal precision = multiply by 10)
  const scoreOnChain = BigInt(Math.round(result.finalScore * 10))

  // On-chain: recordParikshaRun on iNFT
  let attestationTxHash: string | null = null
  if (agent.inft_token_id !== null && agent.inft_token_id !== undefined) {
    const tokenId = BigInt(agent.inft_token_id)
    const inftResult = await keeperHubExecute({
      contractAddress: CONTRACT_ADDRESSES.inft,
      abi: INFT_ABI,
      functionName: 'recordParikshaRun',
      args: [tokenId, scoreOnChain],
    })
    attestationTxHash = inftResult.txHash ?? null
    if (!inftResult.success) {
      console.error('[pariksha/run] iNFT recordParikshaRun failed:', inftResult.error)
    }
  }

  // Insert run record
  const { data: runRecord, error: runErr } = await supabaseAdmin
    .from('pariksha_runs')
    .insert({
      agent_ens: agentEns,
      questions,
      agent_answers: result.perQuestionScores.map((q) => ({ questionId: q.questionId })),
      golden_answers: questions.map((q) => ({ id: q.id, goldenAnswer: q.goldenAnswer })),
      per_question_scores: result.perQuestionScores,
      final_score: result.finalScore,
      judge_reasoning: result.judgeReasoning,
      attestation_tx_hash: attestationTxHash,
    })
    .select('id')
    .single()

  if (runErr) {
    console.error('[pariksha/run] insert error:', runErr.message)
  }

  // Update agent score + run count
  const newRunCount = (agent.total_pariksha_runs ?? 0) + 1
  await supabaseAdmin
    .from('agents')
    .update({
      current_score: result.finalScore,
      total_pariksha_runs: newRunCount,
    })
    .eq('ens_name', agentEns)

  // Badge thresholds
  const ownerAddress = agent.owner_address ?? CONTRACT_ADDRESSES.inft // fallback
  const prevScore = agent.current_score ?? 0
  const badges: { type: string; txHash: string | null }[] = []

  // VERIFIED: first run crossing 80
  if (result.finalScore >= 80 && (prevScore < 80 || newRunCount === 1)) {
    const txHash = await tryMintBadge(
      agentEns,
      BADGE_TYPES.VERIFIED,
      ownerAddress,
      `score:${result.finalScore}`
    ).catch(() => null)
    if (txHash !== undefined) badges.push({ type: 'VERIFIED', txHash })
  }

  // EXCELLENCE: first run crossing 95
  if (result.finalScore >= 95 && prevScore < 95) {
    const txHash = await tryMintBadge(
      agentEns,
      BADGE_TYPES.EXCELLENCE,
      ownerAddress,
      `score:${result.finalScore}`
    ).catch(() => null)
    if (txHash !== undefined) badges.push({ type: 'EXCELLENCE', txHash })
  }

  return NextResponse.json({
    runId: runRecord?.id ?? null,
    agentEns,
    finalScore: result.finalScore,
    perQuestionScores: result.perQuestionScores,
    judgeReasoning: result.judgeReasoning,
    elapsedMs,
    questionCount: questions.length,
    attestationTxHash,
    badgesMinted: badges,
  })
}

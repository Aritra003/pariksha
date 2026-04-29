import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabase } from '@/lib/supabase'
import { runPariksha, type ParikshaQuestion } from '@/lib/pariksha-engine'
import benchmarkQuestions from '@/data/benchmark-questions.json'

type BenchmarkData = Record<
  string,
  Array<{ id: string; question: string; goldenAnswer: string; category: string }>
>

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

  // Verify agent exists
  const { data: agent, error: agentErr } = await supabaseAdmin
    .from('agents')
    .select('ens_name, status, total_pariksha_runs')
    .eq('ens_name', agentEns)
    .single()

  if (agentErr || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Load questions for this agent
  const data = benchmarkQuestions as unknown as BenchmarkData
  const questions: ParikshaQuestion[] = data[agentEns] ?? []

  if (questions.length === 0) {
    return NextResponse.json(
      { error: `No benchmark questions found for ${agentEns}` },
      { status: 422 }
    )
  }

  const startMs = Date.now()

  // Run the benchmark
  let result
  try {
    result = await runPariksha(agentEns, questions)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[pariksha/run] engine error for ${agentEns}: ${msg}`)
    return NextResponse.json({ error: 'Benchmark engine error' }, { status: 500 })
  }

  const elapsedMs = Date.now() - startMs

  // Insert run record
  const { data: runRecord, error: runErr } = await supabaseAdmin
    .from('pariksha_runs')
    .insert({
      agent_ens: agentEns,
      questions: questions,
      agent_answers: result.perQuestionScores.map((q) => ({
        questionId: q.questionId,
        // agent answers are embedded in the per-question scores for now
      })),
      golden_answers: questions.map((q) => ({
        id: q.id,
        goldenAnswer: q.goldenAnswer,
      })),
      per_question_scores: result.perQuestionScores,
      final_score: result.finalScore,
      judge_reasoning: result.judgeReasoning,
      attestation_tx_hash: null, // PROMPT-05: wire iNFT recordParikshaRun()
    })
    .select('id')
    .single()

  if (runErr) {
    console.error('[pariksha/run] insert error:', runErr.message)
  }

  // Update agent score + run count
  await supabaseAdmin
    .from('agents')
    .update({
      current_score: result.finalScore,
      total_pariksha_runs: (agent.total_pariksha_runs ?? 0) + 1,
    })
    .eq('ens_name', agentEns)

  return NextResponse.json({
    runId: runRecord?.id ?? null,
    agentEns,
    finalScore: result.finalScore,
    perQuestionScores: result.perQuestionScores,
    judgeReasoning: result.judgeReasoning,
    elapsedMs,
    questionCount: questions.length,
    // TODO PROMPT-05: attestationTxHash from iNFT contract
  })
}

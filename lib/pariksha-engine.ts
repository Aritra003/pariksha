import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const JUDGE_SYSTEM_PROMPT = `You are a senior legal expert evaluating an AI agent's response.
Compare the agent's answer to the golden answer. Score on:
- Legal accuracy (40%)
- Citation correctness — no fabrication (30%)
- Jurisdictional appropriateness (20%)
- Reasoning quality (10%)
Return ONLY valid JSON with no markdown: { "score": <0-100>, "reasoning": "<one paragraph>" }`

export interface ParikshaQuestion {
  id: string
  question: string
  goldenAnswer: string
  category: string
}

export interface ParikshaResult {
  perQuestionScores: Array<{ questionId: string; score: number; reasoning: string }>
  finalScore: number
  judgeReasoning: string
}

async function callAgent(agentEns: string, question: string): Promise<string> {
  // Fetch agent system_prompt and backend config from DB
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('system_prompt, jurisdiction, backend_endpoint')
    .eq('ens_name', agentEns)
    .single()

  const jurisdiction = agent?.jurisdiction ?? 'India'
  const systemPrompt =
    agent?.system_prompt ??
    'You are a legal AI agent. Provide accurate jurisdiction-appropriate legal information.'

  // Try NyayaMitra upstream if backend_endpoint is configured
  const upstreamUrl = agent?.backend_endpoint
  if (upstreamUrl) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 25_000)
      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.NYAYAMITRA_PROXY_API_KEY ?? '',
        },
        body: JSON.stringify({ query: question, jurisdiction }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (upstream.ok) {
        const data = await upstream.json()
        const text = typeof data === 'string' ? data : (data.response ?? JSON.stringify(data))
        return text
      }
    } catch {
      // fall through to Anthropic fallback
    }
  }

  // Fallback: call Anthropic directly with agent's system prompt
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `[Jurisdiction: ${jurisdiction}]\n\n${question}` }],
  })
  const block = message.content[0]
  return block.type === 'text' ? block.text : ''
}

async function judgeAnswer(
  question: string,
  goldenAnswer: string,
  agentAnswer: string
): Promise<{ score: number; reasoning: string }> {
  const userMessage = `QUESTION:\n${question}\n\nGOLDEN ANSWER:\n${goldenAnswer}\n\nAGENT ANSWER:\n${agentAnswer}`

  // Assistant prefill forces the judge to begin its response with '{', so it
  // can only continue with valid JSON — eliminates "judge wrote prose, no
  // JSON object" failures. The Anthropic API returns ONLY the continuation
  // (not the prefill), so we prepend '{' before parsing.
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '{' },
    ],
  })

  const block = message.content[0]
  let text = block.type === 'text' ? '{' + block.text : '{}'

  // Strip markdown code fences if present (```json ... ```)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

  // Judges occasionally wrap their JSON in markdown headers or XML-like tags
  // (e.g. "## Legal Evaluation Analysis\n\n<document>\n{...}\n</document>").
  // Try strict parse first to preserve existing behaviour for clean responses;
  // if that fails, fall back to extracting the first `{` to the last `}`.
  let parsed: { score?: unknown; reasoning?: unknown } | null = null
  try {
    parsed = JSON.parse(text)
  } catch {
    const firstBrace = text.indexOf('{')
    const lastBrace = text.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1))
      } catch {
        // fall through to error path
      }
    }
  }

  if (parsed) {
    return {
      score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
      reasoning: String(parsed.reasoning ?? ''),
    }
  }

  console.error('[pariksha-engine] Judge returned non-JSON:', text.slice(0, 200))
  return { score: 0, reasoning: 'Judge response parse error' }
}

export interface ParikshaVarianceResult {
  meanFinalScore: number
  minFinalScore: number
  maxFinalScore: number
  stdFinalScore: number
  sampleCount: number
  runs: ParikshaResult[]
  meanPerQuestion: Array<{ questionId: string; meanScore: number }>
}

// scoreWithVariance — Pariksha v1.1.0 methodology.
// Runs the same benchmark N times sequentially and aggregates. The judge model
// is non-deterministic on partial-error penalty severity (observed: ±8 on a
// single hard question across samples), but the directional signal is
// preserved across samples. Reporting min/max/std alongside the mean makes
// that noise visible rather than papered over.
export async function scoreWithVariance(
  agentEns: string,
  questions: ParikshaQuestion[],
  sampleCount = 3
): Promise<ParikshaVarianceResult> {
  if (sampleCount < 1) throw new Error('sampleCount must be >= 1')

  const runs: ParikshaResult[] = []
  for (let i = 0; i < sampleCount; i++) {
    console.log(`[pariksha-engine] scoreWithVariance: sample ${i + 1}/${sampleCount}`)
    runs.push(await runPariksha(agentEns, questions))
  }

  const finals = runs.map((r) => r.finalScore)
  const meanFinal = finals.reduce((s, x) => s + x, 0) / finals.length
  const minFinal = Math.min(...finals)
  const maxFinal = Math.max(...finals)
  const stdFinal =
    finals.length > 1
      ? Math.sqrt(finals.reduce((s, x) => s + (x - meanFinal) ** 2, 0) / (finals.length - 1))
      : 0

  const qIds = Array.from(new Set(runs.flatMap((r) => r.perQuestionScores.map((q) => q.questionId))))
  const meanPerQuestion = qIds.map((qid) => {
    const scores = runs.map((r) => r.perQuestionScores.find((q) => q.questionId === qid)?.score ?? 0)
    const m = scores.reduce((s, x) => s + x, 0) / scores.length
    return { questionId: qid, meanScore: Math.round(m * 10) / 10 }
  })

  return {
    meanFinalScore: Math.round(meanFinal * 10) / 10,
    minFinalScore: Math.round(minFinal * 10) / 10,
    maxFinalScore: Math.round(maxFinal * 10) / 10,
    stdFinalScore: Math.round(stdFinal * 100) / 100,
    sampleCount,
    runs,
    meanPerQuestion,
  }
}

export async function runPariksha(
  agentEns: string,
  questions: ParikshaQuestion[]
): Promise<ParikshaResult> {
  // Phase 1: get all agent answers in parallel
  console.log(`[pariksha-engine] Phase 1: getting ${questions.length} agent answers in parallel`)
  const agentAnswers = await Promise.all(
    questions.map(async (q) => {
      try {
        return await callAgent(agentEns, q.question)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[pariksha-engine] Agent call failed for ${q.id}: ${msg}`)
        return ''
      }
    })
  )

  // Phase 2: judge all answers in parallel
  console.log(`[pariksha-engine] Phase 2: judging ${questions.length} answers in parallel`)
  const judgeResults = await Promise.all(
    questions.map((q, i) => judgeAnswer(q.question, q.goldenAnswer, agentAnswers[i]))
  )

  const perQuestionScores = questions.map((q, i) => ({
    questionId: q.id,
    score: judgeResults[i].score,
    reasoning: judgeResults[i].reasoning,
  }))

  const finalScore =
    perQuestionScores.length > 0
      ? perQuestionScores.reduce((sum, q) => sum + q.score, 0) / perQuestionScores.length
      : 0

  const judgeReasoning = perQuestionScores
    .map((q) => `[${q.questionId}] Score: ${q.score}/100 — ${q.reasoning}`)
    .join('\n\n')

  return {
    perQuestionScores,
    finalScore: Math.round(finalScore * 10) / 10,
    judgeReasoning,
  }
}

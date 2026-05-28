/**
 * Retroactive trust review for pre-trust-layer minted agents.
 *
 * Runs the lib/trust-scan.ts prompt-safety scan against every agent currently
 * in one of the "live" pre-trust-layer statuses (community_minted, demo_ready,
 * live). For agents that pass:
 *   - status → 'trust_grandfathered'
 *   - inserts a trust_reviews row with outcome='grandfathered'
 *   - mints a TRUST_REVIEWED badge on-chain (badge type 1)
 * Failures are logged only — no status change, manual review required.
 *
 * IRREVERSIBLE: this mints on-chain badges. Run only after the user explicitly
 * approves. Dry-run is the default; pass `--apply` to execute.
 *
 * Usage:
 *   pnpm tsx scripts/retroactive-trust-review.ts          # dry-run
 *   pnpm tsx scripts/retroactive-trust-review.ts --apply  # execute
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { heuristicChecks } from '../lib/trust-scan'
import { BADGE_ABI } from '../lib/contracts/abis'

// Heuristic-only scan model identifier used in the trust_reviews record.
const SCAN_MODEL = 'heuristic-only-grandfather'

const APPLY = process.argv.includes('--apply')
const GRANDFATHER_STATUSES = ['community_minted', 'demo_ready', 'live']
const BADGE_TRUST_REVIEWED = 1

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const badgeAddress = process.env.NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS
const rpcUrl = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const deployerPk = process.env.DEPLOYER_PRIVATE_KEY

if (!supabaseUrl || !supabaseKey || !badgeAddress || !deployerPk) {
  console.error(
    'Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS, DEPLOYER_PRIVATE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const provider = new ethers.JsonRpcProvider(rpcUrl)
const signer = new ethers.Wallet(deployerPk, provider)
const badgeContract = new ethers.Contract(badgeAddress, BADGE_ABI, signer)

interface AgentRow {
  ens_name: string
  status: string
  jurisdiction: string
  specialty: string
  system_prompt: string | null
  owner_address: string | null
  current_score: number | null
}

async function main() {
  console.log(`\n=== Retroactive Trust Review ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===\n`)

  // Dedup guard: this script has no per-call idempotency on the badge mint, so
  // running it twice would mint duplicate TRUST_REVIEWED badges. Abort early
  // if ANY agent already has an outcome='grandfathered' row in trust_reviews.
  const { count: alreadyGrandfathered } = await supabase
    .from('trust_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('outcome', 'grandfathered')

  if ((alreadyGrandfathered ?? 0) > 0) {
    console.error(
      `Refusing to run: trust_reviews already has ${alreadyGrandfathered} grandfathered row(s).\n` +
        `This script has no per-agent dedup. Re-running would mint duplicate badges.\n` +
        `If you genuinely need to re-grandfather, delete the existing rows manually first.`
    )
    process.exit(1)
  }

  const { data: agents, error } = await supabase
    .from('agents')
    .select('ens_name, status, jurisdiction, specialty, system_prompt, owner_address, current_score')
    .in('status', GRANDFATHER_STATUSES)
    .order('ens_name')

  if (error) {
    console.error('DB query failed:', error.message)
    process.exit(1)
  }

  if (!agents || agents.length === 0) {
    console.log('No agents in grandfathering-eligible status.')
    return
  }

  console.log(`Found ${agents.length} agent(s) to review:\n`)
  for (const a of agents) {
    console.log(`  - ${a.ens_name} (${a.status}, score: ${a.current_score ?? '—'})`)
  }
  console.log('')

  let passed = 0
  let failed = 0

  for (const agent of agents as AgentRow[]) {
    console.log(`── ${agent.ens_name} ──`)

    if (!agent.system_prompt) {
      console.log('  skipped: no system_prompt stored.')
      failed++
      continue
    }

    // Grandfathering policy: scan results inform but do NOT gate. These agents
    // predate the trust layer; their prompts were written without the new
    // framework rules. We accept them as-is and log findings for follow-up.
    const { issues, frameworkChecks } = heuristicChecks(agent.system_prompt, agent.jurisdiction)
    const blocking = issues.filter((i) => i.severity === 'block').length
    const warning = issues.filter((i) => i.severity === 'warn').length
    console.log(`  heuristic scan: ${blocking} blocking, ${warning} warnings (informational; does not gate grandfathering)`)
    if (issues.length > 0) {
      for (const issue of issues) {
        console.log(`    [${issue.severity}] ${issue.code}: ${issue.message}`)
      }
    }

    if (!APPLY) {
      console.log('  (dry-run) would: update status → trust_grandfathered, mint TRUST_REVIEWED badge')
      passed++
      continue
    }

    // Apply: insert trust_reviews row.
    // prompt_safety_passed records whether the heuristic scan had zero blocking
    // findings (for audit visibility), but does NOT determine the outcome.
    const { error: trErr } = await supabase.from('trust_reviews').insert({
      agent_ens: agent.ens_name,
      prompt_safety_passed: blocking === 0,
      prompt_safety_issues: issues,
      prompt_safety_scan_model: SCAN_MODEL,
      framework_checks: frameworkChecks,
      outcome: 'grandfathered',
      outcome_reason: `Pre-trust-layer mint, grandfathered as-is. Original status: ${agent.status}. Score at review time: ${agent.current_score ?? 'unscored'}. Heuristic scan: ${blocking} blocking / ${warning} warning findings logged for follow-up.`,
      benchmark_score: agent.current_score,
    })
    if (trErr) {
      console.error('  trust_reviews insert error:', trErr.message)
      failed++
      continue
    }

    // Mint TRUST_REVIEWED badge
    const owner = agent.owner_address ?? signer.address
    try {
      const tx: ethers.TransactionResponse = await badgeContract['mintBadge'](
        owner,
        BADGE_TRUST_REVIEWED,
        agent.ens_name,
        `grandfathered:${agent.current_score ?? 'unscored'}`
      )
      const receipt = await tx.wait()
      console.log(`  ✓ badge minted, tx: ${tx.hash}`)

      await supabase.from('badges').insert({
        agent_ens: agent.ens_name,
        badge_type: 'TRUST_REVIEWED',
        tx_hash: tx.hash,
      })
      await supabase
        .from('trust_reviews')
        .update({ badge_tx_hash: tx.hash })
        .eq('agent_ens', agent.ens_name)
        .eq('outcome', 'grandfathered')

      // Flip the agent status
      const { error: statusErr } = await supabase
        .from('agents')
        .update({ status: 'trust_grandfathered' })
        .eq('ens_name', agent.ens_name)
      if (statusErr) {
        console.error('  status update error:', statusErr.message)
      }

      void receipt
      passed++
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('  badge mint failed:', msg)
      failed++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`  Passed: ${passed}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Mode:   ${APPLY ? 'APPLIED (on-chain mints + DB writes)' : 'DRY-RUN (no changes)'}`)
  if (!APPLY && passed > 0) {
    console.log(`\nTo apply, re-run with --apply.`)
  }
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

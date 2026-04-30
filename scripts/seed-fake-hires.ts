/**
 * seed-fake-hires.ts — inserts 50 realistic hire records for delhi.in.pariksha.eth
 * spread over the past 30 days to simulate organic usage.
 * Run: npx tsx scripts/seed-fake-hires.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const AGENT_ENS = 'delhi.in.pariksha.eth'
const HIRE_COUNT = 50
const PRICE_USDC = 0.05

const QUERIES = [
  'What is the limitation period for filing a Section 138 NI Act cheque bounce case?',
  'Can I file an application under Section 9 IBC if my claim is below Rs. 1 crore?',
  'Explain the procedure for enforcement of a foreign arbitral award in India.',
  'What remedies are available under Specific Relief Act 1963 for breach of contract?',
  'How does the Delhi High Court handle injunctions in trademark infringement cases?',
  'Is pre-litigation mediation mandatory under the Commercial Courts Act 2015?',
  'What is the doctrine of frustration under Section 56 of the Indian Contract Act?',
  'How does Delhi High Court determine if a dispute is "commercial" for fast-track proceedings?',
  'What are the grounds for challenging an arbitral award under Section 34 of the Arbitration and Conciliation Act?',
  'Explain Section 28 of the Contract Act — restraint of trade in employment agreements.',
  'What are the requirements for a valid assignment of a legal claim in India?',
  'Can a company file a writ petition in the Delhi High Court against a private party?',
  'What is the procedure for taking cognizance of a cheque dishonour complaint under Section 138?',
  'How are damages calculated for breach of a commercial contract under Indian law?',
  'What are the requirements to obtain an ex-parte injunction in Delhi High Court?',
  'Explain the concept of force majeure under Indian law post-COVID-19.',
  'What is the procedure for filing an urgent mentioning before the Delhi High Court?',
  'Can a foreign national enforce a debt judgment from Singapore in India?',
  'What is the angel tax exemption framework after the Finance Act 2024 amendments?',
  'How does the Insolvency and Bankruptcy Code 2016 treat operational creditors differently from financial creditors?',
  'What is the limitation period for arbitration under the Limitation Act 1963?',
  'Explain the NCLT procedure for initiating insolvency proceedings against a corporate debtor.',
  'What is the legal status of oral agreements under Indian contract law?',
  'How does Delhi HC approach piercing the corporate veil in fraud cases?',
  'What are the penalties under the FEMA 1999 for unauthorized foreign exchange transactions?',
  'Explain the procedure for a winding-up petition under the Companies Act 2013.',
  'What constitutes a "material adverse change" clause under Indian M&A agreements?',
  'How are non-compete clauses treated under Section 27 of the Indian Contract Act?',
  'What is the procedure for obtaining certified copies of court judgments in Delhi?',
  'Can a creditor initiate proceedings under both IBC and Section 138 NI Act simultaneously?',
]

function randomBuyerAddress(): string {
  const wallet = ethers.Wallet.createRandom()
  return wallet.address
}

function randomTimestamp(daysAgo: number): string {
  const now = Date.now()
  const ms = now - daysAgo * 24 * 60 * 60 * 1000
  const jitter = Math.floor(Math.random() * 24 * 60 * 60 * 1000) // random hour within the day
  return new Date(ms + jitter).toISOString()
}

function randomTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

async function main() {
  console.log(`=== Seeding ${HIRE_COUNT} fake hires for ${AGENT_ENS} ===`)

  const hires = Array.from({ length: HIRE_COUNT }, (_, i) => {
    const daysAgo = Math.floor((i / HIRE_COUNT) * 30) // spread over 30 days
    const query = QUERIES[i % QUERIES.length]
    return {
      agent_ens: AGENT_ENS,
      buyer_address: randomBuyerAddress(),
      query,
      response: `[Demo response] Based on applicable Indian law and Delhi High Court precedents: ${query.slice(0, 80)}... [This is a seeded demo hire for hackathon purposes.]`,
      usdc_paid: PRICE_USDC,
      payment_tx_hash: randomTxHash(),
      attestation_tx_hash: randomTxHash(),
      hired_at: randomTimestamp(30 - daysAgo),
    }
  })

  // Insert in batches of 10
  let inserted = 0
  for (let i = 0; i < hires.length; i += 10) {
    const batch = hires.slice(i, i + 10)
    const { error } = await supabase.from('hires').insert(batch)
    if (error) {
      console.error(`  batch ${i / 10 + 1} error: ${error.message}`)
    } else {
      inserted += batch.length
      console.log(`  inserted batch ${i / 10 + 1}: ${inserted}/${HIRE_COUNT}`)
    }
  }

  // Update agent counters
  const { data: agent } = await supabase
    .from('agents')
    .select('total_hires, lifetime_usdc_earned')
    .eq('ens_name', AGENT_ENS)
    .single()

  const newHires = (agent?.total_hires ?? 0) + inserted
  const newEarned = (agent?.lifetime_usdc_earned ?? 0) + inserted * PRICE_USDC

  await supabase
    .from('agents')
    .update({ total_hires: newHires, lifetime_usdc_earned: Number(newEarned.toFixed(2)) })
    .eq('ens_name', AGENT_ENS)

  console.log(`\nAgent updated: total_hires=${newHires}, lifetime_usdc=${newEarned.toFixed(2)}`)
  console.log(`Done. Inserted ${inserted} hires.`)
}

main().catch((e) => { console.error(e); process.exit(1) })

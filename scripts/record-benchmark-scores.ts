/**
 * record-benchmark-scores.ts — records existing benchmark scores on-chain for tokens 1,2,3
 * Run: npx tsx scripts/record-benchmark-scores.ts
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { INFT_ABI } from '../lib/contracts/abis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const RPC = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!
const INFT_ADDR = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS!

const AGENTS = [
  { ens: 'vidhi.sg.pariksha.eth', tokenId: 1 },
  { ens: 'vidhi.ae.pariksha.eth', tokenId: 2 },
  { ens: 'vidhi.us.pariksha.eth', tokenId: 3 },
]

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const signer = new ethers.Wallet(PRIVATE_KEY, provider)
  const inft = new ethers.Contract(INFT_ADDR, INFT_ABI, signer)

  for (const { ens, tokenId } of AGENTS) {
    const { data: agent } = await supabase
      .from('agents')
      .select('current_score')
      .eq('ens_name', ens)
      .single()

    const score = agent?.current_score ?? 0
    if (!score) { console.log(`${ens}: no score — skipping`); continue }

    console.log(`${ens}: recording score ${score} for token ${tokenId}...`)
    try {
      const tx = await inft.recordParikshaRun(BigInt(tokenId), BigInt(Math.round(score * 10)))
      const receipt = await tx.wait()
      console.log(`  ✓ tx: ${tx.hash} (block ${receipt?.blockNumber})`)

      // Update run record with tx hash
      await supabase
        .from('pariksha_runs')
        .update({ attestation_tx_hash: tx.hash })
        .eq('agent_ens', ens)
        .is('attestation_tx_hash', null)
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`)
    }
  }

  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })

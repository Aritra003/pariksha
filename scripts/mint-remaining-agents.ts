/**
 * mint-remaining-agents.ts — mints iNFTs for sg, ae, us agents (tokens 1,2,3)
 * Run: npx tsx scripts/mint-remaining-agents.ts
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

import { ethers } from 'ethers'
import { INFT_ABI } from '../lib/contracts/abis'

const RPC = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!
const INFT_ADDR = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS!

const AGENTS = [
  {
    ens: 'vidhi.sg.pariksha.eth',
    jurisdiction: 'Singapore',
    specialty: 'SIAC arbitration, SICC international commercial litigation',
  },
  {
    ens: 'vidhi.ae.pariksha.eth',
    jurisdiction: 'UAE-DIFC',
    specialty: 'DIFC Courts, DIAC arbitration, UAE commercial law',
  },
  {
    ens: 'vidhi.us.pariksha.eth',
    jurisdiction: 'US',
    specialty: 'US securities law, Delaware corporate governance, M&A',
  },
]

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const signer = new ethers.Wallet(PRIVATE_KEY, provider)
  const inft = new ethers.Contract(INFT_ADDR, INFT_ABI, signer)

  console.log('=== Mint Remaining Agents ===')
  console.log('Deployer:', signer.address)
  console.log('iNFT:', INFT_ADDR)
  console.log('RPC:', RPC)

  for (const agent of AGENTS) {
    console.log(`\nMinting ${agent.ens}...`)
    try {
      const tx = await inft.mint(
        signer.address,
        agent.ens,
        agent.jurisdiction,
        agent.specialty,
        `ipfs://placeholder-${agent.ens}-metadata`
      )
      const receipt = await tx.wait()
      console.log(`  ✓ tx: ${tx.hash} (block ${receipt?.blockNumber})`)
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message.slice(0, 120) : String(err)}`)
    }
  }

  // Read back all tokens
  console.log('\nVerifying tokens:')
  for (let i = 0; i < 4; i++) {
    try {
      const agent = await inft.getAgent(BigInt(i))
      console.log(`  token ${i}: ${agent.ensName} (${agent.jurisdiction})`)
    } catch {
      console.log(`  token ${i}: not found`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

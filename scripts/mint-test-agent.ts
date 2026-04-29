/**
 * Run after deploying contracts:
 *   pnpm tsx scripts/mint-test-agent.ts
 *
 * Requires in .env.local:
 *   DEPLOYER_PRIVATE_KEY=0x...
 *   NEXT_PUBLIC_INFT_CONTRACT_ADDRESS=0x...
 *   NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.drpc.org  (or zerog_galileo RPC)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { INFT_ABI } from '../lib/contracts/abis'

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
const INFT_ADDRESS = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS as `0x${string}`
const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? 'https://sepolia.drpc.org'

if (!PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY not set in .env.local')
if (!INFT_ADDRESS || INFT_ADDRESS === '0x0000000000000000000000000000000000000000') {
  throw new Error('NEXT_PUBLIC_INFT_CONTRACT_ADDRESS not set — deploy contracts first')
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY)
  const chain = sepolia // TODO: change to the zerog chain object if deployed to 0G Galileo

  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) })
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) })

  console.log('Deployer:', account.address)
  console.log('iNFT contract:', INFT_ADDRESS)
  console.log('Minting Vidhi — Delhi HC...')

  const hash = await walletClient.writeContract({
    address: INFT_ADDRESS,
    abi: INFT_ABI,
    functionName: 'mint',
    args: [
      account.address,
      'delhi.in.pariksha.eth',
      'India',
      'Delhi High Court commercial litigation, Section 138 NI Act',
      'ipfs://placeholder-vidhi-delhi-metadata',
    ],
  })

  console.log('Tx hash:', hash)
  console.log('Waiting for confirmation...')

  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log('Block:', receipt.blockNumber, '| Status:', receipt.status)

  // Read back the minted agent (tokenId 0 = first mint)
  const agent = await publicClient.readContract({
    address: INFT_ADDRESS,
    abi: INFT_ABI,
    functionName: 'getAgent',
    args: [BigInt(0)],
  })

  console.log('\nMinted agent (tokenId 0):')
  console.log('  ENS:', agent.ensName)
  console.log('  Jurisdiction:', agent.jurisdiction)
  console.log('  Specialty:', agent.specialty)
  console.log('  Active:', agent.active)
  console.log('\nTokenId: 0')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

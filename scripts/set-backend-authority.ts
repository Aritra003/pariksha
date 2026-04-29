/**
 * set-backend-authority.ts — sets backendAuthority on iNFT and Badge contracts.
 * Run once after deployment:
 *   pnpm tsx scripts/set-backend-authority.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') })

import { ethers } from 'ethers'
import { INFT_ABI, BADGE_ABI } from '../lib/contracts/abis'

const RPC = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!
const INFT_ADDR = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS!
const BADGE_ADDR = process.env.NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS!

if (!PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY not set')
if (!INFT_ADDR || INFT_ADDR === '0x0000000000000000000000000000000000000000')
  throw new Error('NEXT_PUBLIC_INFT_CONTRACT_ADDRESS not set')
if (!BADGE_ADDR || BADGE_ADDR === '0x0000000000000000000000000000000000000000')
  throw new Error('NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS not set')

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)
  const signer = new ethers.Wallet(PRIVATE_KEY, provider)
  const authority = signer.address

  console.log('Deployer / authority address:', authority)
  console.log('RPC:', RPC)

  // Set on iNFT
  console.log('\nSetting backendAuthority on iNFT...')
  const inft = new ethers.Contract(INFT_ADDR, INFT_ABI, signer)
  try {
    const tx = await inft.setBackendAuthority(authority)
    const receipt = await tx.wait()
    console.log('  iNFT tx:', tx.hash, '| block:', receipt?.blockNumber)
  } catch (e) {
    console.error('  iNFT error:', e instanceof Error ? e.message : e)
  }

  // Set on Badge
  console.log('\nSetting backendAuthority on Badge...')
  const badge = new ethers.Contract(BADGE_ADDR, BADGE_ABI, signer)
  try {
    const tx = await badge.setBackendAuthority(authority)
    const receipt = await tx.wait()
    console.log('  Badge tx:', tx.hash, '| block:', receipt?.blockNumber)
  } catch (e) {
    console.error('  Badge error:', e instanceof Error ? e.message : e)
  }

  // Verify
  console.log('\nVerifying...')
  const inftAuth = await inft.backendAuthority()
  const badgeAuth = await badge.backendAuthority()
  console.log('  iNFT.backendAuthority:', inftAuth)
  console.log('  Badge.backendAuthority:', badgeAuth)

  if (inftAuth.toLowerCase() === authority.toLowerCase() &&
      badgeAuth.toLowerCase() === authority.toLowerCase()) {
    console.log('\n✓ Both contracts now have the correct backendAuthority.')
  } else {
    console.error('\n✗ Authority mismatch — check contract ownership.')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

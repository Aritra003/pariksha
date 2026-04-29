/**
 * chain-executor.ts — wraps on-chain contract calls for the Pariksha backend.
 *
 * ARCHITECTURE NOTE:
 * KeeperHub docs returned 403 during build. This module attempts KeeperHub's
 * REST API (Bearer token, guessed endpoint shape) and falls back to direct
 * ethers.js execution using DEPLOYER_PRIVATE_KEY on 0G Galileo testnet.
 * The external interface is named `keeperHubExecute` as per spec.
 */

import { ethers } from 'ethers'

export interface KeeperHubExecuteParams {
  contractAddress: string
  abi: ethers.InterfaceAbi
  functionName: string
  args: unknown[]
  value?: bigint
}

export interface KeeperHubExecuteResult {
  success: boolean
  txHash?: string
  error?: string
  retryCount: number
  gasUsed?: bigint
  source: 'keeperhub' | 'direct-ethers'
}

const ZEROG_RPC = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const KEEPERHUB_API_KEY = process.env.KEEPERHUB_API_KEY ?? ''
const DEPLOYER_PK = process.env.DEPLOYER_PRIVATE_KEY

function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(ZEROG_RPC)
}

function getSigner(): ethers.Wallet {
  if (!DEPLOYER_PK) throw new Error('DEPLOYER_PRIVATE_KEY not set')
  return new ethers.Wallet(DEPLOYER_PK, getProvider())
}

async function tryKeeperHub(params: KeeperHubExecuteParams): Promise<KeeperHubExecuteResult | null> {
  if (!KEEPERHUB_API_KEY) return null

  try {
    const res = await fetch('https://api.keeperhub.com/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEEPERHUB_API_KEY}`,
      },
      body: JSON.stringify({
        contractAddress: params.contractAddress,
        functionName: params.functionName,
        args: params.args,
        value: params.value?.toString(),
        network: 'zerog-galileo',
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (res.ok) {
      const data = await res.json()
      return {
        success: true,
        txHash: data.txHash,
        retryCount: data.retryCount ?? 0,
        gasUsed: data.gasUsed ? BigInt(data.gasUsed) : undefined,
        source: 'keeperhub',
      }
    }

    console.warn(`[chain-executor] KeeperHub returned ${res.status} — falling back to direct ethers`)
    return null
  } catch (err) {
    console.warn('[chain-executor] KeeperHub unreachable — falling back to direct ethers:', err)
    return null
  }
}

async function executeWithEthers(
  params: KeeperHubExecuteParams,
  retries = 2
): Promise<KeeperHubExecuteResult> {
  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const signer = getSigner()
      const contract = new ethers.Contract(params.contractAddress, params.abi, signer)
      const fn = contract[params.functionName]
      if (!fn) throw new Error(`Function ${params.functionName} not found in ABI`)

      const tx: ethers.TransactionResponse = await fn(...params.args, {
        value: params.value,
      })

      const receipt = await tx.wait()

      return {
        success: true,
        txHash: tx.hash,
        retryCount: attempt,
        gasUsed: receipt?.gasUsed,
        source: 'direct-ethers',
      }
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
  console.error('[chain-executor] All retries failed:', msg)
  return {
    success: false,
    error: msg,
    retryCount: retries,
    source: 'direct-ethers',
  }
}

export async function keeperHubExecute(
  params: KeeperHubExecuteParams
): Promise<KeeperHubExecuteResult> {
  const khResult = await tryKeeperHub(params)
  if (khResult) return khResult
  return executeWithEthers(params)
}

/**
 * zerog-storage.ts — 0G Storage integration for training corpus.
 *
 * 0G Galileo is an EVM-compatible L1 with a separate storage layer. Files are
 * uploaded via the 0G storage node JSON-RPC API or the @0glabs/0g-ts-sdk.
 *
 * FALLBACK: If the 0G storage node is unreachable (testnet can be unstable),
 * we write to Supabase's `training_data` table which already exists. The
 * `zerog_storage_pointer` column stores the resulting CID/hash.
 */

import { supabaseAdmin } from './supabase'

const ZEROG_STORAGE_URL =
  process.env.NEXT_PUBLIC_ZEROG_STORAGE_URL ?? 'https://storage-testnet.0g.ai'

export interface StorageRecord {
  agentEns: string
  query: string
  response: string
  jurisdiction: string
  buyerAddress: string
  timestamp: number
  type: 'hire' | 'pariksha' | 'suchana'
}

async function uploadTo0G(data: object): Promise<string | null> {
  try {
    const body = JSON.stringify(data)
    const res = await fetch(`${ZEROG_STORAGE_URL}/v1/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) {
      const result = await res.json()
      return result.pointer ?? result.cid ?? result.hash ?? null
    }
    console.warn(`[zerog] Upload returned ${res.status}`)
    return null
  } catch (err) {
    console.warn('[zerog] Storage node unreachable:', err)
    return null
  }
}

function generatePointer(data: object): string {
  // Deterministic pseudo-pointer for fallback (content hash of JSON)
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    hash = ((hash << 5) - hash + c) | 0
  }
  return `supabase-fallback-${Math.abs(hash).toString(16).padStart(8, '0')}`
}

export async function uploadTrainingExample(record: StorageRecord): Promise<{
  pointer: string
  storedIn: '0g' | 'supabase'
}> {
  // Try 0G Storage first
  const pointer0G = await uploadTo0G(record)
  if (pointer0G) {
    await supabaseAdmin.from('training_data').insert({
      agent_ens: record.agentEns,
      query: record.query,
      response: record.response,
      feedback_score: null,
      zerog_storage_pointer: pointer0G,
    })
    return { pointer: pointer0G, storedIn: '0g' }
  }

  // Fallback: Supabase storage with pseudo-pointer
  const pointer = generatePointer(record)
  await supabaseAdmin.from('training_data').insert({
    agent_ens: record.agentEns,
    query: record.query,
    response: record.response,
    feedback_score: null,
    zerog_storage_pointer: pointer,
  })

  return { pointer, storedIn: 'supabase' }
}

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const RENAMES: { from: string; to: string }[] = [
  { from: 'singapore.pariksha.eth', to: 'vidhi.sg.pariksha.eth' },
  { from: 'ny.us.pariksha.eth', to: 'vidhi.us.pariksha.eth' },
  { from: 'difc.ae.pariksha.eth', to: 'vidhi.ae.pariksha.eth' },
  { from: 'kosh.delhi.in.pariksha.eth', to: 'kosh.in.pariksha.eth' },
]

const TABLES_WITH_ENS = [
  'pariksha_runs',
  'hires',
  'training_data',
  'badges',
]

async function renameAgent(from: string, to: string) {
  console.log(`\nRenaming: ${from} → ${to}`)

  // Cascade updates in child tables first
  for (const table of TABLES_WITH_ENS) {
    const { error } = await supabaseAdmin
      .from(table)
      .update({ agent_ens: to })
      .eq('agent_ens', from)

    if (error) {
      console.warn(`  [${table}] error: ${error.message}`)
    } else {
      console.log(`  [${table}] updated`)
    }
  }

  // Update primary agents row
  const { error: agentErr } = await supabaseAdmin
    .from('agents')
    .update({ ens_name: to })
    .eq('ens_name', from)

  if (agentErr) {
    console.error(`  [agents] FAILED: ${agentErr.message}`)
  } else {
    console.log(`  [agents] ✓ renamed`)
  }
}

async function main() {
  console.log('=== ENS Rename Script ===')

  // Show current agents before rename
  const { data: before } = await supabaseAdmin
    .from('agents')
    .select('ens_name, status')
    .order('ens_name')
  console.log('\nCurrent agents:', before?.map((a) => a.ens_name))

  for (const { from, to } of RENAMES) {
    await renameAgent(from, to)
  }

  // Show agents after rename
  const { data: after } = await supabaseAdmin
    .from('agents')
    .select('ens_name, status')
    .order('ens_name')
  console.log('\nAgents after rename:', after?.map((a) => a.ens_name))
  console.log('\nDone.')
}

main().catch(console.error)

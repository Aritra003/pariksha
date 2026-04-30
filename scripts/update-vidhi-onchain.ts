import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Vidhi-Delhi (delhi.in.pariksha.eth) — token 0 minted on 0G Galileo
// iNFT contract: 0xBcf4E24835fE496ba8426A84b22dd338E181BC33
// Badge contract: 0x48f611D77d18ad446C65E174C3C9EED42BaF3c0A
// Attestation contract: 0xfcb1F7eb5e163464939969bf2fe5f82fC8ad03A2
// Deployer/authority: 0x3f308C4ddc76570737326d3bD828511A4853680c

const UPDATES: { ens_name: string; inft_token_id: number; owner_address: string; inft_address: string }[] = [
  {
    ens_name: 'delhi.in.pariksha.eth',
    inft_token_id: 0,
    owner_address: '0x3f308C4ddc76570737326d3bD828511A4853680c',
    inft_address: '0xBcf4E24835fE496ba8426A84b22dd338E181BC33',
  },
  {
    ens_name: 'vidhi.sg.pariksha.eth',
    inft_token_id: 1,
    owner_address: '0x3f308C4ddc76570737326d3bD828511A4853680c',
    inft_address: '0xBcf4E24835fE496ba8426A84b22dd338E181BC33',
  },
  {
    ens_name: 'vidhi.ae.pariksha.eth',
    inft_token_id: 2,
    owner_address: '0x3f308C4ddc76570737326d3bD828511A4853680c',
    inft_address: '0xBcf4E24835fE496ba8426A84b22dd338E181BC33',
  },
  {
    ens_name: 'vidhi.us.pariksha.eth',
    inft_token_id: 3,
    owner_address: '0x3f308C4ddc76570737326d3bD828511A4853680c',
    inft_address: '0xBcf4E24835fE496ba8426A84b22dd338E181BC33',
  },
]

async function main() {
  console.log('=== Update On-Chain Info Script ===')

  for (const u of UPDATES) {
    const { error } = await supabaseAdmin
      .from('agents')
      .update({
        inft_token_id: u.inft_token_id,
        owner_address: u.owner_address,
        inft_address: u.inft_address,
      })
      .eq('ens_name', u.ens_name)

    if (error) {
      console.error(`✗ ${u.ens_name}: ${error.message}`)
    } else {
      console.log(`✓ ${u.ens_name}: token_id=${u.inft_token_id}`)
    }
  }

  const { data } = await supabaseAdmin
    .from('agents')
    .select('ens_name, inft_token_id, owner_address, inft_address')
    .in('ens_name', UPDATES.map((u) => u.ens_name))

  console.log('\nVerification:', JSON.stringify(data, null, 2))
}

main().catch(console.error)

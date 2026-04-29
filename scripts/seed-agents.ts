import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VIDHI_PROXY_URL = process.env.NYAYAMITRA_VIDHI_PROXY_URL ?? ''
const KOSH_PROXY_URL = process.env.NYAYAMITRA_KOSH_PROXY_URL ?? ''
const SAHAYAK_PROXY_URL = process.env.NYAYAMITRA_SAHAYAK_PROXY_URL ?? ''
const RAKSHA_PROXY_URL = process.env.NYAYAMITRA_RAKSHA_PROXY_URL ?? ''

const DEMO_READY_AGENTS = [
  {
    ens_name: 'delhi.in.pariksha.eth',
    display_name: 'Vidhi — Delhi HC',
    jurisdiction: 'India',
    specialty: 'Delhi High Court commercial litigation, Section 138 NI Act',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      "You are Vidhi, NyayaMitra's legal research agent. You specialize in Delhi High Court commercial litigation. Cite only verified Indian case law. If uncertain, say so explicitly. Apply the RAG Grounding Directive: never fabricate legislation, never conflate holdings, never paraphrase past the source.",
    price_usdc: 0.05,
    status: 'demo_ready',
  },
  {
    ens_name: 'singapore.pariksha.eth',
    display_name: 'Vidhi — Singapore',
    jurisdiction: 'Singapore',
    specialty: 'SIAC international commercial arbitration',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Vidhi, specialized in Singapore International Arbitration Centre matters. Apply Singapore International Arbitration Act framework. Cite verified SIAC awards and Singapore High Court decisions only.',
    price_usdc: 0.05,
    status: 'demo_ready',
  },
  {
    ens_name: 'difc.ae.pariksha.eth',
    display_name: 'Vidhi — UAE-DIFC',
    jurisdiction: 'UAE-DIFC',
    specialty: 'DIFC commercial contracts, English common law',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Vidhi, specialized in DIFC commercial law. Apply DIFC Contract Law and English common law principles. Cite verified DIFC Courts decisions.',
    price_usdc: 0.05,
    status: 'demo_ready',
  },
  {
    ens_name: 'ny.us.pariksha.eth',
    display_name: 'Vidhi — US Commercial',
    jurisdiction: 'US',
    specialty: 'US commercial contracts, securities',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Vidhi, specialized in US commercial contract law and securities regulation. Cite verified US case law from federal and state appellate courts. Note jurisdictional variations.',
    price_usdc: 0.05,
    status: 'demo_ready',
  },
]

const LISTED_AGENTS = [
  {
    ens_name: 'kosh.delhi.in.pariksha.eth',
    display_name: 'Kosh — Delhi Precedents',
    jurisdiction: 'India',
    specialty: 'Indian case law citation verification',
    backend_endpoint: KOSH_PROXY_URL,
    system_prompt:
      'You are Kosh, specialized in verifying and citing Indian case law. You search verified databases to confirm case citations before referencing them.',
    price_usdc: 0.05,
    status: 'listed',
  },
  {
    ens_name: 'sahayak.in.pariksha.eth',
    display_name: 'Sahayak — General Indian Q&A',
    jurisdiction: 'India',
    specialty: 'Plain-language Indian legal Q&A',
    backend_endpoint: SAHAYAK_PROXY_URL,
    system_prompt:
      'You are Sahayak, specialized in explaining Indian law in plain language accessible to non-lawyers. You break down legal concepts clearly without jargon.',
    price_usdc: 0.01,
    status: 'listed',
  },
  {
    ens_name: 'raksha.delhi.in.pariksha.eth',
    display_name: 'Raksha — Adversarial Review',
    jurisdiction: 'India',
    specialty: '5-persona adversarial debate + judge',
    backend_endpoint: RAKSHA_PROXY_URL,
    system_prompt:
      'You are Raksha, specialized in adversarial legal analysis. You simulate 5 distinct personas — plaintiff counsel, defense counsel, judge, legal scholar, and devil\'s advocate — then synthesize a balanced judicial opinion.',
    price_usdc: 0.25,
    status: 'demo_ready',
  },
  {
    ens_name: 'prakriya.in.pariksha.eth',
    display_name: 'Prakriya — Court Procedure',
    jurisdiction: 'India',
    specialty: 'Indian court procedure navigation',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Prakriya, specialized in Indian court procedural law. You guide users through CPC, CrPC, and specific court filing requirements.',
    price_usdc: 0.05,
    status: 'listed',
  },
  {
    ens_name: 'bhasha.in.pariksha.eth',
    display_name: 'Bhasha — Multilingual Voice',
    jurisdiction: 'India',
    specialty: '12-language voice legal interface',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Bhasha, specialized in multilingual legal assistance. You can explain Indian legal concepts in Hindi, Tamil, Bengali, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, and English.',
    price_usdc: 0.05,
    status: 'listed',
  },
  {
    ens_name: 'suchana.in.pariksha.eth',
    display_name: 'Suchana — Daily Research Scout',
    jurisdiction: 'India',
    specialty: 'Daily legal news + judgment monitoring',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Suchana, specialized in monitoring and summarizing daily Indian legal developments. You track new judgments, regulatory notifications, and policy updates.',
    price_usdc: 0.02,
    status: 'listed',
  },
  {
    ens_name: 'ganit.in.pariksha.eth',
    display_name: 'Ganit — Fee Calculator',
    jurisdiction: 'India',
    specialty: 'Court fees + stamp duty calculation',
    backend_endpoint: VIDHI_PROXY_URL,
    system_prompt:
      'You are Ganit, specialized in calculating Indian court fees, stamp duty, and legal costs across all states. You apply the Court Fees Act and relevant state schedules.',
    price_usdc: 0.01,
    status: 'listed',
  },
]

async function seed() {
  const allAgents = [...DEMO_READY_AGENTS, ...LISTED_AGENTS]

  console.log(`Seeding ${allAgents.length} agents into Supabase...`)

  const { data, error } = await supabaseAdmin
    .from('agents')
    .upsert(allAgents, { onConflict: 'ens_name' })
    .select('ens_name, status')

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log('Seeded agents:')
  data?.forEach((a) => console.log(`  ✓ ${a.ens_name} (${a.status})`))
  console.log(`\nDone. ${data?.length ?? 0} agents upserted.`)
}

seed()

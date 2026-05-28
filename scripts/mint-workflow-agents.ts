/**
 * Mint the 6 named-workflow iNFTs on 0G Galileo (Priority A).
 *
 * Workflows are task-scoped agents (cheque-bounce notice, RERA complaint,
 * stamp duty calc, MSME vendor review, cross-border NDA triage, GST notice
 * response). They appear under the /workflows route, not in the main agent
 * grid, and have higher per-call prices (0.10–0.25 USDC).
 *
 * IRREVERSIBLE: this mints 6 new ERC-721 tokens. Run only after the user
 * approves. Dry-run is the default; pass `--apply` to execute.
 *
 * Usage:
 *   pnpm tsx scripts/mint-workflow-agents.ts          # dry-run
 *   pnpm tsx scripts/mint-workflow-agents.ts --apply  # execute
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import { INFT_ABI } from '../lib/contracts/abis'

const APPLY = process.argv.includes('--apply')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY
const inftAddress = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS
const rpcUrl = process.env.NEXT_PUBLIC_ZEROG_GALILEO_RPC ?? 'https://evmrpc-testnet.0g.ai'
const deployerPk = process.env.DEPLOYER_PRIVATE_KEY

if (!supabaseUrl || !supabaseKey || !inftAddress || !deployerPk) {
  console.error(
    'Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, NEXT_PUBLIC_INFT_CONTRACT_ADDRESS, DEPLOYER_PRIVATE_KEY'
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const provider = new ethers.JsonRpcProvider(rpcUrl)
const signer = new ethers.Wallet(deployerPk, provider)
const inftContract = new ethers.Contract(inftAddress, INFT_ABI, signer)

interface WorkflowDef {
  ens: string
  displayName: string
  jurisdiction: string
  specialty: string
  priceUsdc: number
  systemPrompt: string
}

const WORKFLOWS: WorkflowDef[] = [
  {
    ens: 'cheque-bounce.in.pariksha.eth',
    displayName: 'Cheque Bounce Notice Drafter',
    jurisdiction: 'India',
    specialty: 'Drafts Section 138 NI Act demand notices for bounced cheques with limitation tracking.',
    priceUsdc: 0.15,
    systemPrompt: `You are a specialist legal workflow agent for drafting Section 138 Negotiable Instruments Act demand notices for bounced cheques in India.

When given structured inputs (cheque_details, payee_address, notice_date), produce JSON output with these fields:
  notice_text: full text of the demand notice, formatted as a formal legal notice
  statutory_basis: the specific NI Act section invocations (138 + 142)
  limitation_deadline: ISO date computed from notice_date + 15 days payment window + 1 month filing window
  signature_block: name, designation, address block at the foot of the notice

Cite Section 138 NI Act, the 15-day payment window under Section 138(c), and the 1-month filing window under Section 142(b). Reference cause-of-action accrual per Delhi HC in Umesh Bhargava v. Vijay Shankar Pathak (2023) if relevant.

This is not legal advice and is not a substitute for qualified counsel admitted to the Indian bar.

Return ONLY valid JSON. Do not include markdown fences.`,
  },
  {
    ens: 'rera-complaint.in.pariksha.eth',
    displayName: 'RERA Complaint Builder',
    jurisdiction: 'India',
    specialty: 'Drafts RERA complaints against builders for delay, refund, or defect grievances.',
    priceUsdc: 0.20,
    systemPrompt: `You are a specialist legal workflow agent for drafting RERA (Real Estate Regulation Act 2016) complaints against builders / promoters in Indian state RERA authorities.

When given structured inputs (project_id, state, grievance_type, complainant_details, relief_sought), produce JSON output with these fields:
  complaint_draft: full text of the RERA complaint
  rera_section_refs: cited sections of RERA 2016 (e.g., Section 7, 11, 18, 19)
  jurisdiction_state_rera: the specific state RERA Authority and rules invoked
  supporting_docs_list: ordered list of documents the complainant must annex

Cite RERA 2016 sections precisely. State-specific RERA rules apply — be explicit about which state's rules govern.

This is not legal advice and is not a substitute for qualified counsel admitted to the Indian bar.

Return ONLY valid JSON. Do not include markdown fences.`,
  },
  {
    ens: 'stamp-duty.in.pariksha.eth',
    displayName: 'Stamp Duty + Registration Workflow',
    jurisdiction: 'India',
    specialty: 'Calculates Indian stamp duty and registration fees per state with statutory basis.',
    priceUsdc: 0.10,
    systemPrompt: `You are a specialist legal workflow agent for computing Indian stamp duty and registration fees per state.

When given structured inputs (instrument_type, state, consideration_amount_inr, parties, execution_date), produce JSON output with these fields:
  stamp_duty_inr: computed stamp duty in INR
  registration_fee_inr: registration fee in INR
  statutory_basis: cite the Indian Stamp Act 1899 + the relevant state Stamp Act schedule (e.g. Delhi, Maharashtra Stamp Act)
  state_amendment_refs: any recent state amendments affecting the rate
  payment_method_options: e-stamp paper, franking, e-stamping portal — what applies in the state

Show the calculation working. Where the state has slab rates, list each slab.

This is not legal advice and is not a substitute for qualified counsel.

Return ONLY valid JSON. Do not include markdown fences.`,
  },
  {
    ens: 'msme-vendor.in.pariksha.eth',
    displayName: 'MSME Vendor Agreement Reviewer',
    jurisdiction: 'India',
    specialty: 'Reviews vendor agreements for MSME Act Section 15-18 compliance and payment-term risks.',
    priceUsdc: 0.20,
    systemPrompt: `You are a specialist legal workflow agent for reviewing vendor agreements under the Indian MSME Development Act 2006 (sections 15-18) governing payment timelines and MSEFC dispute resolution.

When given structured inputs (contract_text, vendor_role, dispute_clause_check), produce JSON output with these fields:
  msme_act_compliance_issues: list of clauses in the contract that violate or undermine MSMED Act Sections 15-18
  section_15_18_findings: specific findings on payment timeline (45-day rule), interest on delayed payment (Section 16), and dispute resolution (Section 18 MSEFC)
  recommended_amendments: list of clause-by-clause amendments to bring the contract into compliance
  risk_summary: one-paragraph summary of legal risk

Cite MSMED Act sections by number. Differentiate buyer's vs seller's risk exposure.

This is not legal advice and is not a substitute for qualified counsel.

Return ONLY valid JSON. Do not include markdown fences.`,
  },
  {
    ens: 'cross-border-nda.pariksha.eth',
    displayName: 'Cross-Border NDA Triager (IN/SG/AE-DIFC)',
    jurisdiction: 'India',
    specialty: 'Triages cross-border NDAs across IN/SG/AE-DIFC for governing law, conflicts, and data-protection compliance.',
    priceUsdc: 0.25,
    systemPrompt: `You are a specialist legal workflow agent for triaging cross-border NDAs across India, Singapore, and UAE-DIFC. You analyse governing-law clauses, conflict-of-law risks, and data-protection compliance under DPDP (India), PDPA (Singapore), and DIFC DP Law.

When given structured inputs (nda_text, jurisdictions, data_protection_check), produce JSON output with these fields:
  governing_law_recommendation: which of the three jurisdictions' governing law is most defensible given the deal context, with reasoning
  conflict_clauses: specific clauses with cross-jurisdictional conflict risk
  dp_compliance_by_jurisdiction: per-jurisdiction analysis of personal-data clauses under DPDP / PDPA / DIFC DP Law
  enforceability_risks_by_jurisdiction: per-jurisdiction enforceability risks (e.g. NYC enforcement in DIFC, contract-conformity in SG)

Cite specific statutes (DPDP 2023, PDPA 2012/2020, DIFC Data Protection Law 2020) by section. Be jurisdiction-specific.

This is not legal advice and is not a substitute for qualified counsel admitted in each jurisdiction.

Return ONLY valid JSON. Do not include markdown fences.`,
  },
  {
    ens: 'gst-notice.in.pariksha.eth',
    displayName: 'GST Notice Response Drafter',
    jurisdiction: 'India',
    specialty: 'Drafts responses to GST department notices (SCN/DRC-01/ASMT-10) with CGST section citations.',
    priceUsdc: 0.15,
    systemPrompt: `You are a specialist legal workflow agent for drafting responses to Indian GST notices (SCN, DRC-01, DRC-01A, ASMT-10, ASMT-11, GSTR-3A, etc.).

When given structured inputs (notice_type, notice_text, taxpayer_details, dispute_grounds), produce JSON output with these fields:
  response_draft: full text of the response, addressed to the issuing officer
  cgst_section_refs: cited CGST Act sections (e.g. Section 73, 74, 75, 16, 17, 39) and CGST Rules invocations
  response_deadline: ISO date computed from notice date and statutory window (typically 30 days; differs by notice type)
  supporting_docs_required: list of documents the taxpayer must annex
  escalation_path: appellate / writ remedies if the response is rejected

Cite CGST Act sections precisely. Differentiate between section-73 (non-fraudulent) and section-74 (fraudulent) demand notices.

This is not legal advice and is not a substitute for qualified counsel / chartered accountant practice.

Return ONLY valid JSON. Do not include markdown fences.`,
  },
]

async function main() {
  console.log(`\n=== Mint Workflow Agents ${APPLY ? '(APPLY)' : '(DRY-RUN)'} ===\n`)
  console.log(`Will mint ${WORKFLOWS.length} workflow iNFTs to deployer ${signer.address}\n`)

  for (const w of WORKFLOWS) {
    console.log(`  ${w.ens}`)
    console.log(`    name:        ${w.displayName}`)
    console.log(`    jurisdiction: ${w.jurisdiction}`)
    console.log(`    price:       $${w.priceUsdc.toFixed(2)} USDC`)
    console.log('')
  }

  if (!APPLY) {
    console.log(`Re-run with --apply to mint these on 0G Galileo (chain 16602).\n`)
    return
  }

  for (const w of WORKFLOWS) {
    console.log(`── ${w.ens} ──`)

    const { data: existing } = await supabase
      .from('agents')
      .select('ens_name')
      .eq('ens_name', w.ens)
      .maybeSingle()

    if (existing) {
      console.log('  skipped: already exists in DB.')
      continue
    }

    try {
      const tx: ethers.TransactionResponse = await inftContract['mint'](
        signer.address,
        w.ens,
        w.jurisdiction,
        w.specialty,
        `ipfs://placeholder-${w.ens.split('.')[0]}-metadata`
      )
      const receipt = await tx.wait()
      console.log(`  ✓ minted, tx: ${tx.hash}`)

      const transferSig = ethers.id('Transfer(address,address,uint256)')
      const zeroTopic = ethers.zeroPadValue('0x00', 32)
      const mintLog = receipt?.logs.find(
        (l: { topics: readonly string[] }) =>
          l.topics[0] === transferSig && l.topics[1] === zeroTopic
      )
      let tokenId: number | null = null
      if (mintLog) tokenId = Number(BigInt(mintLog.topics[3]))

      const { error: insertErr } = await supabase.from('agents').insert({
        ens_name: w.ens,
        display_name: w.displayName,
        jurisdiction: w.jurisdiction,
        specialty: w.specialty,
        system_prompt: w.systemPrompt,
        price_usdc: w.priceUsdc,
        owner_address: signer.address,
        inft_token_id: tokenId,
        inft_address: inftAddress,
        backend_endpoint: 'https://pariksha-brown.vercel.app/api/proxy/anthropic-fallback',
        // type='workflow' separates these from generalist agents in /api/agents.
        type: 'workflow',
        // Team-curated workflows skip community trust review.
        status: 'trust_grandfathered',
        total_pariksha_runs: 0,
        total_hires: 0,
        current_score: null,
      })

      if (insertErr) {
        console.error(`  DB insert error: ${insertErr.message}`)
      } else {
        console.log(`  ✓ inserted into agents table (token #${tokenId})`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  mint failed: ${msg}`)
    }
  }

  console.log('\n=== Done ===\n')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})

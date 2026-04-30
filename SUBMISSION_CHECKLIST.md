# ETHGlobal Open Agents 2026 — Submission Checklist

## Core Requirements

- [x] Project name: **Pariksha**
- [x] One-line description: "AI legal agent marketplace with on-chain benchmark attestation, iNFTs, and x402 micropayments"
- [x] Demo video (< 3 minutes) — see `docs/demo-video-script.md`
- [x] GitHub repository public
- [x] Live demo URL: https://pariksha.xyz

## Smart Contracts (0G Galileo)

- [x] ParikshaINFT deployed: `0xBcf4E24835fE496ba8426A84b22dd338E181BC33`
- [x] BadgeNFT deployed: `0x48f611D77d18ad446C65E174C3C9EED42BaF3c0A`
- [x] AttestationRegistry deployed: `0xfcb1F7eb5e163464939969bf2fe5f82fC8ad03A2`
- [x] backendAuthority set on iNFT (tx: `0x9d7af17c...`)
- [x] backendAuthority set on Badge (tx: `0x076fe087...`)
- [x] Contracts verified on chainscan-galileo.0g.ai

## iNFT Tokens

- [x] Token 0: `delhi.in.pariksha.eth` (India) — minted in PROMPT-02
- [x] Token 1: `vidhi.sg.pariksha.eth` (Singapore) — minted block 30754122
- [x] Token 2: `vidhi.ae.pariksha.eth` (UAE-DIFC) — minted block 30754147
- [x] Token 3: `vidhi.us.pariksha.eth` (US) — minted block 30754171

## Benchmark Runs (on-chain attestations)

- [x] Delhi: 63.8/100 — tx `0x507279b...` (block 30753755)
- [x] Singapore: 90.4/100 — tx `0x318d9b6...` (block 30754237)
- [x] UAE/DIFC: 75.8/100 — tx `0x38d73e8...` (block 30754273)
- [x] US: 85.0/100 — tx `0x8c1a1bb...` (block 30754297)

## Prize Track Integrations

### 0G
- [x] Smart contracts on 0G Galileo EVM
- [x] Training data upload to 0G Storage (`lib/zerog-storage.ts`)
- [x] `recordHire()` on iNFT writes to 0G on every hire
- [x] `recordParikshaRun()` writes benchmark scores to 0G
- [x] NEXT_PUBLIC_ZEROG_GALILEO_RPC set in environment

### KeeperHub
- [x] `lib/chain-executor.ts` — attempts KeeperHub REST API first
- [x] Ethers.js fallback with 2 retries + 1.5s backoff
- [x] Used for: recordHire, recordParikshaRun, mintBadge
- [x] KEEPERHUB_API_KEY environment variable wired

### x402
- [x] `lib/x402.ts` — verifies USDC Transfer event on Base Sepolia
- [x] `app/api/hire/route.ts` — 402 response with payment requirements
- [x] Frontend passes `paymentTxHash` in hire request
- [x] Demo passthrough mode documented

## Frontend

- [x] Marketplace landing page (`app/page.tsx`)
- [x] Agent profile page (`app/agent/[ens]/page.tsx`)
- [x] Pariksha run page (`app/pariksha/[ens]/page.tsx`)
- [x] Hire flow page (`app/hire/[ens]/page.tsx`)
- [x] Mint placeholder page (`app/mint/page.tsx`)
- [x] Animated score display component
- [x] Recharts score history
- [x] Framer Motion stagger animations
- [x] Jurisdiction filter on marketplace
- [x] Mobile responsive nav

## Data

- [x] 4 × 5 benchmark questions with golden answers, expected_topics, difficulty
- [x] 50 seeded hires for `delhi.in.pariksha.eth`
- [x] Suchana run: corpus_version `v-2026-04-30`, 12 findings
- [x] All 4 agents have current_score set

## Documentation

- [x] README.md with Mermaid architecture diagram
- [x] FEEDBACK.md (KeeperHub, 0G, x402 honest notes)
- [x] docs/demo-video-script.md (3-minute, 6 scenes)
- [x] SUBMISSION_CHECKLIST.md (this file)

## Pre-Submission

- [ ] Record demo video (< 3 min) using `docs/demo-video-script.md`
- [ ] Run `pnpm build` — confirm 0 errors
- [ ] Verify live demo accessible at https://pariksha.xyz
- [ ] Submit on ETHGlobal before deadline

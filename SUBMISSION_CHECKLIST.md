# ETHGlobal Open Agents 2026 — Submission Checklist

## Repository

- [x] GitHub repo public and clean
- [x] README.md hackathon-optimized
- [x] LICENSE added (MIT)
- [x] .gitignore secured
- [x] SECURITY.md added
- [x] CONTRIBUTING.md added

## Deployment

- [x] All env vars on Vercel
- [x] Live demo: https://pariksha-brown.vercel.app
- [x] pnpm build passes with 0 errors

## Smart Contracts (0G Galileo)

- [x] Smart contracts deployed and verified on chainscan-galileo.0g.ai
- [x] ParikshaINFT: `0xBcf4E24835fE496ba8426A84b22dd338E181BC33`
- [x] BadgeNFT: `0x48f611D77d18ad446C65E174C3C9EED42BaF3c0A`
- [x] AttestationRegistry: `0xfcb1F7eb5e163464939969bf2fe5f82fC8ad03A2`
- [x] backendAuthority set on iNFT (tx: `0x9d7af17c...`)
- [x] backendAuthority set on Badge (tx: `0x076fe087...`)

## iNFT Tokens

- [x] Token 0: `delhi.in.pariksha.eth` (India) — minted in PROMPT-02
- [x] Token 1: `vidhi.sg.pariksha.eth` (Singapore) — minted block 30754122
- [x] Token 2: `vidhi.ae.pariksha.eth` (UAE-DIFC) — minted block 30754147
- [x] Token 3: `vidhi.us.pariksha.eth` (US) — minted block 30754171
- [x] Token 4: `test-sharma-legal.in.pariksha.eth` (community-minted via /mint page)

## Benchmark Runs (on-chain attestations)

- [x] Delhi: 63.8/100 — tx `0x507279b...` (block 30753755)
- [x] Singapore: 90.4/100 — tx `0x318d9b6...` (block 30754237)
- [x] UAE/DIFC: 75.8/100 — tx `0x38d73e8...` (block 30754273)
- [x] US: 85.0/100 — tx `0x8c1a1bb...` (block 30754297)

## Agents

- [x] 12 agents (11 official + 1 community) — all 11 official scored
- [x] 50 seeded hires for `delhi.in.pariksha.eth`
- [x] Suchana run: corpus_version `v-2026-04-30`, 12 findings

## Features

- [x] Mint Agent feature live (/mint page + /api/agents/mint)
- [x] Discovery layer deployed (skill.md, .well-known/ai-agent.json)
- [x] x402 integration — GET /api/proxy/:agent returns HTTP 402
- [x] On-chain attestations live (recordParikshaRun, recordHire, attest)
- [x] Badge auto-mint at score thresholds (Verified ≥80, Excellence ≥95)
- [x] Wallet picker simplified to MetaMask only
- [x] Pariksha benchmark supports all 11 agents via jurisdiction fallback

## Prize Track Integrations

### 0G
- [x] All 3 contracts on 0G Galileo EVM
- [x] Training data upload to 0G Storage (`lib/zerog-storage.ts`)
- [x] `recordHire()` on iNFT writes to 0G on every hire
- [x] `recordParikshaRun()` writes benchmark scores to 0G
- [x] NEXT_PUBLIC_ZEROG_GALILEO_RPC set in environment

### KeeperHub
- [x] `lib/chain-executor.ts` — attempts KeeperHub REST API first
- [x] Ethers.js fallback with 2 retries + 1.5s backoff
- [x] Used for: recordHire, recordParikshaRun, mintBadge
- [x] KEEPERHUB_API_KEY environment variable wired
- [x] FEEDBACK.md documents integration (eligible for $250 feedback bonus)

### x402
- [x] `lib/x402.ts` — verifies USDC Transfer event on Base Sepolia
- [x] GET /api/proxy/:agent returns HTTP 402 with payment payload
- [x] POST with payment_tx_hash triggers full on-chain hire + attestation
- [x] Demo passthrough mode for judging (no payment required)

## Documentation

- [x] README.md hackathon-optimized with architecture diagram
- [x] FEEDBACK.md (KeeperHub, 0G, x402 honest integration notes)
- [x] docs/demo-video-script.md (3-minute, 6 scenes)
- [x] SECURITY.md
- [x] CONTRIBUTING.md
- [x] SUBMISSION_CHECKLIST.md (this file)

## Pre-Submission — Manual Steps Remaining

- [ ] Record demo video (< 3 min) using `docs/demo-video-script.md`
- [ ] Add demo video URL to README.md
- [ ] Add repo description + topics + social preview on GitHub web UI
  - Description: "On-chain proving ground for legal AI agents. Verifiable competence. Permissionless hire."
  - Website: https://pariksha-brown.vercel.app
  - Topics: `ethereum` `web3` `legal-ai` `0g-galileo` `inft` `x402` `ens` `agentic-commerce` `keeperhub` `hackathon`
- [ ] Pin repo on GitHub profile
- [ ] Submit ETHGlobal submission form

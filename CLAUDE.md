# Pariksha — A NyayaMitra Product

## Session Context (Last updated: 2026-05-18 16:00)

### Current State

**Working:**
- 6 PariksaINFT agents minted on 0G Galileo testnet (chainId 16602, contract `0xBcf4E24835fE496ba8426A84b22dd338E181BC33`): delhi.in (token 0), vidhi.sg (1), vidhi.ae (2), vidhi.us (3), test-sharma-legal [archived] (4), **delaware.us (5, new this session)**.
- All 6 minted agents share canonical owner `0x3f308C4ddc76570737326d3bD828511A4853680c` (deployer wallet).
- Delaware specialist now has a real Pariksha score (**89.2**) and on-chain attestation (tx `0x55ebab0c…` block 33966011). VERIFIED badge minted on-chain (tx `0xf8438896…`).
- MCP routing in [app/api/mcp/route.ts](app/api/mcp/route.ts) correctly maps `US → vidhi.us`, `US-DE → delaware.us`, and post-archive routes (SG, AE-DIFC, Kosh) point at canonical ENS names.
- `agents` table cleaned up — 4 duplicate rows archived; only canonical post-rename ENS names are active.

**Known issues (pre-existing, not introduced this session):**
- All 6 minted INFTs use placeholder `tokenURI` of form `ipfs://placeholder-{ens}-metadata` — no real metadata pinned.
- `badges` table DB insert fails silently for VERIFIED/EXCELLENCE mints because [app/api/pariksha/run/route.ts:30-33](app/api/pariksha/run/route.ts#L30-L33) tries to insert a `tx_hash` field but the schema in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) defines only `badge_token_id`. On-chain mints succeed; DB just doesn't reflect them.
- `data/benchmark-questions.json` has only 4 question sets (delhi.in, vidhi.sg, vidhi.ae, vidhi.us). 8 jurisdictions remain unbenchmarked (KR, AE-Federal, UK, BH, QA, SA, IL, EU) plus Sanvidha (needs new `contract-review` category).
- The `vidhi.us` question set is substantively Delaware-corporate/federal-securities content. Delaware specialist benchmarked against it via the `US-DE` jurisdiction fallback — substantively correct, but semantically Delaware shares questions with the US generalist. Optionally rekey or duplicate questions under `delaware.us` later.

### Recent Changes

- [app/api/mcp/route.ts](app/api/mcp/route.ts) — **7-hunk edit** (untracked file, not yet git-added):
  - Added `'US-DE'` to jurisdiction enum
  - Split US/US-DE in descriptions
  - `US → vidhi.us.pariksha.eth`, new `US-DE → delaware.us.pariksha.eth`
  - Fixed post-archive stale routes: SG → `vidhi.sg`, AE-DIFC → `vidhi.ae`, precedent_lookup Kosh → `kosh.in`
- [app/api/pariksha/run/route.ts](app/api/pariksha/run/route.ts) — **1 line added** to `JURISDICTION_DEFAULT`: `'US-DE': 'vidhi.us.pariksha.eth'`
- Supabase `agents` table:
  - Archived: `singapore.pariksha.eth`, `difc.ae.pariksha.eth`, `ny.us.pariksha.eth`, `kosh.delhi.in.pariksha.eth`
  - Updated `delaware.us.pariksha.eth` row: `inft_token_id='5'`, `owner_address='0x3f30…680c'`, `current_score=89.2`, `total_pariksha_runs=1`
- New `pariksha_runs` row inserted for Delaware (id `a46fe974-0acd-4b84-b482-54a335382e96`).
- Memory updates:
  - Added [memory/project_tokenuri_placeholder.md](.claude/projects/-Users-aritrasarkhel-pariksha/memory/project_tokenuri_placeholder.md) — backlog for uniform real-metadata replacement.
  - Updated `memory/MEMORY.md` index.

### Next Steps

1. **Decide on the MCP routing file (`app/api/mcp/route.ts`)** — it's still untracked. Either git-add and commit the 7-hunk change, or decide if the routing belongs in a different module.
2. **Commit the `pariksha/run/route.ts` one-liner** alongside the MCP changes (single commit "fix US/US-DE routing + post-archive cleanups + Delaware enablement").
3. **Fix the badges table schema mismatch** — either add `tx_hash TEXT` column via a new migration, or change the route to insert `badge_token_id` per the existing schema. Backfill the missing Delaware VERIFIED badge row.
4. **Write Delaware-specific benchmark questions** if you want `delaware.us` to have its own keyed question set instead of sharing with `vidhi.us` (currently both point to the same 5 DGCL/securities questions).
5. **Dedicated session for benchmark question coverage** — 5-question sets for KR, AE-Federal, UK, BH, QA, SA, IL, EU + Sanvidha contract-review. Requires statutory citation research per jurisdiction. See [memory/project_benchmark_question_coverage.md](.claude/projects/-Users-aritrasarkhel-pariksha/memory/project_benchmark_question_coverage.md).
6. **Real IPFS metadata pipeline** for the 6 minted agents — uniform replacement, not piecemeal. See [memory/project_tokenuri_placeholder.md](.claude/projects/-Users-aritrasarkhel-pariksha/memory/project_tokenuri_placeholder.md).

### Key Decisions

- **Question routing for Delaware:** chose to add `'US-DE': 'vidhi.us.pariksha.eth'` to `JURISDICTION_DEFAULT` rather than rekey the JSON (option 1 of 3 considered). Why: substantively correct (vidhi.us questions are Delaware-scoped), keeps the existing vidhi.us benchmarked state intact, no JSON edit needed, deferred deeper differentiation.
- **Mint chain:** confirmed 0G Galileo (not Base Sepolia, which is only the USDC payment rail for x402). All 6 minted agents on the same chain — no cross-chain split. Attestations via `recordParikshaRun()` are on the same INFT contract.
- **Owner pattern:** all minted agents owned by the deployer wallet `0x3f30…680c`. Delaware mint matched the same pattern — no new ownership scheme introduced.
- **tokenURI:** matched the existing `ipfs://placeholder-{ens}-metadata` pattern exactly for Delaware. Not "better" or "worse" metadata than the existing 5 — uniform placeholder state. Logged as a backlog for uniform replacement.
- **MCP routing bundle:** chose to fix the 3 post-archive stale ENS routes (SG, AE-DIFC, Kosh) in the same diff as the US/US-DE change rather than splitting, because archiving without fixing would have broken MCP routing for SG/AE-DIFC/precedent_lookup immediately.
- **Backlog vs. write-now for question sets:** explicitly deferred writing new question sets for the 8 unbenchmarked jurisdictions to a dedicated session — needs real statutory citation research per jurisdiction.

### Previous Session Notes

(No previous session context — this is the first `## Session Context` block in this CLAUDE.md.)

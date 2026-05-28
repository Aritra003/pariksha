-- Pariksha trust layer (Priority B)
-- Adds: trust_reviews table, agents.status state machine, fixes badges.tx_hash
-- Run this in Supabase Studio: Settings → Database → SQL Editor

-- 1. Trust review reports (one per mint, updated as the async benchmark gate runs)
CREATE TABLE IF NOT EXISTS trust_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_ens TEXT NOT NULL REFERENCES agents(ens_name),
  prompt_safety_passed BOOLEAN NOT NULL,
  prompt_safety_issues JSONB DEFAULT '[]'::jsonb,
  prompt_safety_scan_model TEXT,
  framework_checks JSONB DEFAULT '{}'::jsonb,
  benchmark_run_id UUID REFERENCES pariksha_runs(id),
  benchmark_score NUMERIC,
  outcome TEXT NOT NULL, -- 'pending' | 'passed' | 'failed' | 'grandfathered'
  outcome_reason TEXT,
  badge_tx_hash TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_reviews_agent_ens ON trust_reviews (agent_ens);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_outcome ON trust_reviews (outcome);

ALTER TABLE trust_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_reviews_public_read" ON trust_reviews FOR SELECT USING (true);

-- 2. Fix pre-existing badges.tx_hash bug
-- Route at app/api/pariksha/run/route.ts inserts tx_hash; schema only had badge_token_id.
ALTER TABLE badges ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- 3. Document the agents.status state machine (TEXT field, not an enum — values are application-enforced)
-- Valid values after this migration:
--   'listed'              — seeded / curated, not yet community-minted
--   'demo_ready'          — legacy: agents that respond live but haven't been benchmarked
--   'live'                — legacy alias for demo_ready
--   'community_minted'    — minted on-chain, trust-reviewed, surfaced in marketplace
--   'pending_review'      — minted on-chain, awaiting async benchmark gate
--   'trust_failed'        — failed prompt-safety OR benchmark gate; hidden from marketplace
--   'trust_grandfathered' — pre-trust-layer mints retroactively reviewed and accepted
--
-- A CHECK constraint would be brittle for an evolving state machine; left as TEXT.
COMMENT ON COLUMN agents.status IS
  'State machine: listed | demo_ready | live | community_minted | pending_review | trust_failed | trust_grandfathered';

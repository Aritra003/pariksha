-- Pariksha initial schema
-- Run this in Supabase Studio: Settings → Database → SQL Editor

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ens_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  specialty TEXT NOT NULL,
  inft_address TEXT,
  inft_token_id TEXT,
  owner_address TEXT,
  backend_endpoint TEXT NOT NULL,
  system_prompt TEXT,
  price_usdc NUMERIC NOT NULL,
  current_score NUMERIC,
  total_hires INTEGER DEFAULT 0,
  total_pariksha_runs INTEGER DEFAULT 0,
  lifetime_usdc_earned NUMERIC DEFAULT 0,
  training_examples_count INTEGER DEFAULT 0,
  corpus_version TEXT DEFAULT 'v1',
  status TEXT DEFAULT 'listed', -- 'listed' | 'demo_ready' | 'live'
  minted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pariksha_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_ens TEXT NOT NULL REFERENCES agents(ens_name),
  questions JSONB NOT NULL,
  agent_answers JSONB NOT NULL,
  golden_answers JSONB NOT NULL,
  per_question_scores JSONB NOT NULL,
  final_score NUMERIC NOT NULL,
  judge_reasoning TEXT,
  attestation_tx_hash TEXT,
  run_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_ens TEXT NOT NULL REFERENCES agents(ens_name),
  buyer_address TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  usdc_paid NUMERIC NOT NULL,
  payment_tx_hash TEXT,
  attestation_tx_hash TEXT,
  hired_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_ens TEXT NOT NULL REFERENCES agents(ens_name),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  feedback_score NUMERIC,
  zerog_storage_pointer TEXT,
  stored_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_ens TEXT NOT NULL REFERENCES agents(ens_name),
  badge_type TEXT NOT NULL, -- 'verified' | 'veteran' | 'excellence' | 'polyglot' | 'specialist'
  badge_token_id TEXT,
  threshold_data JSONB,
  minted_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: enable row level security (anon can read agents and pariksha_runs; writes require service key)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pariksha_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hires ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_public_read" ON agents FOR SELECT USING (true);
CREATE POLICY "pariksha_runs_public_read" ON pariksha_runs FOR SELECT USING (true);
CREATE POLICY "badges_public_read" ON badges FOR SELECT USING (true);

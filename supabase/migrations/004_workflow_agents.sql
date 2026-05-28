-- Pariksha workflow agents (Priority A)
-- Adds: agents.type to distinguish jurisdictional agents from named workflows.
-- Run this in Supabase Studio: Settings → Database → SQL Editor

-- Workflow agents are task-scoped (e.g. cheque-bounce drafter, RERA complaint
-- builder) rather than jurisdiction-scoped. They have structured input/output
-- schemas, higher prices (0.10-0.25 USDC vs 0.01-0.05 for generalist agents),
-- and appear in a separate /workflows section of the marketplace.

ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'agent';

-- Valid values: 'agent' (default; jurisdictional generalist) | 'workflow' (named task workflow)
COMMENT ON COLUMN agents.type IS
  'agent (jurisdictional generalist) | workflow (named task workflow). Default: agent.';

CREATE INDEX IF NOT EXISTS idx_agents_type ON agents (type);

-- MCP demo-mode rate-limit tracking
-- Run this in Supabase Studio: Settings → Database → SQL Editor
-- Cap enforced in app/api/mcp/route.ts: 5 demo calls per IP per 24h.

CREATE TABLE IF NOT EXISTS mcp_demo_calls (
  id BIGSERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  called_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_demo_calls_ip_called_at
  ON mcp_demo_calls (ip_address, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_demo_calls_called_at
  ON mcp_demo_calls (called_at);

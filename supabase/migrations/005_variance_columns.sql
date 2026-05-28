-- Pariksha engine v1.1.0 — 3-sample-mean methodology (Priority B-followup)
-- Adds variance-tracking columns to pariksha_runs so a single row can record
-- both the mean of an N-sample run and the spread (min/max/std) across
-- those samples. Backwards-compatible: existing rows have NULL variance.
--
-- Run this in Supabase Studio: Settings → Database → SQL Editor.

ALTER TABLE pariksha_runs ADD COLUMN IF NOT EXISTS variance_min NUMERIC;
ALTER TABLE pariksha_runs ADD COLUMN IF NOT EXISTS variance_max NUMERIC;
ALTER TABLE pariksha_runs ADD COLUMN IF NOT EXISTS variance_std NUMERIC;
ALTER TABLE pariksha_runs ADD COLUMN IF NOT EXISTS sample_count INTEGER;

COMMENT ON COLUMN pariksha_runs.variance_min IS
  'Minimum of per-sample final_score values across an N-sample run (NULL for legacy single-sample rows).';
COMMENT ON COLUMN pariksha_runs.variance_max IS
  'Maximum of per-sample final_score values across an N-sample run.';
COMMENT ON COLUMN pariksha_runs.variance_std IS
  'Sample standard deviation of per-sample final_score values (n-1 denominator).';
COMMENT ON COLUMN pariksha_runs.sample_count IS
  'Number of samples averaged into final_score. NULL or 1 = single-sample (legacy); >= 2 = variance-aware (engine v1.1.0+).';

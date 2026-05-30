# eu.pariksha.eth — v1.1.0 Baseline Findings

**Date:** 2026-05-30
**Outcome:** Scored at v1.1.0 baseline. No prompt revision.
**Run id:** `f0fb88b5-a6b9-45b7-892d-88a96640f39b`
**Bank:** [pariksha-benchmark/questions/v1.1.0-draft/european-union.json](../../pariksha-benchmark/questions/v1.1.0-draft/european-union.json)

## Committed score

| field               | value |
|---------------------|-------|
| `final_score`       | 79.9  |
| `variance_min`      | 76.6  |
| `variance_max`      | 81.8  |
| `variance_std`      | 2.84  |
| `sample_count`      | 3     |
| per-sample finals   | 76.6, 81.2, 81.8 |

## Per-question (apply run)

| id     | category                     | difficulty | run1 | run2 | run3 | mean | range |
|--------|------------------------------|------------|------|------|------|------|-------|
| eu-001 | GDPR-lawful-basis            | medium     | 92   | 92   | 92   | 92.0 | 0     |
| eu-002 | GDPR-international-transfers | hard       | 92   | 88   | 85   | 88.3 | 7     |
| eu-003 | DSA-platform-obligations     | medium     | 42   | 62   | 62   | 55.3 | 20    |
| eu-004 | DSA-VLOP-duties              | hard       | 75   | 82   | 82   | 79.7 | 7     |
| eu-005 | DMA-designation              | hard       | 82   | 82   | 88   | 84.0 | 6     |

## Findings

### eu-003 floor — DSA Art 17 confabulation (NOT a prompt-anchor candidate)

The agent knows the spine of DSA Art 17 (when the obligation triggers, the
Art 17(3) content list, redress information) but consistently confabulates on
the tail:

- **Art 17(2) exemptions** (unknown electronic contact details; deceptive
  high-volume commercial content) — missing or wrong in every sample.
- **Art 17(5)** carve-out for Art 9 orders — agent extends it incorrectly to
  unrelated provisions.
- **Art 24(5)** DSA Transparency Database submission obligation — never
  surfaced.

Across observed runs (dry-run, introspection probe, apply run), the agent
produced **distinct fabricated cross-references on each sample, same magnitude
of judge penalty**:

| sample source        | eu-003 score | fabricated reference                                        |
|----------------------|--------------|-------------------------------------------------------------|
| dry-run sample 1     | 62           | (see introspection probe — same pattern as below)            |
| introspection s1     | 72           | "Art 22 CSAM exemption" (Art 22 is *trusted flaggers*)       |
| introspection s2     | 72           | "6-week republication exemption" (doesn't exist)             |
| introspection s3     | 72           | "Arts 8/10/31 exemptions" (none are Art 17 carve-outs)       |
| apply run sample 1   | 42           | extended fabrication; judge gave a deeper penalty            |
| apply run samples 2-3| 62           | same Art 17(5) misreading as introspection                   |

**Why not anchor it.** The Seoul Art 124 finding
([seoul-kr-anchor-experiment.md](seoul-kr-anchor-experiment.md)) showed that
a system_prompt anchor block on one statutory provision can degrade
performance on unrelated questions in adjacent regulatory regimes — Korea
kr-002 (Civil Act 750 tort) collapsed from 92 to 5 when Commercial Act
Art. 397/398 was anchored. The EU agent's question bank touches three closely
related regulations (GDPR / DSA / DMA); an Art 17 anchor risks contaminating
eu-001 (Art 6 GDPR lawful basis) or eu-005 (DMA Art 3 designation) the same
way. **Cost > benefit** at the v1.1.0 baseline.

### eu-004 / eu-005 — dry-run variance did not recur

In the dry-run, eu-004 swung 78/55/72 (range 23) and eu-005 swung 72/88/72
(range 16) — both flagged for review. The apply run produced eu-004 at
75/82/82 (range 7) and eu-005 at 82/82/88 (range 6). The dry-run flag was a
single-run judge anomaly on hard cross-reference questions (Charter article
completeness for eu-004; numerical-threshold enumeration for eu-005), not a
structural agent failure. **The hard questions are unstable across runs but
not consistently low.**

### Aggregate — variance band tighter in dry-run was an artifact

Dry-run reported range=1.2 / std=0.61 across per-sample finals. Apply run
reported range=5.2 / std=2.84. The dry-run looked tighter because eu-004's
55 in sample 2 was offset by eu-005's 88 in the same sample — opposite
per-question swings cancelled at the aggregate level. The apply run did not
reproduce that cancellation, so the variance is more honestly represented.
**Working assumption: this agent's bank-wide std under N=3 is ~2-3, not <1.**

## Decision

Baseline accepted at 79.9. System prompt unchanged
([memory/project_tokenuri_placeholder.md](../../.claude/projects/-Users-aritrasarkhel-pariksha/memory/project_tokenuri_placeholder.md)
note still applies — placeholder tokenURI not addressed in this session).
Confabulation pattern documented in
[methodology/paper.md](../../pariksha-benchmark/methodology/paper.md) §6.

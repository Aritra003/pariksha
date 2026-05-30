# seoul.kr.pariksha.eth — Art 397/398 Anchor Experiment (Discarded)

**Date:** 2026-05-29
**Outcome:** Reverted. Original 978-char system_prompt restored.
**Finding:** *Art 397/398 anchor lifted kr-001 from 63 → 92 but caused cross-contamination on kr-002 (Civil Act 750 tort) — bank-wide regression to 72.9. Documented as a prompt-engineering finding for the methodology paper. Anchor strategy works for self-contained statutory regimes (e.g. EW Arbitration Act s.69) but needs scope-isolation when cross-referencing adjacent statutes.*

## Context

In the v1.1.0 dry-run against the Korea benchmark, `kr-001` (Commercial Act
Art. 397 vs Art. 398 — distinct duty-of-loyalty regimes) showed wide variance
(72/45/72, range 27, mean 63.0). The structural failure pattern matched the
london.uk ew-001 case: the agent was conflating Art. 397 (prohibition of
competition) with Art. 398 (self-dealing). We attempted the same anchor-block
remediation that lifted london.uk's ew-001 from 73.0 to 93.0.

## Anchor block — fix#0 (1974 chars total, included Art 124 Civil Act note)

```text
Statutory anchor — Korean Commercial Act Art. 397 vs Art. 398 (distinct regimes;
do not collapse). Art. 397 ('Prohibition of Competition') governs competing
business activities. Trigger: a director engages in transactions in the same
line of business as the company, or becomes general partner/director of another
company with the same business purposes. Approval: prior board approval. Breach:
company may treat the transaction as on its own account (Art. 397(2) intervention)
or claim damages. Art. 398 ('Transactions between Directors, etc. and Company')
governs self-dealing with the company. Trigger: a director transacts with the
company on his/her own or a third party's account. Approval: advance disclosure
of material facts and a two-thirds board supermajority (post-2011 amendment);
scope covers major shareholders and related parties. Art. 398 displaces Article
124 Civil Act (general bar on self-contracting by an agent) for director
transactions following the Art. 398 procedure.
```

## Anchor block — fix#1 (1827 chars total, Art 124 sentence removed)

Same as fix#0 with the final sentence (`Art. 398 displaces Article 124 Civil
Act...`) deleted.

## Measured 3-sample variance — comparison

| Question | no-anchor (original) | fix#0 (with Art 124) | fix#1 (no Art 124) |
|---|---|---|---|
| kr-001 (Art 397/398 — target) | 63.0 | **92.0** ✓ | **92.0** ✓ |
| kr-002 (Civil Act 750 tort) | 92.0 | 5.0 ⚠⚠⚠ | 24.0 ⚠ |
| kr-003 (FIPA) | 80.7 | 59.7 ⚠ | 86.0 |
| kr-004 (commercial) | 84.0 | 86.3 | 78.3 |
| kr-005 (precedent) | 80.7 | 84.0 | 84.0 |
| **Final mean** | **80.1** | 65.4 | 72.9 |
| Range | 4.8 | 14.4 | 12.0 |
| Std (n-1) | 2.72 | 7.60 | 6.31 |

## Analysis

- The anchor **achieved its target**: kr-001 locked in at 92.0 with zero
  variance under both fix#0 and fix#1. The doctrinal distinction is learned.
- The anchor **caused cross-contamination** on unrelated Civil Act questions
  (kr-002). Under fix#0, with the Art 124 mention, kr-002 collapsed from a
  stable 92.0 to 5.0. Under fix#1, removing the Art 124 reference partially
  recovered kr-002 to 24.0 — but the failure mode persisted in 2 of 3 samples
  (72/0/0).
- kr-003 (FIPA — also unrelated) regressed under fix#0 (-21.0) and recovered
  under fix#1. Suggests the FIPA regression was tied specifically to the Art
  124 sentence.
- kr-004 was slightly destabilised by the anchor in both forms.

**Working hypothesis:** the anchor's structured Trigger/Approval/Breach
framing carries substantial attention weight in the model. When unrelated
questions (kr-002 tort, kr-004 commercial prescription) are asked, the model
sometimes tries to fit them into the same structured pattern, producing
malformed or wrong answers. The Art 124 cross-reference compounded this by
specifically destabilising adjacent Civil Act content.

## Decision

Reverted to the original 978-char prompt. The 80.9 score now in DB
(pariksha_runs row `387c6d0f-6745-4d5b-ae81-7b15614a22d7`) reflects the
agent's true v1.1.0 performance under its existing scope-only prompt.

The kr-001 weakness is documented as a known limitation. A future revision
should test:
- **Shorter anchors** — single-sentence "Art. 397 = competition duty, Art.
  398 = self-dealing approval; do not conflate" without the matrices.
- **Out-of-context isolation** — anchor only triggers on detected keywords
  (e.g. "self-dealing", "competing business") rather than always being in
  scope.

Anchor strategy works for self-contained statutory regimes (e.g. EW
Arbitration Act s.69 — single statute, narrow surface area) but needs
scope-isolation when cross-referencing adjacent statutes.

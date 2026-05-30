# Legacy Agent Re-scoring at v1.1.0 Methodology — Findings

**Date:** 2026-05-30
**Outcome:** 7 legacy agents re-scored under engine v1.1.0 (3-sample mean,
variance-aware). All scores committed; no status changes; no on-chain calls.
**Engine:** v1.1.0 (`scoreWithVariance`, sampleCount=3)
**Banks:** [pariksha-benchmark/questions/v1.0.0/](../../pariksha-benchmark/questions/v1.0.0/)
**Script:** [scripts/rescore-legacy-v1-1.ts](../../scripts/rescore-legacy-v1-1.ts)

## Consolidated re-score table

| agent | bank | legacy (v1.0.0 single-sample) | v1.1.0 mean (applied) | delta vs legacy | std | range | flagged questions |
|---|---|---:|---:|---:|---:|---:|---|
| delhi.in.pariksha.eth | india.json | 69.2 | **77.7** | **+8.5** | 1.01 | 2.0 | india-001(r=20) |
| kosh.in.pariksha.eth | india.json | 71.2 | **72.0** | +0.8 | 5.38 | 9.6 | india-003(r=20), india-005(r=40) |
| sahayak.in.pariksha.eth | india.json | 81.0 | **68.9** | **−12.1** | 8.01 | 15.2 | india-003(r=37), india-005(r=37) |
| vidhi.sg.pariksha.eth | singapore.json | 90.4 | **84.9** | **−5.5** | 0.42 | 0.8 | (none) |
| vidhi.ae.pariksha.eth | uae-difc.json | 75.8 | **82.7** | **+6.9** | 0.42 | 0.8 | (none) |
| vidhi.us.pariksha.eth | us-generalist.json* | 85.0 | **85.3** | +0.3 | 1.94 | 3.8 | (none) |
| delaware.us.pariksha.eth | us-delaware-federal.json | 89.2 | **85.3** | −3.9 | 1.86 | 3.6 | us-de-005(r=16) |

\* `us-generalist.json` was canonicalized this session from the legacy
`data/benchmark-questions.json[vidhi.us.pariksha.eth]` entry, byte-preserved.
See the file's `source_note`.

Aggregate movement: mean of deltas = **−0.71** (legacy single-sample average
biases slightly high). Range of deltas: **−12.1 to +8.5**.

## Per-agent pariksha_runs row ids

| agent | row id |
|---|---|
| delhi.in.pariksha.eth | `7ba29951-a187-481a-9565-ee048f8549d2` |
| kosh.in.pariksha.eth | `dee5c88b-a153-4fed-931c-df905f854dab` |
| sahayak.in.pariksha.eth | `8bee20e7-4355-4af3-aad6-917c156fbb85` |
| vidhi.sg.pariksha.eth | `62b9e33a-b9b0-454e-9016-a71394bb4b8c` |
| vidhi.ae.pariksha.eth | `32817d09-39d9-4fdb-90d5-eedb84e6c67d` |
| vidhi.us.pariksha.eth | `de96c1c2-f643-4e80-af63-4f401a8adf8b` |
| delaware.us.pariksha.eth | `8b36fd5d-fab4-4ce1-8cff-e00c9d7129f6` |

## Findings

### sahayak.in.pariksha.eth — specialty-mismatch effect (−12.1)

Sahayak's declared specialty is *plain-language Indian legal Q&A* (152-char
system_prompt: "explaining Indian law in plain language accessible to
non-lawyers"). The shared `india.json` bank tests substantive Delhi
High-Court commercial-litigation law, not plain-language pedagogy. The agent
is being asked to do something it was not built for, and the v1.1.0
3-sample methodology surfaces that honestly: india-005 collapsed to a
mean of ~36 (samples 25/72/35 in the apply run), india-003 sample-3
collapsed to 25.

The legacy 81 single-sample was a fortunate roll where the judge accepted a
plain-language framing for substantive questions. Across 3 samples the
ceiling reverts to ~69. **This is a methodology paper exemplar** — the
v1.0.0→v1.1.0 transition is precisely the kind of change that should surface
specialty/bank mismatches that single-sample scoring papered over.

Decision: accept the score, document the mismatch. No prompt revision and no
agent retire. Sahayak's *real* role is plain-language QA where the bank
doesn't measure capability. A dedicated "plain-language explanation" bank is
out of scope for v1.1.0.

### vidhi.sg.pariksha.eth — regression toward the mean (−5.5)

The Singapore arbitration specialist dropped from 90.4 to 84.9. Apply-run
band was unusually tight (std 0.42, range 0.8 — per-sample finals
84.4/85.2/85.0). The dry-run had std 3.14, range 6.0, suggesting the
apply-time tight band was favourable judge alignment, not stable agent
behaviour. The substantive interpretation: the legacy 90.4 was the upper
edge of this agent's actual ~83-86 band. 3-sample-mean methodology corrects
the over-estimate. No structural defect to remediate.

### vidhi.ae.pariksha.eth — dry-run/apply variance contradiction

DIFC commercial-contracts agent: dry-run reported std 6.71 / range 12,
flagged difc-001 (range 40: samples 72/35/75) and difc-004 (range 23).
Apply-run reported std 0.42 / range 0.8 — completely different band shape.
Same agent, same bank, same engine, two minutes apart.

This contradicts the dry-run conclusion that vidhi.ae was structurally
unstable. The dry-run band was an artifact of judge sampling on difc-001's
self-dealing question — the agent produced answers that fell across the
judge's "partial-knowledge" penalty range, and one sample landed at 35 while
two landed at 72-75. The apply-run avoided that judge-penalty edge.

**Methodology implication:** even with N=3 samples, single-run aggregate
variance is itself noisy. Dry-run-vs-apply drift of 5+ points on the
aggregate mean is realistic. Don't treat per-question variance flags as
agent-level defects without a multi-run cross-check.

### delhi.in.pariksha.eth — apply tightened, india-001 the residual flag (+8.5)

Dry-run flagged 3 questions (india-001 r=20, india-004 r=30, india-005 r=30)
with mean 73.5. Apply run produced mean 77.7 with only india-001 (r=20)
flagged. The delta is agent-specific — kosh and sahayak (same bank) did not
flag india-001 in the apply run, so the variance is on delhi.in's *answer*
to india-001, not on the question's golden answer.

Pattern likely matches the eu-003 confabulation finding: delhi.in is
producing variable answers on india-001 (a section-138 NI Act question per
the system_prompt scope hint), with the judge occasionally penalizing harder
on specific citations.

### kosh.in.pariksha.eth — apply opened up where dry-run was tight (+0.8 vs legacy, but −5.9 vs dry-run)

Inverse case to vidhi.ae: dry-run had no flagged questions (clean), apply
flagged india-005 (range 40: 72/72/32) and india-003 (range 20). Mean
collapsed from dry-run 77.9 to apply 72.0. Substantive cause: kosh's
specialty is "Indian case law citation verification" (147-char prompt);
the bank tests substantive law not citation hygiene. Same family of issue
as sahayak, milder magnitude.

### vidhi.us / delaware.us — stable, comparable agents on different banks

Both landed at 85.3 in the apply run — by coincidence, not because they're
fungible. vidhi.us was scored against the canonicalized
`us-generalist.json` (us-001..us-005, US generalist content);
delaware.us was scored against `us-delaware-federal.json`
(us-de-001..us-de-005, DGCL + federal securities). The numerical equality
at 85.3 does not imply the agents are interchangeable — they answered
substantively different questions and the bank `agent_focus` reflects that.

delaware.us run-to-run drift (89.2 → 85.3) is judge stochasticity on an
already-v1.1.0 score, consistent with the eu agent's 78.5 dry-run →
79.9 apply pattern.

## Aggregate observation — mean delta near zero, range wide

Across the 7 agents, the single-sample legacy mean drifted by **−0.71**
overall vs v1.1.0 3-sample. Individual deltas span **−12.1 to +8.5**, well
outside the documented ±8 judge-noise band, because the larger negative
moves are *not noise* — they reflect specialty/bank mismatches surfacing
under more samples. The transition v1.0.0→v1.1.0 is therefore not a uniform
re-anchoring; it's a methodology change that exposes which agents had
fortunate legacy scores and which had honest ones. The methodology paper §6
addendum captures this finding.

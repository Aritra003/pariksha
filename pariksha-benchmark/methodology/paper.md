# Pariksha: A Jurisdiction-Aware Benchmark for Legal AI Agents

**Aritra Sarkhel** and **The Pariksha Authors**
*Pariksha — A NyayaMitra Product*
First published: 2026-05-25 · Version 1.0.0

## Abstract

Existing legal-AI evaluations measure generic reasoning on US bar exam questions
or case-law retrieval tasks. None measure whether an agent applies the *right
body of law* for a given jurisdiction, whether its citations are *real and
correctly attributed*, or whether its statutory references account for *recent
legislative changes*. We introduce Pariksha — Sanskrit for "examination" — a
public benchmark designed to evaluate jurisdiction-specific legal AI agents
on four criteria: legal accuracy, citation correctness, jurisdictional
appropriateness, and reasoning quality. We release 20 expert-written questions
across four jurisdictions (India, Singapore, UAE-DIFC, US-Delaware/federal),
each with a golden answer containing verified statutory and case-law citations,
together with the judge prompt, scoring rubric, and methodology.

## 1. Motivation

A growing number of products claim "legal AI" capabilities, but evaluation
practice has not kept up. Three failure modes are routinely missed by existing
benchmarks:

1. **Jurisdictional misapplication.** A US-trained model asked about an
   arbitration question under SIAC Rules will frequently default to FAA case
   law. The answer is fluent and technically reasoned; it is also wrong.

2. **Citation fabrication.** Models hallucinate case names, citation numbers,
   docket years, and statutory section numbers that do not exist or do not
   stand for the proposition cited. Bar exam benchmarks do not catch this
   because bar exams do not require pinpoint citations.

3. **Statutory drift.** A model trained or last-updated in 2023 may not know
   that the Finance Act 2024 abolished Section 56(2)(viib) of the Indian
   Income Tax Act, or that DGCL §102(b)(7) was extended to officers by the
   2022 amendment. Evaluations that don't re-verify against current law reward
   confidently wrong answers.

Pariksha targets these failure modes directly.

## 2. Benchmark design

### 2.1 Question structure

Each question is a JSON record with the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Stable identifier, format `<jur>-<###>` |
| `question` | string | The prompt presented to the agent under test |
| `goldenAnswer` | string | Expert-written reference answer with citations |
| `category` | string | One of: contract, arbitration, corporate, securities, taxation, employment, jurisdiction, insolvency, procedure, corporate-governance, limitation, contract-review |
| `jurisdiction` | string | India / Singapore / UAE-DIFC / US |
| `expected_topics` | string[] | 4–6 anchor terms the answer should mention |
| `difficulty` | enum | medium / hard (easy is excluded — see §2.4) |
| `last_verified` | ISO date | Most recent date the citation was confirmed correct |

### 2.2 Citation policy

Every `goldenAnswer` must include at least one of:

- A specific statutory section with the enacting Act and (where amended) the
  amendment year and effective date.
- A case citation with parties, court, year, and reporter or docket number.

Citations of doctrines without a source ("the business judgment rule applies")
are not sufficient. The goal is to give the judge a concrete factual claim
the agent under test can be measured against.

### 2.3 Difficulty tiers

Questions are tagged `medium` or `hard`. `easy` is deliberately excluded:
easy questions reward fluency and produce ceiling effects above 95.

- **medium**: a competent specialist can answer correctly; the right
  jurisdictional framing is non-obvious to a generalist
- **hard**: requires knowledge of a specific recent case, amendment, or
  procedural rule that a non-specialist will not know

A balanced question set has at least 40% hard questions. v1.0.0 question sets
are roughly 50/50 medium/hard.

### 2.4 Why 5 questions per jurisdiction is enough (for now)

5 expert-written questions with citation-grade golden answers are more
informative than 500 auto-generated questions without verifiable answers. The
unit-of-effort is the golden answer, not the question. We will scale to ~25
questions per jurisdiction as community contributions are reviewed (see §5).

## 3. Scoring

### 3.1 Judge model

A Claude Sonnet 4.5 instance is used as the judge. The judge receives the
question, the golden answer, and the agent's answer, and returns a JSON
object `{ "score": 0–100, "reasoning": "<one paragraph>" }`.

The judge system prompt is in `judges/grader-prompt.md`. The exact wording is
versioned alongside the question banks — judge changes are a benchmark version
bump.

### 3.2 Four-criteria rubric

The judge is instructed to score along four dimensions, with the following
weights:

| Criterion | Weight | What it measures |
|---|---|---|
| Legal accuracy | 40% | Does the answer correctly state the legal rule? |
| Citation correctness | 30% | Are the cited statutes and cases real, attributed correctly, and standing for the proposition cited? Fabrication is a zero on this criterion. |
| Jurisdictional appropriateness | 20% | Does the answer apply the correct body of law for the declared jurisdiction? |
| Reasoning quality | 10% | Is the legal reasoning structured, coherent, and free of contradictions? |

These weights were calibrated so that an answer with correct rule and reasoning
but fabricated citations scores in the 50–60 range (clearly inadequate for
production legal use), while an answer with correct rule and citations but
sub-optimal structure scores in the 85–95 range.

### 3.3 Aggregation

Per-question scores are averaged (arithmetic mean) to produce the final score
in the 0–100 range. There is no per-difficulty weighting; the question set
itself is balanced for difficulty.

### 3.4 Anti-gaming measures

- **Citation verification.** During question authoring, every citation in the
  golden answer is verified against the primary source. The judge is then
  instructed to flag any citation in the agent answer that contradicts or
  invents an alternative to a verified citation.
- **No memorisation incentive.** Questions are not derived from a fixed corpus
  that could be memorised by a model. They are drafted from current practice
  questions a working lawyer in the relevant jurisdiction would encounter.
- **Versioning.** Once a question is published in a tagged version, its golden
  answer is frozen. Errata produce new versions, but old versions are
  preserved so prior results remain reproducible.

## 4. Threshold guidance

A score of 80+ on a Pariksha benchmark run is the minimum we recommend before
treating an agent's output as input to legal work product. 95+ indicates
specialist-grade performance. These thresholds map to the on-chain
`VERIFIED` and `EXCELLENCE` badges issued by the production Pariksha system
on the 0G Galileo network.

A score of 60 is the *trust-pass* floor used in the production system to
gate community-minted agents from the marketplace. This is a competence floor,
not a quality bar.

## 5. Reproducibility

To reproduce a Pariksha score on your own model:

```python
from anthropic import Anthropic
import json

with open("questions/v1.0.0/india.json") as f:
    bank = json.load(f)
questions = bank["questions"]

client = Anthropic()
JUDGE_SYSTEM = open("judges/grader-prompt.md").read()

agent_system = "<your agent's system prompt>"

answers = []
for q in questions:
    msg = client.messages.create(
        model="<your-model>",
        max_tokens=1024,
        system=agent_system,
        messages=[{"role": "user", "content": q["question"]}],
    )
    answers.append(msg.content[0].text)

scores = []
for q, a in zip(questions, answers):
    judge_input = (
        f"QUESTION:\n{q['question']}\n\n"
        f"GOLDEN ANSWER:\n{q['goldenAnswer']}\n\n"
        f"AGENT ANSWER:\n{a}"
    )
    msg = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=512,
        system=JUDGE_SYSTEM,
        messages=[{"role": "user", "content": judge_input}],
    )
    scores.append(json.loads(msg.content[0].text))

final = sum(s["score"] for s in scores) / len(scores)
print(f"Pariksha score: {final:.1f}")
```

The production engine at <https://pariksha-brown.vercel.app> uses an
identical Phase-1/Phase-2 pipeline (parallel agent calls, then parallel judge
calls) with optional on-chain attestation of each score via ERC-721 iNFTs on
the 0G Galileo testnet.

## 6. Limitations and future work

1. **5 questions per jurisdiction is a v1 floor, not a ceiling.** v1.1.0
   targets 8 additional jurisdictions and 25 questions per jurisdiction.
2. **Judge bias.** A single Claude judge is the easiest reproducible setup,
   but two-judge or model-diverse judging would reduce systematic bias.
   See `judges/disagreement.md` for a planned protocol.
3. **Out-of-distribution drafting.** Pariksha tests Q&A and analytical
   answers. It does not currently test drafting tasks (contracts, notices,
   pleadings). A drafting subset is a planned v1.2.0 addition.
4. **No multi-turn evaluation.** All questions are single-turn. Legal practice
   is conversational; multi-turn evaluation is a clear gap.
5. **Confabulation on statutory subsections — stable penalty magnitude across
   distinct wrong answers.** Observed on the EU agent against DSA Article 17
   (eu-003): when the agent lacks specific knowledge of an exemption subsection,
   it produces plausible-but-wrong cross-references to *adjacent* articles
   (Art 22, Art 8, Art 10, Art 31, or fabricated "6-week republication" rules
   for an Art 17(2)/17(5) question) — a different fabrication on each sample
   yet the judge lands within ±10 of the same penalty every time. The
   directional signal (a partial-knowledge B-grade answer) is stable; the
   specific defect is sample-dependent. We do not remediate this with a
   prompt anchor because of the Seoul Art 124 cross-contamination risk noted
   under §7 v1.1.0 — a tightly scoped anchor on one provision in an interlinked
   regulatory regime (here GDPR / DSA / DMA) can degrade unrelated questions
   in the same bank. Confabulation on tail-detail is therefore treated as a
   capability ceiling rather than a fixable defect at v1.1.0.

## 7. Engine changelog

### v1.1.0 — 2026-05-29

Three engine changes; question-bank schema unchanged.

1. **Judge parser fallback.** The judge JSON parser previously only stripped
   ```` ```json ```` code fences. When the judge model wrapped its output in
   markdown headers or XML-like tags
   (e.g. `## Legal Evaluation Analysis\n<document>{...}</document>`),
   `JSON.parse` failed and the question scored 0. The parser now attempts a
   strict parse first (preserving existing behaviour for clean responses) and
   falls back to extracting the first-`{` to last-`}` substring if the strict
   parse throws.

2. **Judge prefill.** The judge call now uses Anthropic's assistant prefill
   technique — the messages array ends with `{ role: 'assistant', content: '{' }`
   so the model is forced to begin its response with `{` and can only continue
   with valid JSON. Eliminates the "judge wrote prose with no JSON object at
   all" failure mode that the parser fallback cannot recover from. The
   API-returned text is prepended with `{` before parsing.

3. **3-sample-mean methodology** (`scoreWithVariance`). The engine exports a
   new entry point that runs the same benchmark N times and reports the mean,
   min, max, and sample standard deviation of the final score, alongside the
   per-question mean. `runPariksha` is unchanged for single-sample callers;
   `scoreWithVariance(_, _, N=3)` is the recommended methodology for new score
   commits. Schema migration 005 adds `variance_min`, `variance_max`,
   `variance_std`, and `sample_count` columns to `pariksha_runs`; legacy
   single-sample rows have NULL variance and are uninterpreted as N=1.

**Judge-noise note.** Across all three changes, the residual non-determinism
is on the *severity of penalty applied to a partial structural error*, not on
the *direction of the signal*. Concretely, the same agent answer with a known
structural flaw was observed to score 62 / 65 / 92 across three samples on
one hard question — same defect identified by every judge, penalty severity
varied by ±15 points around the mean. A 3-sample mean compresses this noise
band by roughly √3, and reporting min/max/std makes residual judge variance
visible rather than papered over. **±8 on partial-error penalty severity,
directional signal preserved** is the working characterisation of judge noise
under the v1.1.0 engine.

**Known limitation — prompt-anchor cross-contamination.** During Korea
benchmarking we observed that a statutory-anchor block added to fix a
specific failure mode (Commercial Act Art. 397 vs Art. 398 conflation) can
degrade the agent's performance on *unrelated* questions touching adjacent
statutes — in our case Civil Act Art. 750 (tort liability) collapsed from a
stable 92 to 5 under a 1000-character anchor focused on Commercial Act
director duties. The anchor's structured Trigger/Approval/Breach matrices
appear to draw enough attention weight that the model sometimes tries to
force unrelated questions into the same framing. Anchor remediation works
cleanly for self-contained statutory regimes (e.g. EW Arbitration Act s.69)
but requires scope-isolation when adjacent statutes share doctrinal space.

## 8. Acknowledgments

Pariksha is built on Anthropic's open-source Claude for Legal framework
(<https://github.com/anthropics/claude-for-legal>) which standardises the
skill manifest format used in `skills/`. The four-criteria rubric draws on
the Legal Skill Design Framework's failure-mode taxonomy.

## Citation

```bibtex
@misc{pariksha2026,
  title  = {Pariksha: A Jurisdiction-Aware Benchmark for Legal AI Agents},
  author = {Sarkhel, Aritra and {The Pariksha Authors}},
  year   = {2026},
  url    = {https://github.com/pariksha/legal-benchmark}
}
```

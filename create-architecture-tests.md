# create-architecture-tests.md

Command under test: `create-architecture.md` (starter stub - Role and Task defined,
Context and Constraints empty).

Input under test: the TeamPulse Architecture input is the PRD produced by
`create-prd.md` from `eval/teampulse-desc.txt` (React frontend, Node.js backend,
PostgreSQL, Entra ID / OIDC SSO).

These criteria were written BEFORE any Context or Constraints were added to the
command, and committed before the command changed.


---
## Step 1 - Starter baseline observations (2026-08-12, haiku, isolated)

Ran the Role+Task-only stub against the TeamPulse PRD in an empty folder.

- Output format: FAILED on the first attempt - the stub tried to write a file
  instead of returning the document. Same failure class as Exercise 3 (Sonnet
  returned a summary) and today's RT-only PRD run (Haiku returned a summary).
  Worked around at the harness level (an output-format line added to the prompt
  file, not to the command) so the stub stayed pristine for the baseline.
- Stack fidelity: STRONG unprompted. PostgreSQL DDL (TIMESTAMPTZ, JSONB,
  date_trunc), Express routes, the full Entra ID authorization-code flow, Recharts.
- Standard sections: STRONG unprompted. Component view, data model, API surface,
  auth, deployment, scalability, data-flow diagrams, rollout plan.
- Invented infrastructure: HEAVY. Redis (queue and cache), AWS SES/SendGrid, ECS
  Fargate, S3/CloudFront, SQS, Datadog/New Relic, an optional Kubernetes section.
  None of it appears in the PRD; Redis is stated as a core layer in section 1.1.
- Open decisions: SUPPRESSED. The appendix is titled "Open Questions Addressed in
  Architecture" - it converts unknowns into silent decisions (retention set to
  "indefinite", suppression threshold set to 3, timezone handling decided). There
  is no section for decisions that remain open.
- Guarantee integrity: BROKEN. notification_delivery_logs.notification_link_token
  -> survey_notification_links.token -> .submitted_response_id ->
  survey_responses.id attributes any response to a named person
  (slack_user_id is stored unhashed), while section 1.1 claims no code path, admin
  access, or query can do so.

Consequence for test design: criteria about naming the stack or including the
standard sections already pass at baseline, so they are regression GUARDS, not
DRIVERS. The drivers - the criteria that fail the baseline and can therefore
drive iteration - are Test Cases 2, 3 and 4.


---
## Test Case 1: The document contains the sections a team can actually build from

GUARD (expected to pass at baseline on TeamPulse; retained as a regression check
and as the likely failure point on smaller inputs such as the kata).

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- The architecture document contains all six of: (a) a component/system view that
  names each major component, its responsibility, and how components communicate;
  (b) a data model naming concrete entities and their key fields; (c) an API or
  interface surface listing concrete operations (method and path, or the
  equivalent for a non-HTTP system); (d) an authentication and authorization
  approach, or an explicit statement that the system has no authenticated actors
  and why; (e) deployment and runtime considerations; (f) technical decisions that
  remain open.

Failure Criteria (must NOT occur):
- Any of the six is missing.
- A section exists in name only, with no content specific to this system - for
  example "Data Model: a standard relational schema" naming no entities, or an
  API section that says "RESTful endpoints" without listing any.


---
## Test Case 2: A guarantee from the PRD holds across the whole data model, not table by table

DRIVER. This is also the designated load-bearing Context test: a Context-less run
demonstrably fails it (see Step 1 baseline), and the fix belongs in Context -
what a developer-ready architecture is for - rather than in a product-specific
constraint.

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- Where the PRD makes a hard guarantee (privacy, anonymity, security, safety), the
  architecture states which stores hold identifying data and which hold guarded
  data, and shows the guarantee holds across the whole data model - that no join,
  foreign key, log entry, token record, or lookup path links an identifying record
  to a guarded record.
- Where such a path would otherwise exist (delivery/notification logs, token
  tables, audit trails, caches, backups), the architecture names the specific
  design decision that severs it - not storing the association at all, one-way
  separation, deletion at the moment of submission - rather than asserting the
  records are unlinked.
- Any verification checklist the document offers covers join paths across records,
  not only columns within a single record type.

Failure Criteria (must NOT occur):
- The document asserts the guarantee ("no individual attribution in any view")
  while its own data model contains a path from an identifier to a guarded record
  through any intermediate table.
- It reasons only per-table ("the responses table has no user_id") and leaves
  intermediate tables - notification or delivery logs, token tables, roster
  snapshots - unexamined.
- A raw external identifier (Slack user ID, email address, employee ID) is stored
  in any record joinable to a guarded record.
- Precision deliberately coarsened in one place (a truncated timestamp) is
  available at full precision somewhere else.


---
## Test Case 3: Technology beyond the PRD is proposed, not smuggled

DRIVER.

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- Every technology, service, or infrastructure component in the architecture
  either appears in the PRD, or is explicitly marked as the architect's proposal
  that the PRD does not specify, with a one-line rationale and at least one
  alternative or the condition under which it would not be needed.
- The components that must be marked this way are the ones carrying real cost or
  operational burden: a cache, a queue or broker, a container orchestrator, a
  third-party service, a named cloud vendor.

Failure Criteria (must NOT occur):
- A component absent from the PRD is presented as settled fact in the core
  architecture - for example "Data Layer: PostgreSQL for storage, Redis for async
  job queuing and caching" - with nothing indicating it was a choice.
- A specific cloud vendor's services are named as the deployment target when the
  PRD names no vendor, without being flagged as an assumption.
- A dependency is introduced in a diagram or code sample only, never named as a
  decision anywhere in the document.


---
## Test Case 4: Unresolved technical decisions stay unresolved

DRIVER.

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- The document contains a section of open technical decisions listing decisions
  the PRD does not settle and the architecture cannot settle on its own authority.
  Each item names the decision, the realistic options, and what it affects.
- Where the architecture picks a working value so implementation is not blocked
  (a retention period, a suppression threshold, a session timeout), that value is
  marked as provisional AND the decision is also listed as open.
- The items are genuinely unsettled at the architecture level - for example where
  the system runs, how scheduled work is triggered, how a survey link is protected
  if it is forwarded, how long response data is retained and who may delete it,
  what the minimum-responses threshold should be - not restatements of product
  questions the PRD has already answered.

Failure Criteria (must NOT occur):
- There is no such section.
- The section exists but lists only decisions the document has already made - an
  "open questions addressed in architecture" appendix is a failure, not a pass.
- The section contains only placeholders ("TBD", "to be determined by the team")
  without naming the decision, its options, or its impact.
- A value the PRD explicitly left open is fixed silently in the design with no
  indication that it was a choice.


---
## Test Case 5: The architecture is expressed in the stack the PRD names

GUARD on TeamPulse (passes at baseline); DRIVER for the stack-swap test in Step 3
and for the kata in Step 5.

Input: the TeamPulse PRD produced by create-prd (React / Node.js / PostgreSQL /
Entra ID), and separately the same product with a different stack (HTMX / Python
FastAPI / MongoDB / Auth0).

Expected Output Criteria:
- Persistence is described in the named engine's own terms - for a relational
  engine, table definitions with types, keys, and indexes; for a document store,
  collections, document shapes, and index specifications.
- The backend is described in the named language and framework's terms - routes
  and middleware for Express, routers and request/response models for FastAPI.
- The frontend is described in the named technology's terms - component structure
  and state handling for React, server-rendered fragments and swap targets for
  HTMX.
- Authentication is described in the named provider and protocol's terms,
  including how identity and role information reach the application.
- Running the same product description through two different stacks produces
  documents that differ in named artifacts, not merely in labels.

Failure Criteria (must NOT occur):
- Placeholder technology wording - "a relational database", "a modern SPA
  framework", "an identity provider" - where the PRD named a specific one.
- Artifacts belonging to a stack the PRD did not name: SQL DDL in a document-store
  system, React component trees in a server-rendered HTMX system, JWT session
  invention where the PRD names a specific SSO provider.
- The two stack variants produce the same architecture with only the product
  names swapped.


---
## Step 3 - Iteration record (haiku only, eval/create-architecture-promptfoo.yaml)

Harness: generator haiku, grader haiku (Exercise 6: haiku is the sole provider).
Two rows: TeamPulse as specified (React / Node / PostgreSQL / Entra ID) and the
same product on a different stack (HTMX / FastAPI / MongoDB / Auth0). Each run is
2 generations + 8 rubric gradings, about 9 minutes, --no-cache.

Note on inputs: Exercise 5 did not leave a saved TeamPulse PRD in the repo, so the
architecture input was regenerated today with the finalized create-prd command via
eval/prd-prompt.md, isolated. Same command, same description, same model.

### Baseline (2026-08-12) - stub with Context and Constraints empty

Prediction written before the run: 3/8 - TC1 and TC5 pass on row 1, TC5 passes on
row 2, TC2/TC3/TC4 fail.

Result: 3/8, exactly as predicted.

| Criterion              | Row 1 | Row 2 |
|------------------------|-------|-------|
| TC1 sections           | PASS  | -     |
| TC2 guarantee          | FAIL  | FAIL  |
| TC3 tech smuggled      | FAIL  | -     |
| TC4 open decisions     | FAIL  | FAIL  |
| TC5 stack fidelity     | PASS  | PASS  |

TC2 has now failed on four separate generations with a DIFFERENT leak path each
time:
1. Step 1 hand run: notification_delivery_logs -> token -> response.
2. Discarded sonnet-graded run: delivery log contents never specified at all.
3. Row 1: survey_instances.roster_snapshot holds emails, joinable to responses
   via survey_id.
4. Row 2: teams.members (Auth0 subs) narrows any response to exactly N candidates.

Never the same vector twice, and it survives a complete change of data model -
the Exercise 5 finding that a hard guarantee is multi-vector, reappearing one
layer up.

TC3's grader caught a subtler case than expected: "AWS RDS PostgreSQL" smuggles a
managed vendor service in under a technology the PRD did name.

Harness note: an earlier run of this same baseline used a sonnet grader. That
deviates from the exercise (haiku is the sole provider) and was discarded, not
counted as evidence. In that discarded run one rubric returned "Could not extract
JSON from llm-rubric response" - an llm-rubric verdict can fail for parsing
reasons and fails CLOSED, looking identical to a content failure in the table.

### Iteration 1 (2026-08-12) - Context added, Constraints still empty

Sequencing follows the Exercise 5 rule: a concern the model does not know is
expected is a Context problem; vague language nothing forbade is a Constraints
problem. TC2 and TC4 are Context; TC3 is Constraints.

Change: filled the Context section only - what an implementation-ready
architecture document is, that the technical environment comes from the PRD
rather than a default stack, and that a hard guarantee is a property of the whole
system that must be traced through every place data rests or passes through
(secondary tables, delivery and notification logs, audit trails, queue and job
payloads, caches, exports, backups).

Hypothesis: the baseline reasons per-component about the guarantee because
nothing tells it a guarantee spans the system. Stating that in Context moves TC2
on both rows. TC1 and TC5 stay green. TC4 may improve incidentally but is not
targeted until Iteration 2.

Result: 4/8 (baseline 3/8). Hypothesis PARTIALLY confirmed.

| Criterion              | Base R1 | It1 R1 | Base R2 | It1 R2 |
|------------------------|---------|--------|---------|--------|
| TC1 sections           | PASS    | PASS   | -       | -      |
| TC2 guarantee          | FAIL    | FAIL   | FAIL    | PASS   |
| TC3 tech smuggled      | FAIL    | FAIL   | -       | -      |
| TC4 open decisions     | FAIL    | FAIL   | FAIL    | FAIL   |
| TC5 stack fidelity     | PASS    | PASS   | PASS    | PASS   |

CONTEXT IS LOAD-BEARING, and it is visible in the grader's own words. Row 2 TC2
passed because "tokens are deleted immediately after response submission,
severing the link" - the Context sentence ("where such a path would otherwise
exist, which design decision severs it") coming back as design, on a stack the
Context never mentions.

Row 1 TC2 still failed, with a fifth distinct leak vector:
survey_notification_links stores roster_entry_id alongside a survey_cycle_id
shared with responses. Five generations, five different paths. Context taught the
model to reason about severing links; on the relational design it still left one
open.

TC4 did not move anywhere (0 for 4 across both runs and both rows) - expected,
since the Iteration 1 Context said nothing about open decisions.

Caveat: n=1 per row. The row 1 / row 2 split may be a property of the stack or
may be run-to-run variance of the kind recorded in Exercise 5. A 4-run budget
does not allow repeats, so this stays a caveat, not a conclusion.

### Iteration 2 (2026-08-12) - Context extended to open technical decisions

Change: added a Context paragraph stating that a PRD leaves decisions the
architecture has no authority to close (where the system runs, how scheduled work
is triggered, how long data is kept and who may remove it, what a threshold or
limit should be); that these belong in an explicit section of open technical
decisions naming the decision, the realistic options, and what it affects; and
that any working value chosen to unblock implementation is marked provisional and
still recorded as open rather than disappearing silently into the design.

Hypothesis: the model resolves every unknown because nothing tells it that
leaving decisions open is part of the job. This Context flips TC4 on both rows.
TC2 row 2 and the guards hold. Target 6/8.

Result: 4/8 - unchanged on the scoreboard. Hypothesis NOT confirmed on the number,
but the number hides the result.

TC4 row 1: baseline had NO open-decisions section at all. After this Context it has
"an extensive, well-structured section 13 with 10 items... each names the choice,
lists realistic options, states what it affects, and includes a working value
marked as provisional." It failed on exactly one straggler: the 30-minute idle
timeout in section 8.3, fixed in passing, neither marked provisional nor listed.

TC3 row 1: improved substantially even though nothing this iteration targeted it -
queue alternatives discussed, Kubernetes vs PaaS framed as a choice, SES vs
SendGrid framed as a choice. It failed on one straggler: the Redis cache layer,
still assumed without alternatives.

TC4 row 2: has an open decisions section; fails because minimum group size (3) and
session timeout are fixed silently elsewhere in the document.

TC2 row 2 held (passed twice running). TC2 row 1 failed a sixth time with a sixth
distinct vector: survey_access_links stores engineer_id and submitted_response_id
in the same record.

LESSON: a binary criterion cannot show partial progress. Read the grader's
reasoning on every assertion, not just the pass/fail - the scoreboard said
"Context did nothing" while the reasons showed it did most of the work and left
one item unfinished in each case.

### Iteration 3 (2026-08-12) - first Constraints, targeting TC3 and TC4

Diagnosis by the Exercise 5 rule: the concept is installed (sections exist and are
well-formed); what remains is inconsistent application at the point of use - the
model lists decisions properly, then fixes a number three sections earlier and
forgets. Nothing forbids that, so it is a Constraints problem.

Change: added Constraints 1 and 2. Two constraints in one run, but they target
different criteria, so attribution stays clean.
1. Any technology the PRD does not name is marked as a proposal where it first
   appears, with rationale and an alternative - including routine ones like a cache.
2. Any threshold, limit, timeout, or retention period the PRD does not give is
   marked provisional at the point it appears AND listed in open decisions.

Hypothesis: both stragglers are point-of-use lapses rather than missing concepts,
so explicit constraints close them. TC3 and TC4 flip on row 1, TC4 flips on row 2.
TC2 row 1 stays failing - nothing targets it. Target 7/8.

Result: 8/8 - GREEN. Better than the hypothesis: TC2 row 1 also flipped, although
nothing targeted it.

| Criterion          | Base | It1 | It2 | It3 |
|--------------------|------|-----|-----|-----|
| R1 TC1 sections    | PASS | PASS| PASS| PASS|
| R1 TC2 guarantee   | FAIL | FAIL| FAIL| PASS|
| R1 TC3 tech        | FAIL | FAIL| FAIL| PASS|
| R1 TC4 open dec.   | FAIL | FAIL| FAIL| PASS|
| R1 TC5 stack       | PASS | PASS| PASS| PASS|
| R2 TC5 stack (py)  | PASS | PASS| PASS| PASS|
| R2 TC2 guarantee   | FAIL | PASS| PASS| PASS|
| R2 TC4 open dec.   | FAIL | FAIL| FAIL| PASS|

Two of the passes are MARGINAL and the grader said so:

- TC2 row 1 passed on absence of evidence, not evidence of absence. The document
  references a survey_links table in its cleanup tasks and never defines that
  table's schema. Grader: "The defined schema itself does not contain the failure
  paths described in the rubric, but the incompleteness around token storage
  leaves the anonymity guarantee unverified." It dodged the criterion by omission.
- TC3 row 1 passed only because the grader exercised judgment the rubric did not
  grant it. ESLint, Prettier, Jest and Webpack appear unmarked; the grader
  reasoned they are "standard dev tools rather than cost-bearing infrastructure"
  and passed it. TC3 as worded ("every other technology") is over-broad - a
  criterion problem sitting one coin-flip from a spurious failure.

### Load-bearing audit (2026-08-12) - Context guarantee paragraph removed

Method: the command file was left untouched; the removal lives in
eval/arch-prompt-audit.md with eval/create-architecture-audit.yaml re-checking
only TC2, on both rows. Same pattern as the Exercise 4 prd-prompt-audit.

Result: row 1 FAIL, row 2 PASS.

Full history of TC2 (the criterion the paragraph targets):

| Run                          | Guarantee para | R1   | R2   |
|------------------------------|----------------|------|------|
| Baseline (no Context at all)  | absent         | FAIL | FAIL |
| Iteration 1                   | present        | FAIL | PASS |
| Iteration 2                   | present        | FAIL | PASS |
| Iteration 3                   | present        | PASS | PASS |
| Audit (It3 minus paragraph)   | absent         | FAIL | PASS |

Reading, honestly: the evidence is suggestive but NOT conclusive.
- Row 1 flipped PASS -> FAIL on removal, which is the load-bearing signal. But
  the Iteration 3 pass it is measured against was itself marginal (passed by
  omission), so the difference could be run variance rather than the paragraph.
  Removal produced a seventh distinct leak vector: survey_tokens stores
  recipient_email and token_used_at, correlatable to responses by (survey_id,
  submitted_at_hour), with both records coexisting for 15 days under the cleanup
  policy.
- Row 2 passed WITHOUT the paragraph, having failed at baseline and passed in
  every run since. So on the document-store stack the paragraph is not necessary
  once the other Context and Constraints are present.

Conclusion: KEEP, flagged for retest - load-bearing on the relational row, not
demonstrated on the document-store row, single runs on both. Same disposition as
Constraint 6 in create-prd: one domain's evidence is not enough to delete an
instruction, and not enough to call it proven either.

Untested removal candidates (not audited, time budget): Constraint 1, Constraint
2, the open-decisions Context paragraph, and the technical-environment Context
paragraph. The technical-environment paragraph is the most suspect - TC5 passed
at baseline with no Context at all.


---
## Upstream Quality Note (Step 4, 2026-08-12)

Both runs used the SAME finalized create-architecture.md and the same model
(haiku, isolated). Only the PRD differed:
- Strong PRD: 23 KB, produced by the finalized create-prd.md (RTCC, Constraints 1-8).
- Weak PRD: 14 KB, produced by an RT-only starter create-prd (Role and Task only,
  plus the output-format line, which Exercise 4 established as a harness artifact
  rather than a content lever).

| Measure                      | Strong PRD | Weak PRD |
|------------------------------|------------|----------|
| Architecture size            | 48 KB, 50 headings | 54 KB, 63 headings |
| SQL tables defined           | 5          | 10       |
| API endpoints listed         | 11         | 37       |
| Minimum-group suppression    | present    | ABSENT   |
| "anonym*" mentions           | 39         | 20       |
| manager / engineer mentions  | 59 / 31    | 29 / 8   |
| RBAC mentioned               | yes        | no       |
| Proposals marked             | 6 [proposed] + 1 "Proposal:" | 26 "Proposal:" |
| Alternatives offered         | 26         | 28       |

PRD quality impact on Architecture:

- Better PRD input -> the architecture implements the guarantee's operational
  mechanics rather than only asserting the guarantee. It carries the
  minimum-group-size suppression rule (3 responses) into the aggregation design,
  marks it provisional, and raises the small-team case as an open decision. Role
  separation is concrete: distinct manager and engineer paths and an RBAC model.

- Weaker PRD input -> the architecture is LONGER and more elaborate (more tables,
  three times the endpoints) but substantively thinner where it matters. There is
  no small-sample suppression anywhere: anonymity is asserted and then left
  breakable by a two-person team. Role separation thins out - no RBAC, engineers
  barely mentioned.

Two conclusions:

1. Command-level discipline transfers regardless of input quality. Proposal
   marking, alternatives, and provisional values held up on both runs, because
   those are properties of create-architecture.md, not of the PRD. The Step 3
   constraints are doing their work even on a weak input.

2. A command cannot invent a requirement its input never stated. The suppression
   rule exists in the strong architecture only because create-prd's Constraint 8
   put it in the PRD. Command quality controls HOW the document reasons; upstream
   quality controls WHAT it must reason about. This is the concrete argument for
   the pipeline: an Exercise 5 constraint is still doing work one command
   downstream, without create-architecture knowing anything about it.

Caveat: n=1 per condition, and volume metrics are counts, not judgments. The
suppression finding is the load-bearing one - it is a presence/absence difference,
not a matter of degree.


---
## Kata Stress Test - Conway's Game of Life - 2026-08-12

Input: eval/kata-b1-conway.txt - Kata B1 Challenge, Key Technical Challenges, and
Stretch Goals. The "Pipeline Focus" paragraph was deliberately EXCLUDED: it names
double-buffering as the expected answer, so including it would have handed the
model the result and measured nothing. Verified the input contains no mention of
double-buffering. The input does state the performance problem ("10,000 cells
updated every frame is a performance problem", "avoid re-rendering every cell on
every tick"); the test is whether the architecture names a specific solution.

Command: finalized create-architecture.md (Context x3, Constraints 1-2). Haiku,
isolated. Output: 14 KB.

Architecture output (key findings):
- Did the architecture name the double-buffering pattern? NO (term absent) - but
  the pattern is implemented. Its generation-step pseudocode builds nextAlive as a
  separate Set and assigns grid.cells = nextAlive, which preserves the correctness
  property (never mutate cells while computing neighbors). It never explains why
  the separate buffer is necessary.
- Did it address rendering optimization? YES, concretely. HTML5 Canvas [proposed]
  with rationale (avoids DOM per-cell bottleneck; SVG named as the alternative),
  dirty-region invalidation redrawing only changed cells, render(grid,
  previousGrid, ...), full redraw above a provisional 20% threshold, and a budget
  calculation: "<50 cells change per tick; at 20 ticks/sec, ~1,000 pixel fills/sec".
- Named an equivalent optimized state model: YES. Sparse Set<cellIndex> [proposed]
  over a dense array, with rationale "O(liveCount) instead of O(gridSize), 100-1000x
  faster for sparse grids", and Uint8Array with bit-packing named as the alternative.
- The failure the exercise warns about did NOT occur: there is no "store the grid
  in React useState and update on each tick" recommendation anywhere.

Verdict: PASS on the exercise's criterion, which asks for "double-buffering, or an
equivalent optimized state model". The literal term is absent; the pattern and a
justified equivalent state model are both present, and rendering optimization is
addressed separately.

Root cause if failed: n/a - not failed.
Action taken: none. No command change is warranted by a pass, and adding an
instruction about double-buffering specifically would be exactly the kata-specific
overfitting Module 5 forbids.

Other notable findings:

1. The generic instructions transferred to a domain they were never tuned on.
   Conway has no authentication, no database, no roles, and no privacy guarantee.
   Constraint 1 still produced [proposed] markers with alternatives, Constraint 2
   still produced provisional values ("100x100 (provisional)", "provisional
   threshold"), and the open technical decisions table still appeared. This is the
   anti-overfitting evidence the kata exists to provide.

2. TC1 FAILS on the kata, as predicted when it was written. The document has no
   authentication section and no explicit statement that the system has no
   authenticated actors. TC1 was flagged at the time as "the likely failure point
   on smaller inputs such as the kata" and it landed exactly there. Note what did
   NOT happen: it did not invent a login system for a cellular automaton. The
   failure is a missing disclaimer, not a TeamPulse-shaped misfire. Recorded as an
   open item rather than fixed under time pressure - the fix is a criterion
   decision (does a single-user local app owe the reader an explicit "no auth"
   statement?) more than a command change.


---
## Model Ladder Checkpoint - create-architecture.md - 2026-08-12

Haiku score: 8/8 (Exercise 6 onward: haiku only, generator and grader).

Progression: baseline 3/8 -> Iteration 1 4/8 -> Iteration 2 4/8 -> Iteration 3 8/8.

Gaps closed this exercise:
- TC2, guarantee holds across the whole data model. Closed by Context (a guarantee
  is a property of the whole system, traced through every place data rests or
  passes). Confirmed load-bearing on the relational row by the removal audit;
  see the audit entry for the caveat.
- TC3, technology beyond the PRD proposed rather than smuggled. Closed by
  Constraint 1.
- TC4, unresolved technical decisions stay unresolved. Closed by the open-decisions
  Context paragraph plus Constraint 2. The Context alone produced well-formed
  sections but left stragglers (a session timeout fixed in passing); the Constraint
  closed them at the point of use.

Gaps accepted (with reasoning):
- Two of the Green passes are MARGINAL and are accepted as such rather than
  iterated further: TC2 row 1 passed by omission (a referenced table whose schema
  is never defined), and TC3 row 1 passed only because the grader judged dev tools
  (ESLint, Jest, Webpack) to be outside "cost-bearing infrastructure" - judgment
  the rubric's wording does not actually grant it. TC3 as written is over-broad and
  is a criterion problem, not a command problem.
- TC1 fails on the Conway kata (no auth section, no explicit no-auth statement).
  Accepted for now: the fix is a criterion decision about whether a single-user
  local app owes an explicit "no authenticated actors" statement.
- The row 1 / row 2 split on TC2 is n=1 per condition. Single runs on a
  nondeterministic model cannot separate a real stack difference from variance.
- Four instructions were not audited for removal (Constraint 1, Constraint 2, the
  open-decisions Context paragraph, the technical-environment Context paragraph).
  They are recorded as untested removal candidates. The technical-environment
  paragraph is the most suspect: TC5 passed at baseline with no Context at all.

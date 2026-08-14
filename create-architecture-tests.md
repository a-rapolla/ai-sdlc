# create-architecture-tests.md

Command under test: create-architecture.md
Input: the TeamPulse PRD produced by create-prd (teampulse-prd.md).

## Test Case 1: Required architecture sections are present
Input: the TeamPulse PRD (teampulse-prd.md).
Expected Output Criteria:
- The architecture contains all six of these sections, each with concrete content
  (not just a heading): a component model (the parts of the system and how they
  connect), a data model (entities/tables and their relationships), an API or
  interface surface (the contracts between components), a security and
  authentication approach, deployment considerations (how and where it runs), and
  an explicit list of open technical decisions.
Failure Criteria (must NOT occur):
- Any of the six sections is missing, or present as a bare heading with no
  concrete content. A high-level narrative that never specifies the data model,
  the API surface, or the auth approach fails.

## Test Case 2: Performance-critical patterns get a specific named approach
Input: the TeamPulse PRD (teampulse-prd.md).
Expected Output Criteria:
- Wherever the system has a performance-sensitive or correctness-sensitive
  technical challenge (for example: high-volume concurrent writes, real-time
  rendering of many elements, concurrent state updates, large-scale aggregation),
  the architecture identifies that challenge explicitly and names a specific
  technique to handle it, and states why the naive or default approach would fail.
Failure Criteria (must NOT occur):
- Recommends only a generic default (for example "store it in state and update on
  each change" or "just query the database") for a part of the system where that
  default would not scale or would be incorrect, without naming the challenge or a
  specific mitigation.

## Test Case 3: Architecture is stack-appropriate, not generic
Input: the TeamPulse PRD (teampulse-prd.md).
Expected Output Criteria:
- The architecture makes concrete choices that fit the PRD's named stack (React,
  Node.js, PostgreSQL, Entra ID/OIDC): a relational schema with tables and keys
  for PostgreSQL, an OIDC Authorization Code sign-in flow for Entra ID, a Node
  process/service structure, and a React component and state structure. The choices
  are specific enough that they would be visibly different for a different stack
  (for example MongoDB collections instead of relational tables, or a different
  auth flow).
Failure Criteria (must NOT occur):
- Describes the system only in stack-neutral terms ("a database," "an auth service,"
  "a backend") that would read identically regardless of technology, without
  committing to the named stack's actual patterns.

## Test Case 4: Open technical decisions are surfaced
Input: the TeamPulse PRD (teampulse-prd.md).
Expected Output Criteria:
- The architecture contains an explicit section naming genuine technical decisions
  that are not yet settled and should be decided before or during build (for
  example: caching strategy, job-processing library vs custom, hosting and region,
  retention archival vs deletion), rather than silently picking one and hiding it.
Failure Criteria (must NOT occur):
- No open-technical-decisions section, or it silently commits to significant
  technical choices (cache, queue technology, hosting) as if settled, giving the
  team no signal that a decision was made on their behalf.

---
## Step 1 observation (starter, empty Context/Constraints)
Ran empty create-architecture against teampulse-prd.md.
- Opus: full, stack-specific architecture.
- Haiku: also full and stack-specific (schema, 8 anonymity layers, deployment).
Both complete. Reason: the PRD input is rich and already carries the stack and the
technical thinking, so the architecture inherits it. Empty Context not exposed
here. Value will show where the PRD is thin (Step 4) or where a technical pattern
is not in the PRD (Step 5, Conway performance).
Expectation: Tests 1, 3, 4 pass trivially on this rich PRD; Test 2 is the one
likely to bite, hardest on the Conway kata.
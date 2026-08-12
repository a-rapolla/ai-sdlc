# create-architecture-tests.md

Command under test: `create-architecture.md` (starter stub - Role and Task defined,
Context and Constraints empty).

Input under test: the TeamPulse Architecture input is the PRD produced by
`create-prd.md` from `eval/teampulse-desc.txt` (React frontend, Node.js backend,
PostgreSQL, Entra ID / OIDC SSO).

These criteria were written BEFORE any Context or Constraints were added to the
command, and committed before the command changed.


---
## Step 1 - Starter baseline observations (2026-08-11, haiku, isolated)

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

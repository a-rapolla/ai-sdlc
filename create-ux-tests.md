# create-ux-tests.md

Command under test: `create-ux.md` (starter stub - Role and Task defined, Context
and Constraints empty).

Input under test: `eval/teampulse-prd.md`, the TeamPulse PRD produced by the
finalized `create-prd.md` - the same input Exercise 6 used, so the two commands are
measured on identical ground.

These criteria were written BEFORE any Context or Constraints were added to the
command, and committed before the command changed.


---
## Step 1 - Starter baseline observations (2026-08-12, haiku, isolated)

Ran the Role+Task-only stub against the TeamPulse PRD in an empty folder. Output:
41 KB, 18 sections.

Present unprompted (so these are GUARDS, not drivers):
- Component-level specificity: 59 pixel/rem measurements, per-component layouts, a
  component file structure, the frontend API calls, browser support, performance
  budgets.
- Error states: a dedicated section plus a table of messages, placement, and
  persistence.
- Accessibility: a WCAG 2.1 AA section, ARIA references, and a separate QA
  checklist (17 mentions).
- Interaction flows: three named happy-path flows, one of them engineer-side.
- Mobile: 41 mentions; the survey form container is explicitly "Mobile-First".
- Empty / no-data states: present under wording other than "empty state" - "If 0
  responses: entire chart replaced with 'No data available for this time range'",
  plus suppression copy below the minimum response count.

Notable: the PRD's suppression threshold propagated into UX microcopy - "Not enough
responses to display results (X responses received, minimum 3 required)". An
Exercise 5 constraint is doing work two commands downstream, in the words a user
actually reads.

Gaps (these are the DRIVERS):
- Audience asymmetry. "Manager" appears 54 times, "engineer" 5. An engineer flow
  exists, but the specification is overwhelmingly manager-side, and the differing
  circumstances of the two audiences - technical sophistication, device, time
  available, frequency of use - are never discussed.
- The stated time budget is decoration, not design. Every occurrence of the
  3-minute requirement is either displayed copy ("Estimated time: 3 minutes") or a
  flow annotation ("selects answers (<= 3 minutes)"). Nothing in the design is
  shaped by it: no question-presentation decision, no argument that 5-7 questions
  fit the budget on a phone, no way to check. The spec DISPLAYS the requirement to
  the user instead of MEETING it. This is a sharper failure than omission, because
  the requirement was stated in the PRD.


---
## Test Case 1: The spec contains the elements a developer needs to build the UI

GUARD (expected to pass at baseline on TeamPulse; retained as a regression check
and as a likely failure point on smaller inputs such as a kata).

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- The specification contains all four of: (a) a component inventory - the UI
  elements that exist, named, with what each contains and does; (b) interaction
  flows showing how a user moves through a task from entry to completion;
  (c) state handling for states other than the happy path - at minimum empty/no-data,
  loading, and error states, each saying what the user sees; (d) accessibility
  provisions naming specific requirements rather than a general commitment.

Failure Criteria (must NOT occur):
- Any of the four is missing.
- A section exists in name only - an accessibility section that says "the interface
  will be accessible" without naming a standard, a keyboard behaviour, or a screen
  reader affordance; a component list with no description of what each component
  does.
- Non-happy-path states are mentioned as a category ("handle error states") without
  saying what is actually shown.


---
## Test Case 2: Distinct audiences get distinct specifications

DRIVER. This is the designated load-bearing Context test: audience is exactly what
Context carries, and the baseline demonstrably fails it.

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- Where the PRD describes more than one kind of user, the specification treats each
  as a separate design problem: what each one sees, what each one can do, and how
  each one's circumstances differ - device, frequency of use, time available,
  familiarity with the system, and technical sophistication.
- Each audience gets interaction flows and interface detail proportionate to what
  that audience actually does, rather than one audience receiving the whole
  document and the other a single flow.
- Where a design decision follows from an audience's circumstances, the
  specification says so, rather than leaving the reason implicit.

Failure Criteria (must NOT occur):
- The specification treats the system as having one undifferentiated "user".
- A second audience appears only as a single happy-path flow while every screen,
  component, and state is written for the first.
- The audiences' differing circumstances are never named - the document could be
  read without learning that the two groups differ in any respect other than
  permissions.


---
## Test Case 3: A stated experience requirement is engineered, not announced

DRIVER.

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- Where the PRD states a measurable experience requirement (a completion time, a
  device constraint, a reading level, a maximum number of steps), the design
  demonstrably serves it: the specification names the design decisions that make it
  achievable and shows the reasoning - how content is divided across screens or
  steps, what is removed to fit, how input is minimised.
- The specification states how the requirement can be checked after implementation,
  rather than assuming it holds.
- Device and context constraints appear as design decisions - target sizes, reach,
  input method, behaviour on a slow or interrupted connection - not only as a
  breakpoint list.

Failure Criteria (must NOT occur):
- The requirement is satisfied by DISPLAYING it to the user - "Estimated time: 3
  minutes" as on-screen copy, or an annotation on a flow diagram - while no design
  decision is traceable to it.
- The requirement is restated in a requirements or goals section and never
  mentioned again.
- Responsiveness is addressed only as breakpoints, with no statement about the
  actual conditions of use.


---
## Test Case 4: The spec is specific enough to implement without asking questions

GUARD on TeamPulse (passes at baseline); DRIVER on smaller or unfamiliar inputs.

Input: the TeamPulse PRD produced by create-prd.

Expected Output Criteria:
- Components are specified concretely enough to build: what is on the screen, in
  what arrangement, what the user can operate, what each control does, and the
  exact user-visible text for states and messages where wording matters.
- Behaviour is specified, not just appearance: what happens on submit, on failure,
  on repeat visit, on an action that cannot be completed.
- Where a value affects implementation (a limit, a timing, a size), it is given
  rather than left to the developer's judgement.

Failure Criteria (must NOT occur):
- Descriptions that cannot be implemented without a follow-up question - "a clean,
  modern dashboard", "an intuitive survey form", "clear feedback on submission".
- Controls named without their behaviour, or messages referred to without their
  text.
- The specification describes what the interface should feel like rather than what
  it contains and does.


---
## Test Case 5: Distinct modes get distinct interaction models

DRIVER for the kata stress test; expected to be untested by the TeamPulse input,
which has no mode-switching.

Input: a product whose description names more than one mode of operation.

Expected Output Criteria:
- Where a product offers more than one mode, variant, or difficulty of the same
  activity, each mode gets its own interaction flow describing what differs - what
  the user does, what the interface shows, and what feedback appears.
- Any information or visualisation that exists in only one mode is specified in
  detail: what is displayed, where, when it updates, and what it means to the user.
- Shared interface elements are identified as shared, so a developer knows what is
  built once and what is built per mode.

Failure Criteria (must NOT occur):
- The modes are covered by a mode selector plus one interface description, on the
  assumption that the modes are variants of the same screen.
- A mode-specific display is named but not specified - referred to as a feature
  without saying what appears on screen.
- The specification lists the modes in an inventory and never returns to them.

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


---
## Step 3 - Iteration record (haiku only, eval/create-ux-promptfoo.yaml)

Harness: generator haiku, grader haiku (Exercise 7: haiku is the sole provider).
One row, the committed TeamPulse PRD, four assertions - TC5 is not asserted here
because TeamPulse has no modes; it is checked at the kata in Step 5. Each run is
1 generation + 4 gradings, about 5 minutes, --no-cache.

### Baseline (2026-08-12) - stub with Context and Constraints empty

Prediction written before the run: 2/4 - TC1 and TC4 pass, TC2 and TC3 fail.

Result: 3/4. TC1 PASS, TC2 PASS, TC3 FAIL, TC4 PASS. The prediction was wrong
about TC2, and the miss is the useful part.

TC2 passed because this generation opened with "Unauthenticated (Survey
Respondent)" versus "Authenticated (Manager)" and gave engineers their own
sections, naming their differing contexts. But the Step 1 hand run - same stub,
same PRD, same model - produced 54 "manager" mentions against 5 "engineer". The
audience gap was a property of ONE generation, not of the command.

Methodological lesson: TC2 was designed off a single baseline sample and named the
designated load-bearing Context test on that basis. One generation is a sample, not
a measurement. This is the same n=1 exposure recorded in Exercise 6, here caught by
being wrong rather than by being careful.

TC3 is the stable failure. The grader reached the Step 1 finding independently:
"acknowledges the sub-3-minute requirement only in marketing copy (subject lines,
form subheading: 'takes ~2 minutes') but never traces design decisions back to
achieving it - no rationale for the 7-question limit as a timing constraint." Two
generations, two graders, same failure.

### Iteration 1 (2026-08-12) - Context added, Constraints still empty

Sequencing follows the Exercise 5 rule: the model is not being sloppy, it does not
know that a stated measurable requirement is a design constraint it must satisfy
and show its work on. That is Context. Exercise 7 also names audience and platform
as Context's job, and TC2's instability is an argument for stating it rather than
relying on luck.

Change: filled the Context section only - who a UX specification is for; that the
users come from the PRD and differ in more than permissions (device, frequency,
time and attention, familiarity, technical fluency), with decisions that follow
from those differences stated as such; and that a measurable experience requirement
in the PRD is a design constraint whose satisfaction must be shown (which decisions
about content, sequence and input effort make it achievable, what was left out to
fit, how it could be checked once built), not a claim to be repeated - displaying
the requirement to the user does not satisfy it.

Hypothesis: TC3 flips and TC2 stabilises. TC1 and TC4 hold. Target 4/4.

Result: 4/4 - GREEN in one iteration. Hypothesis confirmed.

TC3's flip is visible in the design, not just the score. The grader lists what
changed: "pagination on mobile to prevent overwhelm, max 100 characters per
question, radio buttons instead of checkboxes, no JavaScript requirement" - design
decisions traced to the time constraint. The baseline printed "Estimated time: 3
minutes" on screen; this version paginates the form to make three minutes
achievable and says why.

TC2 picked up the reasoning the Context asked for: "engineers use mobile with
limited attention windows; managers use desktop/laptop for ongoing monitoring".

Honest accounting: TC2 never failed on this scorecard - it passed at baseline and
after. It is a GUARD, not the driver it was labelled. The only criterion that ever
failed here is TC3, so one Context paragraph is doing all the demonstrable work.

### Run 3 (2026-08-12) - stability re-run, command unchanged

Hypothesis: 4/4 again. If green is not reproducible, it means less than it appears
and the n=1 problem that broke the TC2 prediction also applies to Green.

Result: 4/4. Green reproduces.

### Load-bearing audit (2026-08-12) - requirement-engineering Context removed

Method: the command file was left untouched; the removal lives in
eval/ux-prompt-audit.md with eval/create-ux-audit.yaml re-checking only TC3. Same
pattern as Exercise 6.

Hypothesis: TC3 falls back to FAIL. If it passes without the paragraph, Iteration
1's flip was variance and Green rests on luck.

Result: TC3 FAIL. The baseline failure mode returns verbatim - "displays
'Estimated time: 2 minutes' to users but does not show the design decisions that
achieve this... lists mobile breakpoints and UI characteristics without connecting
them to actual mobile conditions... No testable criteria."

| Paragraph | TC3  |
|-----------|------|
| absent (baseline)      | FAIL |
| present (Iteration 1)  | PASS |
| present (stability)    | PASS |
| absent (audit)         | FAIL |

LOAD-BEARING, n=2 in each condition. Materially stronger than the Exercise 6 audit,
where a single marginal pass was the only thing separating the two conditions. Here
the instruction has been on and off twice each and the outcome tracks it every time.
The extra five minutes for the stability run is what bought that.

Untested removal candidates (not audited): the audience paragraph and the opening
framing paragraph of Context. The audience paragraph is the suspect one - TC2
passed at baseline without it.


---
## Three-Command Pipeline Check (Step 4, 2026-08-12)

Compared two full chains, both haiku and isolated:

| Stage        | Improved chain                          | RT-only chain              |
|--------------|-----------------------------------------|----------------------------|
| PRD          | finalized create-prd (Constraints 1-8)  | RT-only starter            |
| Architecture | finalized create-architecture           | RT-only starter            |
| UX           | finalized create-ux (Context x3)        | RT-only starter stub       |

Note on the data flow: create-ux takes the PRD as its input, not the architecture
document - that is how the command is defined and how Module 5 runs the pipeline.
So the architecture sits in the chain but does not feed the UX command. This
comparison is PRD-quality plus UX-command-quality against the same, with the
architecture alongside rather than in between.

Method: the RT-only chain's UX output was graded against the SAME four rubrics from
eval/create-ux-promptfoo.yaml, by the same grader model (haiku), so the two numbers
are comparable.

Result: improved chain 4/4, RT-only chain 2/4.

| Criterion                   | Improved | RT-only |
|-----------------------------|----------|---------|
| TC1 required elements       | PASS     | PASS    |
| TC2 distinct audiences      | PASS     | FAIL    |
| TC3 requirement engineered  | PASS     | FAIL    |
| TC4 implementable           | PASS     | PASS    |

The two failures are exactly the two criteria the Context targets. The guards pass
on both chains, which is what a guard is for.

A methodological warning worth keeping. A first pass at this comparison used text
metrics, and they pointed the WRONG WAY: the RT-only spec is longer (57 KB vs
37 KB), has more headings (67 vs 49), more microcopy (123 vs 78), and mentions
pagination 8 times against 0. On counts it looks richer. The graded result is the
opposite, and the grader says why: "Mobile responsiveness appears as breakpoints and
touch-target sizes, not as a solution to the time constraint... no design decision
is shown to be traceable to the 3-minute target." The RT-only spec contains all the
right words and connects none of them to anything. Counting was the wrong
instrument, and it nearly became the finding.

This is the third independent sighting of the same pattern in two exercises: the
weaker command produces the LONGER, thinner document (Exercise 6 Step 4 upstream
check, the Exercise 5 Step 6 backfill, and now this).

Caveat: the RT-only chain's UX was generated from the RT-only PRD, so this compares
whole chains and cannot separate how much of the gap comes from the weaker PRD
versus the weaker UX command. A cleaner isolation - the finalized UX command run
against the weak PRD - was not run.


---
## Kata Stress Test - Tic-Tac-Toe - 2026-08-12

Input: eval/kata-b3-tictactoe.txt - Kata B3 Challenge, Key Technical Challenges and
Stretch Goals. The "Pipeline Focus" paragraph was excluded, as with Conway in
Exercise 6, because it tells the reader what to watch for.

UX output (key findings):
- Did it produce mode-specific interaction flows? YES. Six flows scoped by mode -
  mode selection, setup for PvP and Easy AI, setup for Impossible AI, gameplay
  (explicitly all modes), move evaluation (Impossible AI only), conclusion - plus
  per-mode interaction constraints. Shared elements identified AS shared, which is
  TC5's third clause.
- Did it describe the move evaluation visualization? YES, specified rather than
  named: bottom-right of each empty cell, 12-14px semi-bold, 60-80% opacity rounded
  background, colour mapped to score sign and magnitude with hex values, integer
  scores in a -10..+10 range, a 1-2 second display window, a distinct cue on the
  cell the AI is about to play, overlays cleared after the mark lands. It also
  translates the concept for a player who has never heard of minimax: "Positive:
  favors the AI. Negative: favors the human. 0: neutral or draw."

Other notable findings:

1. NO OVERFITTING. Zero invented personas, audiences or user segments. The Context's
   audience paragraph correctly no-opped on a single-audience product instead of
   manufacturing "novice versus expert player". That is the failure a
   tuned-for-TeamPulse command would have shown.

2. TC1 FAILED, for the second kata running. Accessibility in the whole document was
   one line: "Labels (X and O) should be large and high-contrast for readability" -
   no standard, no keyboard operation for the board (despite the document saying
   the primary interaction is mouse AND keyboard), no screen reader affordance, no
   contrast ratio. Exercise 6's Conway kata failed its TC1 too (no auth section, no
   explicit statement of absence). One occurrence is an observation; two is a
   pattern: the required-elements guard degrades on small products.

Root cause: Constraints gap. The concept was present (the model knows what an
accessibility section is - it wrote a thorough one for TeamPulse) but nothing
required it when the product felt too small to warrant it.

Action taken: added Constraint 1 - accessibility stated as named, checkable
provisions (the standard, how every interactive element is operated without a
mouse, what assistive technology announces, the contrast requirement), explicitly
"however small or simple the product is". Written generically: no product named and
no standard named, because the failure was silence, not the wrong standard.

Validation, three kata generations and one regression run:

| Run | Constraint | TC1  | TC5  |
|-----|------------|------|------|
| v1  | absent     | FAIL (accessibility) | PASS |
| v2  | present    | PASS | FAIL |
| v3  | present    | FAIL (error states)  | PASS |

TeamPulse regression with the constraint: 4/4. No regression.

Two findings from that table:

- v2's TC5 failure was VARIANCE, not the constraint. v3 has the same constraint and
  produces per-mode flows again. Without the re-run, a good constraint would have
  been reverted on the strength of one sample - the same n=1 trap that broke the
  TC2 prediction earlier in this exercise. Three minutes of compute prevented it.
- The constraint did what it targeted: v3's grader explicitly praises "comprehensive
  accessibility requirements" and then fails TC1 on MISSING ERROR STATES instead.
  TC1 is a compound criterion - four elements, fails if any is absent - so closing
  the accessibility hole on a tiny product exposed the next weakest element. Same
  shape as the Exercise 6 anonymity finding: fix one vector and a compound criterion
  fails at the next one.

Accepted, not fixed: TC1 still fails on the kata for the error-states element.
Closing it would mean another constraint, another kata run and another regression
run, and the exercise's own kata criterion (mode-specific flows and the evaluation
visualisation) passes. Recorded as the open item.


---
## Model Ladder Checkpoint - create-ux.md - 2026-08-12

Haiku score: 4/4 on the TeamPulse scorecard (Exercise 7 onward: haiku only,
generator and grader).

Progression: baseline 3/4 -> Iteration 1 (Context) 4/4 -> stability re-run 4/4 ->
Constraint 1 added, regression 4/4.

Gaps closed this exercise:
- TC3, a stated experience requirement engineered rather than announced. Closed by
  Context. Confirmed load-bearing with n=2 in each condition: absent FAIL, present
  PASS, present PASS, absent FAIL.
- Kata accessibility (TC1 element d). Closed by Constraint 1, validated on the kata
  and regression-checked on TeamPulse.

Gaps accepted (with reasoning):
- TC1 fails on the kata on the error-states element. The accessibility half is
  fixed; the compound criterion now fails at its next weakest point. Left open
  rather than chasing it with a third instruction inside this exercise.
- TC2 (distinct audiences) never failed on this scorecard - it passed at baseline
  and in every run since. It was designed as the headline driver off a single Step 1
  sample where "manager" outnumbered "engineer" 54 to 5. One generation is a sample,
  not a measurement. TC2 is a guard, not a driver, and the audience Context
  paragraph is therefore an UNTESTED removal candidate.
- The opening framing paragraph of Context is also untested for removal.
- The Step 4 pipeline comparison conflates two variables (weaker PRD and weaker UX
  command) and cannot attribute the 4/4 versus 2/4 gap between them.

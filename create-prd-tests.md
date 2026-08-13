# create-prd-tests.md

Product under test (the bare prompt):
"Write a product requirements document for a Pomodoro timer application with
25-minute work intervals, 5-minute break intervals, session tracking, and a
weekly productivity heat map."


## Test Case 1a: Notifications are specific, not vague
Input: the full Pomodoro description above.
Expected Output Criteria:
- The PRD specifies the audio behavior for BOTH transitions (work->break and
  break->work), makes the two signals distinguishable, and states what happens
  if the browser blocks audio.
Failure Criteria (must NOT occur):
- Describes a single generic "notification sound" without distinguishing the
  two transitions.


## Test Case 1b: Session logging is specific, not vague
Input: the full Pomodoro description above.
Expected Output Criteria:
- The PRD specifies exactly what each completed session records (e.g., date,
  start time, end time) AND where that data is stored and whether it survives
  closing and reopening the browser.
Failure Criteria (must NOT occur):
- Says sessions are "tracked" or "logged" without naming the stored fields or
  the storage.


## Test Case 2: Timing accuracy is measurable, not subjective
Input: the full Pomodoro description above.
Expected Output Criteria:
- The PRD must specify how timer accuracy is measured, including the tolerance
  allowed (for example, drift must not exceed +/-1 second over a 25-minute
  interval). It must not just call the timer "accurate."
Failure Criteria (must NOT occur):
- Uses subjective words like "accurate," "precise," or "reliable" without a
  measurable tolerance.


## Test Case 3: Scope boundaries are explicit, not just omitted
Input: the full Pomodoro description above.
Expected Output Criteria:
- The PRD must contain an explicit "Out of Scope" (or "Not in V1") section that
  names at least three features a reader might reasonably assume are included
  but are not (for example: a mobile app, syncing across devices, or user
  accounts/login).
Failure Criteria (must NOT occur):
- No explicit out-of-scope section, or features left out silently instead of
  being named.


## Test Case 4: The weekly heat map and its data are fully specified
Input: the full Pomodoro description above.
Expected Output Criteria:
- The PRD must specify how the heat map is displayed (for example, a grid of the
  week's days shaded by number of completed sessions), where the data is stored,
  whether it persists across closing and reopening the browser, how it updates
  so no data is lost, and what each cell represents.
Failure Criteria (must NOT occur):
- Vague wording such as "safely stored," or failing to say where the data lives
  and whether it survives a browser restart.


## Test Case 5: Genuine open questions are surfaced, not silently assumed
Input: the full Pomodoro description above.
Expected Output Criteria:
- The PRD must contain an explicit "Open Questions" section naming genuine
  unknowns the description does not settle (for example: browser app or desktop
  app, single-user or multi-user, what happens if the user closes the tab
  mid-session).
Failure Criteria (must NOT occur):
- Silently assumes an answer to one of these without flagging it, or has no
  Open Questions section at all.


---
## Bare-prompt baseline (graded blind, before writing any recipe)

- 1a notifications: FAIL - one generic chime for both transitions; no distinct
  signals; no handling of the browser blocking audio.
- 1b logging:       PASS - names the fields, stores them, survives a restart.
- 2  timing:        PASS - "drift < 1s per 25-minute interval."
- 3  scope:         PASS - out-of-scope section names 5 excluded items.
- 4  heat map:      PASS - grid defined, cell = count of sessions, persists.
- 5  open questions:FAIL - has a section, but silently assumes a browser app
  and a single user.

Result: 2 of 6 FAIL (1a, 5). The tests work - they caught real gaps.


---
## Exercise 3 - Promptfoo two-model baseline

Config: eval/create-prd-promptfoo.yaml (providers: sonnet + haiku, via
eval/claude-provider.js). Each generation runs in an isolated empty directory
so the model cannot read this test file.

Finding: without an output-format rule, a model sometimes returned a SUMMARY of
the PRD ("I've drafted a PRD that...") instead of the PRD itself, so the grader
saw a description, not the document. Fix carried into Exercise 4: Constraint 7
(output only the PRD, no preamble, no file writes).


---
## Exercise 4 - Load-bearing + Model Ladder audit

Green state: both models pass all 6 checks after adding Constraint 7.

Load-bearing audit - Constraint 6 (Open Questions):
- Removed Constraint 6, re-ran on both models 3 times under the isolated harness.
- Control (rule 6 in):  sonnet PASS, haiku PASS.
- Rule 6 removed:       sonnet PASS / PASS / PASS; haiku FAIL / FAIL / PASS.
- Conclusion: Constraint 6 IS load-bearing. Sonnet adds an Open Questions
  section on its own; Haiku fails 2 of 3 times without the rule. KEEP it.

Model Ladder: the only real gap is Sonnet inferring what Haiku does not.
Rule 6 protects the cheaper model. No rule proved to be dead weight this round.


---
## Exercise 4 Reflection

1. Most surprising load-bearing rule: Constraint 6 (Open Questions). I expected
   both models to add it on their own. Removing it broke Haiku 2 of 3 times.

2. What the model gap revealed: the smart model quietly does things you never
   asked for; the cheaper model does exactly what it is told and no more.

3. Decision: keep all 7 constraints. Rule 6 earns its place because it protects
   the cheaper model from forgetting the Open Questions section.


## TeamPulse Test Cases (Exercise 5)

## Test Case 6: Anonymity is defined as checkable rules, not a promise
Input: the TeamPulse product description.
Expected Output Criteria:
- The PRD states that no individual response can be attributed to a person in
  ANY view, including manager, admin, and direct database/raw-data views.
- The PRD describes the mechanism that enforces this (for example, keeping
  identity separate from responses so the two cannot be joined).
- No feature (export, filter, admin mode) can return an individual response.
Failure Criteria (must NOT occur):
- Uses "anonymous" as a general assurance without naming these enforceable
  properties, or leaves any view (manager, admin, or database) able to attribute
  a response to a person.


## Test Case 7: Distinct user roles are specified
Input: the TeamPulse product description.
Expected Output Criteria:
- The PRD defines a Manager role that can configure surveys (question set,
  schedule/frequency, team roster) AND view the dashboard for their OWN team's
  aggregated results.
- The PRD defines an Engineer/Respondent role that can ONLY submit answers; it
  cannot configure anything and cannot see any results.
- Each role's boundaries are explicit (what it can AND cannot do), not just implied.
Failure Criteria (must NOT occur):
- Treats the system as having one kind of user, gives engineers and managers the
  same access, or omits the submit-only vs. configure-and-view distinction.
- Allows engineers to configure surveys or view results.


## Test Case 8: Named out-of-scope items all appear
Input: the TeamPulse product description.
Expected Output Criteria:
- The out-of-scope section names all four excluded items by name: ML-based
  sentiment analysis, comparison across teams, integration with HR systems, and
  native mobile apps.
Failure Criteria (must NOT occur):
- Omits any of the four from the out-of-scope section, lists them only
  generically without naming these four, or treats any of them as an in-scope
  feature to build.


## Test Case 9: Small-team re-identification is addressed
Input: the TeamPulse product description.
Expected Output Criteria:
- The PRD defines a minimum number of responses below which results are not
  shown, and states what is shown instead.
- The PRD states how a team too small to ever reach that minimum is handled.
Failure Criteria (must NOT occur):
- Shows aggregate results regardless of how few people responded, or does not
  address teams too small to preserve anonymity.

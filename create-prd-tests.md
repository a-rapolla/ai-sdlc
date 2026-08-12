# create-prd-tests.md

Product under test (the bare prompt):
"Write a product requirements document for a Pomodoro timer application with
25-minute work intervals, 5-minute break intervals, session tracking, and a
weekly productivity heat map."



## Test Case 1: Notifications and session logging are specific, not vague

Input: the full Pomodoro description above.

Expected Output Criteria:
- The PRD specifies the audio behavior for BOTH transitions (work->break and
  break->work), makes the two signals distinguishable, and states what happens
  if the browser blocks audio.
- The PRD specifies exactly what each completed session records (e.g., date,
  start time, end time) AND where that data is stored and whether it survives
  closing and reopening the browser.

Failure Criteria (must NOT occur):
- Says sessions are "tracked" or "logged" without naming the stored fields or the storage.
- Describes a single generic "notification sound" without distinguishing the two transitions.



## Test Case 2: Timing accuracy is measurable, not subjective

Input: the full Pomodoro description above.

Expected Output Criteria:
- The PRD must specify how timer accuracy is measured, including the tolerance
  allowed for the required times (for example, drift must not exceed +/-1 second
  over a 25-minute interval). It must not just call the timer "accurate."

Failure Criteria (must NOT occur):
- The PRD leaves success criteria open, or uses subjective words like "accurate,"
  "precise," or "reliable" without a measurable tolerance. These are open to
  interpretation and not a uniform way to measure success.



## Test Case 3: Scope boundaries are explicit, not just omitted

Expected Output Criteria:
- The PRD must contain an explicit "Out of Scope" (or "Not in V1") section that
  names at least three features a developer or stakeholder might reasonably
  assume are included but are not - for example: a mobile/phone app, syncing
  across devices, user accounts/login, or automatically detecting which
  application the user is in / whether they are actually working.

Failure Criteria (must NOT occur):
- The PRD has no explicit out-of-scope section, or it only omits features
  silently instead of naming them as out of scope.



## Test Case 4: The weekly heat map and its data are fully specified

Expected Output Criteria:
- The PRD must specify how the heat map is displayed (for example, a grid of the
  week's days shaded by number of completed work sessions), where the session data
  is stored, whether it persists across closing and reopening the browser, how it
  is updated so no data is lost, and what each data point (cell) represents.

Failure Criteria (must NOT occur):
- The PRD is vague or uses interpretation-open wording such as "safely stored" or
  "accurately measured" instead of facts that can be evaluated, or it fails to say
  where the data lives and whether it survives a browser restart.



## Test Case 5: Genuine open questions are surfaced, not silently assumed

Expected Output Criteria:
- The PRD must contain an explicit "Open Questions" section that names genuine
  unknowns the description does not settle - for example: is it a browser app or a
  standalone/desktop app, is it single-user or multi-user, what happens if the user
  closes the tab or window mid-session, and after how many work cycles the longer
  break occurs.

Failure Criteria (must NOT occur):
- The PRD silently assumes an answer to one of these unknowns (for example, just
  treating it as a browser app) without flagging it as a decision to be made, or it
  has no Open Questions section at all.



---
## Step 3 - Bare-prompt baseline results (2026-08-10)

Ran the bare prompt BLIND.
Graded the resulting PRD against the 5 test cases:

- Test Case 1 (notifications + logging): FAIL - one generic chime for both
  transitions, no distinct signals, no handling of the browser blocking audio.
  (Logging half passed: fields + localStorage + persistence.)
- Test Case 2 (timing accuracy): PASS - "drift < 1s per 25-minute interval",
  wall-clock not tick-based. (Thin on measurement method.)
- Test Case 3 (scope boundaries): PASS - Non-goals names 5 excluded items.
- Test Case 4 (heat map + persistence): PASS - grid defined, cell = count of
  completed sessions by start time, localStorage, persists across restart.
- Test Case 5 (open questions): FAIL - has an Open Questions section, but
  silently assumes a browser web app and single-user without flagging them.
  Note: this criterion is ambiguous and should be split/tightened later.

Result: 2 of 5 FAIL (TC1, TC5). Tests are working - they caught real gaps.



---
## Exercise 3 - Promptfoo two-model baseline (2026-08-10)

Config: eval/create-prd-promptfoo.yaml (providers: sonnet + haiku, via claude.js)
Ran isolated in eval/ so the model could not read this test file.

Result:
- haiku: PASS (all 5 checks) - produced the actual PRD.
- sonnet: FAIL - returned a SUMMARY about the PRD ("I've drafted a PRD that
  addresses all six constraints...") instead of the PRD itself, so the grader
  saw a description, not the document.

Reading: harness / output-format artifact, not a prompt-quality gap. Sonnet
wrapped its answer in preamble (and likely tried to save the PRD to a file).

Next change (Exercise 4): add an output-format constraint to create-prd.md -
"Output only the PRD as Markdown. No preamble, commentary, or summary. Do not
write files." Then re-run; both models should emit the PRD.



---
## Exercise 4 - Load-bearing + Model Ladder audit (2026-08-10)

Green state: both models pass all 5 checks. sonnet 5/5, haiku 5/5. Delta = 0.

How Sonnet reached green:
- Sonnet had scoped audio OUT of V1, so it could not "handle blocked audio."
  The product never specified audio, so the check was over-assuming. Fix: made
  check 1 conditional (handle blocked audio only IF the PRD includes audio).
  A criterion fix, not a prompt fix - forcing audio into the reusable command
  would break genericness.
- Added Constraint 7 (output only the PRD, no preamble or file writes) so both
  models return the document itself, not a summary of it.

Load-bearing audit:
- Removed Constraint 6 (Open Questions) and re-ran that check on both models.
- Result: both still PASSED. Constraint 6 is NOT load-bearing on this domain;
  the models add an Open Questions section by default.
- Decision: flag as removal candidate; retest on another product before deleting.

Model Ladder audit: no Haiku-only failures. Passing Haiku means well-specified.
Only divergence was Sonnet's audio scoping, resolved above.

Tooling note: the improving/promptfoo claude.js wrapper hits a
Windows command-line length limit (spawn ENAMETOOLONG) on large outputs. Fixed
by rewriting it as an in-process Promptfoo provider (eval/claude-provider.js)
that pipes to claude via stdin.


---
## Exercise 4 Reflection (2026-08-10)

1. Most surprising load-bearing: Constraint 7 (output only the PRD). A formatting
   rule, but without it Sonnet returned a summary, not the PRD, and failed every
   content check.

2. Most surprising dead weight: Constraint 6 (Open Questions). Removing it changed
   nothing; both models add an Open Questions section on their own.

3. What the model gap revealed: no Haiku-only failures this run; Sonnet was the one
   that failed. Where the command and tests left a decision unstated (is there
   audio?), the two models chose differently - Sonnet left audio out, Haiku put it
   in. The gap was an unstated spec, not a capability difference.

4. Gaps closed vs accepted:
   - Closed: output format (Constraint 7); over-assuming audio check (made
     conditional) rather than hard-coding audio into the reusable command.
   - Accepted: kept Constraint 6 as a removal candidate, not deleted - one passing
     domain is not enough to remove it; retest on another product first.



---
## TeamPulse Test Cases (Exercise 5, written before any command change)

## Test Case 6: Anonymity is defined as checkable rules, not a promise

Input: the TeamPulse product description.

Expected Output Criteria:
- The PRD defines anonymity as concrete, checkable rules, not a general promise.
  It states that no individual response can be attributed to a person in ANY view,
  including manager, admin, and direct database or raw-data views; that no API
  route, export, filter, or admin mode returns individual responses; and it
  describes the mechanism that enforces this (for example, separating identity
  from response so the two cannot be joined).

Failure Criteria (must NOT occur):
- Uses "anonymous" as a general assurance without naming these enforceable
  properties, or leaves any view (admin or database) able to attribute a response.

## Test Case 7: Distinct user roles are specified

Input: the TeamPulse product description.

Expected Output Criteria:
- The PRD specifies at least two distinct roles with different access and
  requirements: respondents, who only submit surveys, and managers, who configure
  surveys and view aggregated results for their own team. It states what each role
  can and cannot do.

Failure Criteria (must NOT occur):
- Treats the system as having one kind of user, gives respondents and managers the
  same access, or omits the submit-only versus configure-and-view distinction.

## Test Case 8: Named out-of-scope items all appear

Input: the TeamPulse product description.

Expected Output Criteria:
- The out-of-scope section names, by name, all four items the description excludes:
  ML-based sentiment analysis, cross-team comparison, HR-system integration, and
  native mobile apps.

Failure Criteria (must NOT occur):
- Omits any of those four named items, or lists out-of-scope items only generically
  without naming these four.

## Test Case 9: Small-team re-identification is addressed

Input: the TeamPulse product description.

Expected Output Criteria:
- The PRD addresses the small-sample re-identification risk: it defines a minimum
  number of responses below which results are not shown (and what is shown
  instead), and states how the system handles a team too small to ever reach that
  threshold.

Failure Criteria (must NOT occur):
- Shows aggregate results regardless of how few people responded, or does not
  address teams too small to preserve anonymity.


---
## Exercise 5 - TeamPulse generalization (2026-08-11)

Tested create-prd against TeamPulse (enterprise: anonymity guarantee, two roles,
SSO, scheduled surveys). Wrote 4 TeamPulse test cases (6-9), committed before any
command change.

Iteration record (TeamPulse, sonnet + haiku):
- Baseline: haiku 4/4, sonnet 2/4 (failed anonymity-any-view and small-team).
- Iter 1, Context added (hard guarantees enforced at every layer and actor,
  including admins and direct DB; edge cases addressed): sonnet 3/4;
  anonymity-any-view now passes. LOAD-BEARING (its addition fixed that check).
- Iter 2, Context strengthened (guarantee edge cases get a safe default, not
  deferral): sonnet 3/4, no change. NOT clearly load-bearing; Constraint 8 did
  the work. Removal candidate; retest on another product before deleting.
- Iter 3, Constraint 8 added (privacy/anonymity aggregates must define a
  minimum-sample suppression threshold and handle too-small groups): small-team
  PASSES. LOAD-BEARING. A different anonymity vector then failed on sonnet
  (timestamp correlation at the admin/DB layer).

Model Ladder checkpoint:
- haiku (the bar) 4/4 every run: command well-specified by the program standard.
- sonnet varies run to run: each generation leaves a different anonymity hole
  (missing suppression, then open timestamp correlation). Anonymity is a
  multi-vector guarantee; closing every vector on sonnet would need a
  TeamPulse-specific anonymity checklist = overfitting.
- Gap accepted (sonnet-only variance on the anonymity checks). Reasoning: rubric
  clear, output producible (haiku and the Step 1 run produce airtight anonymity),
  iterations exhausted without overfitting or re-rolling. Matches the exercise
  escape (clear rubric, producible output).

Regression check (updated command vs Pomodoro, Module 1 tests):
- sonnet 5/5, haiku 5/5. NO regression. Additions are conditional and did not fire
  on Pomodoro, confirming they stayed generic.

Net: command generalized to a different enterprise product, improved its two
weakest TeamPulse checks, did not break Pomodoro. Kept: Context guarantee-
enforcement, Constraint 8 suppression. Flag for removal test: iter-2 safe-default
sentence.



---
## Harness note - isolation gap in Promptfoo runs (found 2026-08-12)

eval/claude-provider.js spawned claude without setting cwd, so Promptfoo runs in
Exercises 3-5 executed with the repo readable one directory up, including this
file. Hand-run generations were isolated in an empty folder; the automated path
was not.

No evidence any run read the criteria. Contamination can only inflate scores, so
every recorded FAILURE stands. Conclusions resting on a PASS carry a caveat:
- Exercise 4's finding that Constraint 6 (Open Questions) is not load-bearing -
  the removal test concluded from a pass.
- Exercise 5's haiku 4/4 Model Ladder green.

Fixed in Exercise 6: the provider now runs each generation in a fresh empty temp
directory, created per call and removed after (verified - the model reports an
empty cwd with no parent access). Constraint 6's removal test should be re-run
under the fixed harness before the constraint is deleted.

General lesson: isolation enforced by habit does not survive automation. The
manual safeguard did not travel into the tool that replaced the manual step, and
it failed silently. Same risk now applies to eval/arch-prompt.md, which is a copy
of create-architecture.md kept in sync by a rule that currently lives in a comment
rather than in a script.

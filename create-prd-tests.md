\# create-prd-tests.md



Product under test (the bare prompt):

"Write a product requirements document for a Pomodoro timer application with

25-minute work intervals, 5-minute break intervals, session tracking, and a

weekly productivity heat map."







\## Test Case 1: Notifications and session logging are specific, not vague



Input: the full Pomodoro description above.



Expected Output Criteria:

\- The PRD specifies the audio behavior for BOTH transitions (work->break and

&#x20; break->work), makes the two signals distinguishable, and states what happens

&#x20; if the browser blocks audio.

\- The PRD specifies exactly what each completed session records (e.g., date,

&#x20; start time, end time) AND where that data is stored and whether it survives

&#x20; closing and reopening the browser.



Failure Criteria (must NOT occur):

\- Says sessions are "tracked" or "logged" without naming the stored fields or the storage.

\- Describes a single generic "notification sound" without distinguishing the two transitions.







\## Test Case 2: Timing accuracy is measurable, not subjective



Input: the full Pomodoro description above.



Expected Output Criteria:

\- The PRD must specify how timer accuracy is measured, including the tolerance

&#x20; allowed for the required times (for example, drift must not exceed +/-1 second

&#x20; over a 25-minute interval). It must not just call the timer "accurate."



Failure Criteria (must NOT occur):

\- The PRD leaves success criteria open, or uses subjective words like "accurate,"

&#x20; "precise," or "reliable" without a measurable tolerance. These are open to

&#x20; interpretation and not a uniform way to measure success.







\## Test Case 3: Scope boundaries are explicit, not just omitted



Expected Output Criteria:

\- The PRD must contain an explicit "Out of Scope" (or "Not in V1") section that

&#x20; names at least three features a developer or stakeholder might reasonably

&#x20; assume are included but are not - for example: a mobile/phone app, syncing

&#x20; across devices, user accounts/login, or automatically detecting which

&#x20; application the user is in / whether they are actually working.



Failure Criteria (must NOT occur):

\- The PRD has no explicit out-of-scope section, or it only omits features

&#x20; silently instead of naming them as out of scope.







\## Test Case 4: The weekly heat map and its data are fully specified



Expected Output Criteria:

\- The PRD must specify how the heat map is displayed (for example, a grid of the

&#x20; week's days shaded by number of completed work sessions), where the session data

&#x20; is stored, whether it persists across closing and reopening the browser, how it

&#x20; is updated so no data is lost, and what each data point (cell) represents.



Failure Criteria (must NOT occur):

\- The PRD is vague or uses interpretation-open wording such as "safely stored" or

&#x20; "accurately measured" instead of facts that can be evaluated, or it fails to say

&#x20; where the data lives and whether it survives a browser restart.







\## Test Case 5: Genuine open questions are surfaced, not silently assumed



Expected Output Criteria:

\- The PRD must contain an explicit "Open Questions" section that names genuine

&#x20; unknowns the description does not settle - for example: is it a browser app or a

&#x20; standalone/desktop app, is it single-user or multi-user, what happens if the user

&#x20; closes the tab or window mid-session, and after how many work cycles the longer

&#x20; break occurs.



Failure Criteria (must NOT occur):

\- The PRD silently assumes an answer to one of these unknowns (for example, just

&#x20; treating it as a browser app) without flagging it as a decision to be made, or it

&#x20; has no Open Questions section at all.







\---

\## Step 3 - Bare-prompt baseline results (2026-08-10)



Ran the bare prompt BLIND.

Graded the resulting PRD against the 5 test cases:



\- Test Case 1 (notifications + logging): FAIL - one generic chime for both

&#x20; transitions, no distinct signals, no handling of the browser blocking audio.

&#x20; (Logging half passed: fields + localStorage + persistence.)

\- Test Case 2 (timing accuracy): PASS - "drift < 1s per 25-minute interval",

&#x20; wall-clock not tick-based. (Thin on measurement method.)

\- Test Case 3 (scope boundaries): PASS - Non-goals names 5 excluded items.

\- Test Case 4 (heat map + persistence): PASS - grid defined, cell = count of

&#x20; completed sessions by start time, localStorage, persists across restart.

\- Test Case 5 (open questions): FAIL - has an Open Questions section, but

&#x20; silently assumes a browser web app and single-user without flagging them.

&#x20; Note: this criterion is ambiguous and should be split/tightened later.



Result: 2 of 5 FAIL (TC1, TC5). Tests are working - they caught real gaps.








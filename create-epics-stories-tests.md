# create-epics-stories-tests.md

Command under test: `create-epics-stories.md` (starter stub - Role and Task defined,
Context and Constraints empty).

Inputs under test: the three finalized upstream documents committed in Exercises 5-7 -
`eval/teampulse-prd.md`, `eval/sample-architecture-teampulse.md`, and
`eval/sample-ux-teampulse.md`.

These criteria were written BEFORE any Context or Constraints were added to the
command, and committed before the command changed.

Note on method: Exercise 8 has no "run the starter and observe" step, unlike
Exercises 6 and 7. These criteria were therefore written with NO output in front of
them - the purest form of the discipline, and harder, because there is nothing to
anchor on. It also means no criterion can be labelled DRIVER or GUARD yet. The
baseline run assigns those labels, and a prediction is recorded before it runs.


---
## Test Case 1: Each story is one shippable behaviour, not a bundle

Input: the three finalized upstream documents.

The exercise's problem: a story that takes more than one sprint is too large, but
the team's velocity is unknown. Effort cannot be measured from the document, so
this criterion measures STRUCTURE instead - the signals of oversize that do not
need velocity to detect.

Expected Output Criteria:
- Each story delivers one observable behaviour for one actor, and could be built,
  demonstrated, and found useful on its own.
- No story bundles sub-behaviours that could each ship separately and independently
  deliver value - a story covering creating, editing, scheduling, and deleting the
  same object is four stories, not one.
- No story serves two different actors in one scope: work that is partly for one
  role and partly for another is split.

Failure Criteria (must NOT occur):
- A story whose title or scope joins independent capabilities ("manage X", "set up
  and configure Y and Z", "build the dashboard").
- A story whose acceptance-criteria list has grown so long that it is covering
  several behaviours at once rather than one behaviour thoroughly.
- A story that cannot be finished without also finishing a different user-facing
  capability that has no story of its own.


---
## Test Case 2: Acceptance criteria are testable as written

Input: the three finalized upstream documents.

Expected Output Criteria:
- Every acceptance criterion states an observable condition that two engineers
  could independently grade pass or fail on the same implementation without asking
  a clarifying question.
- Where a criterion concerns speed, size, volume, or accuracy, it gives the value
  and the conditions it is measured under, not an adjective.
- Where a criterion concerns what the user sees, it states the actual content or
  behaviour, not that feedback is "clear" or "appropriate".

Failure Criteria (must NOT occur):
- Criteria resting on unmeasured adjectives - performant, responsive, intuitive,
  user-friendly, robust, properly, correctly, appropriate, seamless.
- Criteria that restate the story title as its own acceptance ("the manager can
  view the dashboard").
- Criteria whose pass or fail depends on the grader's taste rather than on the
  implementation.


---
## Test Case 3: Dependencies between stories are explicit

Input: the three finalized upstream documents.

Expected Output Criteria:
- Where a story cannot be implemented until another story's output exists, it names
  that story as a dependency.
- The dependencies named are real consumption relationships - one story needs data,
  an interface, or a component that another produces - not generic sequencing.
- Where an epic must precede another for the same reason, that ordering is stated.

Failure Criteria (must NOT occur):
- A story that plainly consumes another story's output with no dependency stated -
  displaying data that another story is responsible for capturing, or authorising
  access that another story is responsible for establishing.
- Dependencies asserted so broadly that they carry no information ("depends on
  project setup", "depends on the backend").
- A dependency section that exists but is empty or says "none" across the whole set
  of stories.


---
## Test Case 4: No two stories deliver the same work

Input: the three finalized upstream documents.

Duplication is a property of a PAIR, and a grader reading thirty stories is poor at
pairwise comparison. This criterion therefore converts it into a property of each
story that can be checked by inspection.

Expected Output Criteria:
- No two stories have the same primary deliverable - the same endpoint, screen,
  component, or rule implemented twice under different titles.
- Where two stories necessarily touch the same component, the document states which
  one builds it and which one extends or consumes it, so a developer knows where
  the work belongs.
- Where a capability appears in more than one epic, the document says which epic
  owns the implementation.

Failure Criteria (must NOT occur):
- Two stories that would cause the same code to be written, differing only in
  whose point of view describes it.
- A capability described in one epic and again in another with no statement of
  which one owns it.
- The same acceptance criterion appearing under two different stories.


---
## Test Case 5: Coverage of the upstream scope is demonstrable, not asserted

Input: the three finalized upstream documents.

The exercise's problem: coverage cannot be tested without manually checking every
feature. The resolution is to require the artifact to make itself checkable - a
mapping a grader can verify by inspection rather than by recall.

Expected Output Criteria:
- The output includes a traceability mapping from the upstream documents to the
  stories: each named requirement, capability, or flow in the PRD, Architecture, and
  UX specification appears against at least one story that covers it.
- Every story in the breakdown traces back to something in the upstream documents;
  a story with no upstream source is identified as an addition and justified.
- Capabilities the upstream documents place out of scope have no stories, and the
  mapping shows they were considered and excluded rather than overlooked.

Failure Criteria (must NOT occur):
- Coverage claimed in prose ("these epics cover the full scope") with nothing a
  reader can check.
- A named upstream requirement with no story anywhere in the breakdown.
- Stories generated for capabilities the upstream documents explicitly excluded.

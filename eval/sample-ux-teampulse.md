# UX Specification: TeamPulse — Team Health Check System

## 1. User Roles and Design Context

### 1.1 Engineer (Survey Respondent)
**Context**: Engineer receives a survey notification during their work week and needs to respond quickly—typically on mobile or desktop. They prioritize speed and clarity over aesthetics. No sign-in expected.

**Key constraints affecting design**:
- No account or authentication required; survey access is link-based and anonymous.
- Form completion must take ≤3 minutes for the 95th percentile of users.
- Must work on mobile (primary device assumption based on survey timing).
- No JavaScript dependency; graceful HTML fallback required.
- No identity tracking—form captures only responses, not who submitted them.

### 1.2 Manager (Survey Administrator and Dashboard Viewer)
**Context**: Manager logs in via company SSO, configures surveys for their team(s), and checks results daily or weekly. They are technically fluent and want actionable insights from trend data without seeing individual responses.

**Key constraints affecting design**:
- Dashboard must load in ≤2 seconds (p95) with 12 survey cycles and 7 questions visible.
- Can only see data for teams they manage; cross-team data is invisible even if they manage multiple teams.
- Must not see individual responses or be able to identify respondents under any circumstance.
- Configuration is infrequent but must be repeatable and error-resistant.

### 1.3 System Administrator
**Context**: Admin manages system-level infrastructure, team-to-manager mappings, and compliance audits. They have database access but cannot see individual responses by design.

**Note**: Admin workflows (team assignment, audit logging) are not detailed here as they are operational, not user-facing UX.

---

## 2. Engineer Workflow: Receiving and Responding to Survey

### 2.1 Notification Delivery

**Email Notification**
```
From: noreply@teamPulse.[company domain]
Subject: [Manager Name] requested your team health input - 2 min survey

Body (HTML and plain-text):

Hi [Engineer First Name],

[Manager Name] is gathering team feedback to understand how we're doing.
Your response is completely anonymous.

>>> RESPOND NOW (valid until [Day], [Date] at 5 PM) <<<

Takes about 2 minutes. Your individual response won't be shared—only aggregated trends are shown to your manager.

[Unique survey link with 14-day expiry]

Questions:
- How is workload? (1-5 scale)
- Team collaboration? (1-5 scale)
[etc., preview only]

Not able to respond today? Reply to this email for a reminder.
```

**Slack Notification** (if configured)
```
[Manager Name] is running a 2-min team pulse survey

Your response is anonymous. Respond by [Day], [Date] at 5 PM.

[Unique survey link]
```

**Design rationale for notifications**:
- Email subject includes manager name to build trust and context.
- "2 min" sets expectation; this operationalizes the 3-minute requirement.
- Link is unique per engineer and single-use (see Section 2.2).
- Expiration date and time are in manager's timezone (to match scheduler context).
- Plain text version ensures readability on all email clients and accessibility compliance.

### 2.2 Survey Form — Structure and Layout

**Form Page Skeleton** (mobile-first)
```
[Header]
  Company logo (optional, small)
  "Quick Team Health Check"
  "Your response is anonymous. Takes ~2 minutes."

[Form]
  [Question 1]
  [Question 2]
  [Question 3]
  [Question 4]
  [Question 5-7 as configured]

  [Required-field indicator: asterisk]
  [Error messages inline, red text, above affected field]
  
  [Submit Button: "Submit my response"]
  [Optional: "Close" or back button]

[Footer]
  Minimal: "Powered by TeamPulse" (no tracking pixels)
```

**Form Width and Spacing**
- Mobile: Full width (≤480px with 16px margins), single-column.
- Tablet/Desktop: Max 600px centered; single column maintained to minimize scrolling.
- Line height: 1.6em for readability; question text and radio/option labels on separate lines to avoid cognitive overload.

### 2.3 Question Types and Response Components

**Likert Scale (1–5)**

*Rendered as horizontal radio buttons on desktop; stacked radios on mobile.*

```
Question: "How would you describe the team's communication this week?"

○ Strongly Disagree    ○ Disagree    ○ Neutral    ○ Agree    ○ Strongly Agree
(Desktop view)

(Mobile view)
○ Strongly Disagree
○ Disagree
○ Neutral
○ Agree
○ Strongly Agree
```

**Behavior**:
- Default state: No option selected.
- Focus state: Ring outline on focused radio button (≥3px, color contrast ≥4.5:1).
- Selection: Filled radio circle, label text bold or slightly darker.
- Keyboard navigation: Tab to field; arrow keys cycle through options; Space or Enter to select.
- No "N/A" or "Prefer not to say" options in V1 (all questions required).

**Multiple Choice (Single Select)**

*Rendered as vertical radio buttons or toggle buttons.*

```
Question: "Which best describes your biggest blocker this week?"

○ Unclear requirements
○ Resource constraints
○ Technical blockers
○ Interpersonal issues
○ No blockers this week
```

**Behavior**: Same as Likert (required, keyboard accessible, focus rings).

### 2.4 Form Validation and Error Handling

**Real-Time Field Validation**
- **No validation on blur** (to avoid modal frustration during form fill).
- **Validation only on submit**: When engineer clicks "Submit," form checks all required fields.

**Error State Display**
```
[Top of form]
[Error banner, red background, icon + text]:
"Please answer all questions before submitting. Missing answers: Questions 2, 5"

[Question 2 field, red border]
"Question 2 is required"
[Scroll to first error automatically or highlight visually]
```

**Rationale**: Delays error feedback until submission to avoid interruption during form fill (supports <3 minute completion goal). Single error banner + field highlights reduce cognitive load.

### 2.5 Form Submission and Confirmation

**Submit Flow**

1. Engineer clicks "Submit my response" button.
2. Form performs client-side validation (all required fields filled).
3. On invalid: Show error banner and scroll to first error (no server trip).
4. On valid: Button shows loading state ("Submitting…") and is disabled to prevent double-submit.
5. Form POSTs to `/api/v1/surveys/{survey_id}/respond` with:
   - `survey_link_token` (encrypted, unique per engineer)
   - `responses` object (question ID → selected option/value)
   - No email, name, or user ID included.
6. Server validates token, checks expiry and single-use constraint, stores anonymized response, invalidates token.
7. On success (2-3 second latency typical): Redirect to confirmation page.
8. On error (network, server 5xx): Show "Network error" message and allow retry (re-submit button).

**Confirmation Page**
```
[Checkmark icon or "Thank you" visual]

"Thanks for your feedback!

Your response is anonymous and helps us understand team health.

[Auto-close in 5 seconds or close button]
[Optional: "Close" button]
[Back to home link, low-contrast gray]"
```

**Rationale**: Confirmation confirms submission succeeded and reinforces anonymity. Auto-close + manual button accommodates both impatient and cautious users.

### 2.6 Error Recovery

**Expired or Already-Used Link**
```
[Error page]
"Survey link expired or already used.

Your response may have already been submitted. If you need to submit a new response,
ask your manager for a fresh link.

[Contact manager or support link]"
```

**Network Error During Submission**
```
[On form page, error message above Submit button]
"Network error. Your response was not saved. Please check your connection and try again.

[Retry button]"
```

**Behavior on retry**: If prior submission succeeded and token was invalidated, server responds with "already submitted" instead of accepting duplicate.

### 2.7 Accessibility and Performance

**WCAG 2.1 Level AA Compliance**
- Semantic HTML: `<form>`, `<fieldset>`, `<legend>`, `<label for="…">`, `<input type="radio">`.
- Color contrast: Text ≥4.5:1, focus rings ≥3:1 contrasted against background.
- Keyboard navigation: Tab order follows visual order; arrow keys navigate radio groups; Enter/Space activates.
- Screen reader: Legend announces question text; labels announce option text; error messages associated with fields via `aria-describedby`.
- No JavaScript required: Form submits via standard HTML POST; browser handles validation via `required` attribute and server-side validation confirms.
- Mobile viewport: `<meta name="viewport" content="width=device-width, initial-scale=1">` ensures proper scaling.

**Performance Targets** (to operationalize ≤3 min completion)
- Form page load: ≤1 second (p95) on 4G mobile (iPhone 12).
  - Asset sizes: HTML ≤50 KB, CSS ≤20 KB (inlined), no render-blocking JS.
- Form submission: ≤2 seconds (p95) from click to confirmation redirect.
  - Server response time: ≤1 second (database insert + token invalidation).
- Form rendering to interactive: ≤500ms (browser parse and paint of form fields).

**Measured on**: iPhone 12 or equivalent, 4G LTE, Chrome/Safari.

---

## 3. Manager Workflow: Configuration

### 3.1 Authentication and Session

**Entry Point**
- Manager navigates to `https://teampulse.[company domain]/manager/login`.
- SSO redirect: Entra ID login page (company credentials).
- On successful login: Redirect to `/manager/dashboard`.
- Session token: Valid for 8 hours; refresh token valid for 30 days.
- Logout on idle: 30 minutes of inactivity. Session expires silently; next action redirects to login.

### 3.2 Initial Setup: Team and Survey Configuration

**Configuration Page Layout** (`/manager/settings`)

```
[Header]
  TeamPulse
  [Manager name] (account dropdown)
  [Help / Logout]

[Sidebar]
  Dashboard
  Settings (current)
    Team membership
    Survey questions
    Schedule and frequency
    Notifications
  
[Main Content]

[Tabs or vertical steps]
1. TEAM SETUP
2. SURVEY QUESTIONS
3. SCHEDULE & NOTIFICATIONS
4. REVIEW & ACTIVATE
```

**1. Team Membership**

```
[Section: Team Membership]
"Select or create team"
[Dropdown of existing teams or "+ Create new team"]

"Add team members"
[Tab: Entra ID import | Manual upload | Manual entry]

[Entra ID import tab]
  [Dropdown: Select Entra ID group]
  [Button: "Fetch members"]
  [Preview: List of emails to be imported]
  [Button: "Import"]

[Manual upload tab]
  [File input: "Upload CSV (email addresses)"]
  [Example: team@example.com]

[Manual entry tab]
  [Text input: Email address]
  [Button: "+ Add"]
  [List of current members with remove button]

[Display]
  "Team members (5)"
  - Alice@company.com [remove]
  - Bob@company.com [remove]
  - Charlie@company.com [remove]
  [Button: "+ Add manually"]

[Next button: "Continue to questions"]
```

**Behavior**:
- Duplicate email prevention: If email already in team, show warning "Alice@company.com is already in team."
- Entra ID import: Shows which group was imported and allows swapping groups or re-syncing.
- Manual entry: Validates email format; shows error "Invalid email format" on blank or malformed input.
- Removal: Confirmation dialog "Remove Charlie@company.com from team?" to prevent accidental deletion.

---

**2. Survey Questions**

```
[Section: Survey Questions]
"Define 5–7 questions for this survey"

[Question 1]
  Type: [Dropdown: "Likert scale" | "Multiple choice"]
  Question text: [Text input, ≤150 chars]
  
  [If Likert]
    Label 1: [Input] (default: "Strongly Disagree")
    …
    Label 5: [Input] (default: "Strongly Agree")
  
  [If Multiple choice]
    Option 1: [Input]
    Option 2: [Input]
    [Button: "+ Add option" up to 6 options]
    [Remove button per option]

  [Remove question button]
  [Drag handle to reorder]

[Question 2] [same structure]
…
[Question 5–7]

[Button: "+ Add question"] (disabled if already 7)

[Validation messages]
- "Question text is required"
- "At least 2 options required for multiple choice"
- "Question text cannot be duplicate"

[Next button: "Continue to schedule"]
```

**Behavior**:
- Reordering: Drag handle on left of each question to reorder (or up/down arrows).
- Type switching: Changing type from Likert to Multiple choice clears label fields.
- Save state: Unsaved changes indicator; auto-save draft on change or prompt on navigation away.

---

**3. Schedule and Notifications**

```
[Section: Schedule & Notifications]

"Frequency"
[Radio button] Weekly
[Radio button] Bi-weekly

"Day and time"
[Dropdown: Day of week] (e.g., Monday)
[Dropdown: Hour] (e.g., 9 AM)
[Timezone display: "Your timezone: America/New_York"]
[Timezone link: "Change timezone"]

"Notification channels"
[Checkbox] Email (enabled by default)
[Checkbox] Slack
  [If Slack checked, Dropdown: Select channel or "DM to respondents"]

"Deadline for response"
[Display: "Respondents have until [day/date] at 5 PM to respond"]
  (Calculated as survey_launch + 5 days, manager's timezone)

[Save button: "Review and activate"]
```

**Behavior**:
- Timezone: Inferred from SSO profile or manually set; affects when survey launches and how deadline is displayed.
- Slack channel selection: Shows list of channels manager has access to; DM option sends link to each respondent's Slack DM.
- Deadline: Auto-calculated; manager can see the exact date/time before saving.

---

**4. Review and Activate**

```
[Section: Review and activate]

"Summary"
Team: Sales Engineering (5 members)
Questions: 6 Likert-scale questions
Frequency: Weekly, starting Monday at 9:00 AM ET
Deadline: 5 days from launch
Notifications: Email + Slack

[Warning, if applicable]
"Team roster includes 1 member with an invalid email address.
They will not receive notifications. [Fix]"

[Button: "Save and activate"]
[Button: "Edit" (returns to earlier step)]
```

**On "Save and activate"**:
- System creates recurring survey schedule.
- First survey launches at next scheduled day/time.
- Manager is redirected to dashboard with success message: "Survey activated for Sales Engineering. First survey launches Monday at 9:00 AM ET."

---

### 3.3 Editing Surveys and Roster Changes

**Ongoing Edits**
- Manager can edit team roster, survey questions, frequency, and schedule at any time via `/manager/settings`.
- **Current survey behavior**:
  - If engineer is removed from roster mid-cycle: Still notified and can respond; response is counted.
  - If survey questions are changed between cycles: Old responses preserved under old question text; new cycle starts fresh with new questions.
  - If frequency/schedule changes: Takes effect on next scheduled cycle; no backfill.
- **Confirmation**: "Changes will take effect on your next scheduled survey ([day/date])."

---

## 4. Manager Workflow: Dashboard

### 4.1 Dashboard Layout and Real-Time Data

**Entry Point**: `/manager/dashboard` (post-authentication).

**Header and Controls**
```
[Header]
  TeamPulse Dashboard
  [Manager name] | [Help] | [Settings] | [Logout]

[Filters and controls]
  Team: [Dropdown, default to first team] (if manager has multiple)
  Time range: [Dropdown: "Past 3 weeks" | "Past 3 months" | "Past 6 months" | "Custom"]
    [Date picker if custom selected]
  Sort questions by: [Dropdown: "Question order" | "Current score (high to low)" | "Largest change"]
  [Refresh button: "Refresh now" with last-updated timestamp]
  [Auto-refresh checkbox: "Auto-refresh every 5 min" (enabled by default)]

[Response rate banner]
  "4 of 5 team members responded (80%) in this cycle"
  Respondent count updates in real-time as responses come in.
```

### 4.2 Trend Chart Visualization

**Chart Container per Question**

```
[Question title, with current Likert mean or multiple-choice result]

"Q1: How would you rate team collaboration?"

[Trend chart]
  Vertical: Y-axis (1–5 scale, fixed range)
  Horizontal: X-axis (survey cycle dates)
  Line chart: Mean score per cycle with error bars (±1 std dev)
  Legend: 
    - Current: 4.2 (±0.6)
    - Last cycle: 4.1
    - Change: +0.1 (+2.4% vs. 3 cycles ago)
  Data points: 12 cycles (past 3 months for weekly)

[Aggregation rules applied]
- If <3 responses in cycle: "Not enough responses (1 received, min 3 required)"
  [Chart area is blank; trend line point is missing]
- If ≥3 responses: Point drawn; error bar shown.
- Multiple choice: Stacked bar chart by option, % or count (manager configurable in settings).

[Hover/interaction]
  - Hover over data point: Tooltip shows "Cycle of [date]: 4.2 (4 responses)"
  - Mobile: Tap for tooltip (no hover).
```

**Design rationale for performance**:
- Chart library: Canvas-based (Recharts, Chart.js, or similar) renders 12 cycles × 7 questions in ≤500ms.
- Pre-aggregated data: Server returns already-calculated means and std devs; browser only renders.
- No N+1 queries: Single database query fetches all cycles, all questions, all aggregates.

### 4.3 Dashboard State Persistence

**URL Query Parameters**
```
/manager/dashboard?team_id=1&time_range=3m&sort=score&custom_start=2026-06-12&custom_end=2026-08-12
```

- **Team filter**: Persists across refresh; defaults to first team if not set.
- **Time range**: Persists; defaults to "Past 3 months" on first load.
- **Sort order**: Persists.
- **Zoom/scroll state**: Page remembers scroll position via browser (no explicit storage needed).

**Session persistence**: On logout or session expiry, URL query is cleared. New login starts with defaults.

### 4.4 Minimum Response Threshold and Data Suppression

**Rule**: If fewer than 3 responses for a survey cycle:
```
[Chart area, light gray background]
"Not enough responses to display results (1 response received, minimum 3 required)"

[Comparison row below is also suppressed]
"Not enough data to compare"
```

**Rationale**: Prevents inference of individual responses in small teams (e.g., if 2-person team and only 1 responds, the response is identifiable). Threshold of 3 is conservative; future policy may adjust based on team size.

### 4.5 Multiple-Choice Aggregation

**Stacked Bar Chart** (if survey includes multiple-choice question)

```
Q2: "What's your biggest priority this quarter?"

[Stacked horizontal bar chart]
Feature development  ████████ 60% (3 respondents)
Performance           ███ 20% (1 respondent)
Operations support    ██ 20% (1 respondent)

Total responses: 5

Legend:
  This cycle: Feature dev 60% vs. last cycle 55% (+5%)
  Trend: Increasing interest in feature development
```

**Behavior**:
- Manager selects in settings: Display as "% of respondents" or "Count of responses".
- Zero-option handling: If no respondent selects an option, it appears as 0% or is hidden (manager preference in settings).

### 4.6 Accessing Historical Data

**Time Range Options**
- Past 3 weeks: Last 3 survey cycles (weekly) or last 2 cycles (bi-weekly).
- Past 3 months: Last 12 weekly cycles or last 6 bi-weekly cycles.
- Past 6 months: Last 26 weekly cycles or last 13 bi-weekly cycles.
- Custom: Date range picker, up to 12 cycles displayed (earlier cycles truncated).

**Modified Questions and Historical Data**
- If manager edits a question's text between cycles:
  - Old cycles display the old question text in the trend line.
  - New cycle starts a new trend line with new question text.
  - Both appear on the dashboard, labeled clearly (e.g., "Q1 v1" and "Q1 v2").
- If manager deletes a question:
  - Historical trend for that question remains visible and labeled as "Archived: Q1".
  - New cycles do not include the question.

---

## 5. Technical Specifications Affecting UX

### 5.1 Performance and Load Time

**Dashboard Initial Load**
- Target: ≤2 seconds (p95) on modern laptop, 4G+ internet, Chrome/Firefox.
- Achieved via:
  - Asset compression and minification.
  - Chart library optimized for canvas rendering (≤500ms to paint 12 cycles × 7 questions).
  - Database query indexed on `(team_id, survey_id, submitted_at_hour)` returns aggregates in ≤500ms.
  - CSS inlined, JS deferred or code-split.

**Survey Form Load**
- Target: ≤1 second on iPhone 12, 4G LTE.
- Achieved via:
  - HTML ≤50 KB, CSS inlined ≤20 KB.
  - No render-blocking JS; form renders without client-side compilation.
  - Fallback: Server-side rendering of form if JS unavailable.

**Form Submit Latency**
- Target: ≤2 seconds from click to confirmation.
- Achieved via:
  - Server validation and database write: ≤1 second.
  - Network round-trip: ~0.5–1 second (4G LTE).
  - Client-side redirect: ≤0.5 second.

### 5.2 Anonymity Guarantees Enforced via UX

**Survey Link Generation**
- Survey link contains a random, salted token: `/survey/respond?token=<UUID_v4_salt>`.
- Token does NOT encode: engineer email, user ID, or any PII.
- Token is single-use: Once submitted, link is invalidated.
- Token expiry: 14 days from survey launch; auto-expires.
- Engineer identity is never transmitted in the URL or form submission.

**Form Submission**
- POST to `/api/v1/surveys/{survey_id}/respond` includes:
  - `token`: Unique survey link token.
  - `responses`: Map of question ID to selected value.
  - NO email, user ID, name, IP address, or correlation field.
- Server validates token, strips it, stores response as:
  - `(survey_id, anonymized_response_id, team_id, q1_value, …, q7_value, submitted_at_hour, browser_class)`
  - `anonymized_response_id`: Random UUID v4, no mapping to engineer.
  - `submitted_at_hour`: Salted to hour precision (not minute/second) to prevent timing-based correlation.
  - Database schema: NO foreign key from `responses` to `users` table.

**Manager Dashboard**
- Aggregation query: Sums and averages over anonymized responses grouped by survey_id and team_id.
- No individual response visible or retrievable via API.
- No correlation column or join available in queries.

---

### 5.3 Error Handling and Resilience

**Survey Notification Failures**
- Email fails to send: Retry up to 3 times over 24 hours (exponential backoff).
- After 3 retries: Manager receives alert: "Failed to notify 2 team members about survey launch. Check email addresses or resend manually."
- Slack channel unavailable: Fall back to email if configured; else alert manager.
- Survey remains open even if notifications fail (manager can manually share link or resend).

**Form Submission Failures**
- Network timeout: Show error "Network error. Your response was not saved. Please try again."
  - Retry button is available; re-submission is idempotent (prevented by token invalidation).
- Server 5xx: Show error "Server error. Please try again in a few minutes or contact support."
- Double-submit prevention: Submit button disabled during POST; duplicate token submission is rejected server-side.

**Dashboard Loading Failures**
- Slow network: Show skeleton loaders for charts while data fetches (≤2s target).
- Server error (5xx): Show message "Unable to load results. Please refresh the page or contact support."
- Partial data (some survey cycles fetched, others timeout): Show partial dashboard with message "Some data unavailable; refreshing…"

---

## 6. Accessibility Standards (WCAG 2.1 Level AA)

### 6.1 Survey Form Accessibility

**Semantic HTML**
```html
<form>
  <fieldset>
    <legend>Question 1: How would you rate team collaboration?</legend>
    <label><input type="radio" name="q1" value="1"> Strongly Disagree</label>
    <label><input type="radio" name="q1" value="2"> Disagree</label>
    …
  </fieldset>
  <fieldset>
    <legend>Question 2: …</legend>
    …
  </fieldset>
</form>
```

**Color and Contrast**
- Text on background: ≥4.5:1 contrast ratio.
- Focus indicators: ≥3:1 contrast; minimum 3px ring or underline.
- Error text: Red (#D32F2F or equiv.) with icon + text (not color alone).

**Keyboard Navigation**
- Tab order: Top to bottom, left to right; follows visual layout.
- Within radio group: Tab focuses group; arrow keys cycle; Space/Enter selects.
- Submit button: Accessible via Tab and Enter/Space.
- Escape key: Closes any modal or returns to prior page (optional; not required).

**Screen Reader Support**
- Form label: `<label for="q1_option1">Strongly Disagree</label>` associates with input.
- Error: `<input aria-describedby="q1_error">` + `<div id="q1_error" role="alert">Question 1 is required</div>`.
- Fieldset legend announces question context.
- Submit button: "Submit my response" is descriptive.

**Mobile Accessibility**
- Touch target size: ≥44×44 px for radio buttons and buttons (WCAG 2.5.5).
- Zoom: Page allows 200% zoom without loss of functionality.
- Viewport: No horizontal scroll required for content.

### 6.2 Dashboard Accessibility

**Semantic HTML**
- Headings: `<h1>` for page title, `<h2>` for question titles.
- Charts: SVG with `<title>` and `<desc>` elements; table alternative for data.
- Tables: `<th scope="col">` for headers; `<caption>` for table titles.
- Buttons: `<button>` elements (not `<div role="button">`); descriptive text.

**Chart Accessibility**
- Alt text / description: "Trend chart for Q1: Team collaboration. Y-axis 1–5, X-axis 12 survey cycles. Current mean 4.2, trend +0.1 vs. last cycle."
- Keyboard accessible: Tab to chart; arrow keys navigate data points; Space announces value and date.
- Data table alternative: Below or linked from chart for users who cannot perceive visual trends.

**Focus Management**
- On page load: Focus moves to main content (not header).
- On filter/sort change: Focus returns to results or chart (not top of page).
- On error: Focus moves to error message.

**Color and Contrast**
- Chart line colors: Distinct and colorblind-accessible palette (avoid red-green alone).
- Error message: Icon + text + color; text conveys error without color alone.
- Link text: Underlined or sufficiently contrasted to stand out from body text.

---

## 7. Responsive Design Breakpoints

### 7.1 Survey Form (Mobile-First)

**Mobile (≤480px)**
- Single-column layout.
- Question text: 16px minimum; labels 14px.
- Radio buttons: Stacked vertically; 44px touch targets.
- Button: Full width, 48px height.
- No horizontal scroll.

**Tablet (481px–1024px)**
- Single-column layout (no change from mobile).
- Increased padding and margins for legibility.
- Button: 600px max-width centered.

**Desktop (≥1025px)**
- Single-column layout maintained; no change from tablet.
- Max-width 600px, centered.
- Likert scale: Horizontal radio buttons (if space permits) or stacked.

**Rationale**: Single-column design simplifies form completion and reduces cognitive load across devices. Horizontal Likert options are a nice-to-have on desktop; vertical is the fallback and is fully functional.

### 7.2 Dashboard (Desktop-First)

**Desktop (≥1200px)**
- Sidebar for filters (fixed or sticky).
- Charts: 2 columns (7 questions = 4 rows).
- Chart height: 300px; width responsive.

**Tablet (768px–1199px)**
- Filters in collapsible header or sticky top bar.
- Charts: 1 column; full width.
- Reduced padding.

**Mobile (≤767px)**
- Filters in modal or collapse-expand section.
- Charts: Full width, 250px height (smaller to fit viewport).
- Trend labels and legend: Reduced font size or moved below chart.
- Scroll horizontally through chart data if necessary (but avoid if possible).

---

## 8. Error States and Edge Cases

### 8.1 Engineer Scenarios

| Scenario | UX Response |
|----------|-------------|
| User clicks survey link twice | Second click: "Survey already submitted by this link" |
| User clicks link after 14-day expiry | "Survey link expired. Ask your manager for a new link." |
| User starts survey, closes browser | Reopening form shows blank form (no client-side save). User must fill again. |
| User submits with blank required field | Inline error: "Question X is required. Please answer before submitting." |
| Network timeout during submit | "Network error. Your response was not saved. Please try again." Retry button available. |
| Very slow form load (>3s on 3G) | Skeleton loader shows after 1s; "Loading form…" message. |

### 8.2 Manager Scenarios

| Scenario | UX Response |
|----------|-------------|
| Manager removes team member mid-cycle | Notification still sent; response counted for current cycle. On next cycle, removed member not notified. |
| Manager changes roster before next survey | Only new roster receives notifications for next cycle; old responses remain. |
| Manager modifies questions between cycles | Old trend data preserved with old question text; new cycle shows new question as separate trend line. |
| Manager disables survey (no longer needed) | Notifications stop; dashboard remains accessible with historical data. |
| Manager re-activates after pause | No backfill surveys; resumes on next scheduled date. |
| Manager views very small team (2 people, 1 response) | Chart suppressed: "Not enough responses (1 received, min 3 required)". No data inference possible. |

### 8.3 Notification Delivery Scenarios

| Scenario | UX Response |
|----------|-------------|
| Email bounce on first attempt | System retries 2 more times over 24 hours. If all fail, manager alert: "Failed to notify 1 team member. Check email address." |
| Slack channel deleted | Notification fails; manager alert: "Slack channel 'team-feedback' not found. Update notification settings." |
| Engineer email invalid | Notification fails for that engineer; manager alert: "Failed to notify John Doe (john@invalid). Check email address." |
| Slack rate-limited | Exponential backoff (1s, 2s, 4s); retry up to 3 times. If final fail: manager alert. |

---

## 9. Configuration and Constraints

### 9.1 Survey Frequency and Timing

**Weekly Surveys**
- Frequency: Every 7 days on a specified day at specified time (e.g., Monday 9 AM).
- Deadline: Auto-calculated as 5 days from launch (default; not configurable in V1).
- Timezone: Manager's timezone (from SSO profile, can be overridden).

**Bi-Weekly Surveys**
- Frequency: Every 14 days on a specified day at specified time.
- Deadline: Same as weekly (5 days from launch).

**Schedule Changes**
- If manager changes frequency: Takes effect on next scheduled cycle; no backfill.
- Example: If weekly survey is scheduled for Monday 9 AM and manager changes to bi-weekly on Wednesday, next survey launches on Monday 9 AM two weeks from the last survey.

### 9.2 Question Configuration Constraints

**Likert Scale Questions**
- 5 options: Manager can customize labels (default: "Strongly Disagree" → "Strongly Agree").
- Required: All questions must be answered; no "N/A" or "Prefer not to say" option in V1.
- Minimum: 5 questions per survey.
- Maximum: 7 questions per survey.

**Multiple-Choice Questions**
- 2–6 options per question.
- Single select only (not checkboxes).
- Required: No "Other" or "Prefer not to say" in V1.

**Text Questions**
- Not supported in V1. (Recommendation: Add in V1.5.)

**Duplicate Prevention**
- Manager cannot create two questions with identical text.
- Error: "Question text cannot be duplicate."

### 9.3 Team Size and Minimum Response Threshold

**Minimum group size for result display**: 3 responses per survey cycle.
- If fewer, results suppressed: "Not enough responses (X received, min 3 required)".
- Prevents inference in small teams.

**Very small teams** (2 people):
- Survey still launches and is sent to both.
- If only 1 responds: Results suppressed.
- If both respond: Results shown (mean of 2 values).

**Very large teams** (100+ people):
- No scaling issues (dashboard load time not affected).
- Notification delivery: Async queue, sent over several minutes if needed.

---

## 10. Out of Scope (Not Reflected in UX)

The following are explicitly not part of the V1 UX:
- **ML sentiment analysis** on text responses (text questions excluded).
- **Cross-team comparison** dashboards.
- **HR system exports** (Workday, BambooHR integration).
- **Native mobile apps** (responsive web only).
- **Custom analytics** or SQL query builder.
- **Survey branching** or conditional questions.
- **Multi-language support**.
- **Manager-to-engineer feedback loops** or direct communication.
- **Organization-wide surveys** (single-team only).
- **Free-form text questions** or comment sections.
- **Result export** (CSV, PDF) — manager can screenshot or print.
- **Anonymous comment channel** separate from structured survey.

These features may be considered in future versions, but the UX specification is scoped to core V1 functionality.

---

## 11. Visual Design Principles (Framework-Agnostic)

### 11.1 Survey Form Design

**Clarity over decoration**: Plain, readable form with minimal visual noise.
- Typography: Sans-serif, 16px body text on mobile.
- Question grouping: Each question in a fieldset with clear visual separation.
- Spacing: 16px vertical gap between questions.
- Color: Neutral background (white or near-white); text dark gray (#333 or #1a1a1a).
- Accent: Button in primary brand color (e.g., blue #1976D2); error text in red (#D32F2F).

**Mobile-first scaling**: Form adapts responsively without layout shifts or reflows.
- No sticky headers or footers that reduce visible form area.
- Button always in view or sticky at bottom on mobile (optional enhancement).

### 11.2 Dashboard Design

**Readability of charts**: High contrast, clear axes and legends.
- Chart colors: Colorblind-accessible palette (no red-green alone).
- Grid lines: Light gray, subtle (not dominant).
- Data points: Distinct markers (circle, square) with error bars for Likert scales.
- Tooltip: On hover/tap, shows exact value and date.

**Scannability of metrics**: Response rate and key trends prominent.
- Header banner: Response rate and current status (e.g., "4 of 5 responded").
- Question title: Includes current mean or top multiple-choice option.
- Comparison row: Change from prior cycle and 3-cycle trend visible at a glance.

**Visual hierarchy**: Filters and controls easily discoverable.
- Sticky header: Filters always visible when scrolling.
- Buttons and dropdowns: Clearly clickable with visual feedback (hover, active, focus states).

---

## 12. Inclusive Design Notes

**For Engineers from Non-Technical Backgrounds**
- Survey form avoids jargon; questions are written in plain language.
- Example bad: "What is your technical debt burden?" → Example good: "How do you feel about the quality of our codebase?"
- Instructions are brief and direct ("Takes about 2 minutes.").

**For Managers New to TeamPulse**
- Configuration workflow is step-by-step with clear next/back buttons.
- Summary page before activation prevents mistakes.
- Help text and examples provided for custom Likert labels and question text.

**For Managers on Multiple Teams**
- Team filter is prominent; dashboard title shows current team.
- No accidental cross-team data visibility (filter enforced server-side).

**For Managers in Remote Teams**
- Timezone selection is visible and editable in settings.
- Deadlines and survey launch times are shown in manager's timezone; manager understands impact on distributed team.
- Recommendation: Add note "Engineers in different timezones will see these times translated to their local time" (if engineer-facing deadline display is added in future versions).

---

## 13. Success Metrics for UX Validation (Post-Launch)

These metrics validate that the UX satisfies the PRD requirements:

| Metric | Target | Measured Via |
|--------|--------|--------------|
| Survey form completion rate | ≥80% of engineers who receive link complete survey | Analytics: responses / notifications sent |
| Form abandonment rate | ≤10% start survey but don't submit | Analytics: form opens / submissions |
| Avg. form completion time | ≤3 minutes (95th percentile) | Client-side timing: form load → submit |
| Dashboard page load time (p95) | ≤2 seconds | APM (e.g., Datadog, New Relic) |
| Chart render time (p95) | ≤500ms | Browser performance API |
| Notification delivery rate | ≥95% delivered within 1 hour of launch | Delivery logs |
| Manager time to configure survey | ≤10 minutes | User testing or analytics |
| No data breaches or anonymity leaks | 0 | Security audit, quarterly code review |
| Accessibility compliance | WCAG 2.1 Level AA | Automated tools + manual testing |
| Mobile responsiveness | Form usable on iPhone 12, iPad, desktop | Device testing |

---

## 14. Known Limitations and Future Considerations

1. **Very small teams** (2–3 people): Results are suppressed for privacy, limiting manager insight into team health for small groups. Future solution: Option to suppress only if team size <X or manual override with manager acknowledgment.

2. **Question changes**: Trend discontinuity when questions change between cycles. Future solution: Migration path or version tagging for multi-year trend analysis.

3. **Text responses**: Not supported in V1. Future solution: Add text questions with aggregation (themes, keywords, or brief summary by manager).

4. **Result sharing**: No built-in export or Slack integration for sharing results. Future solution: CSV export, Slack result posting, email digest.

5. **Multi-language support**: All UI and surveys in English. Future solution: Localization framework for surveys and dashboard in other languages.

6. **Feedback loop**: No mechanism for manager to send targeted response or actions to team. Future solution: Post-survey manager comments or action items linked to results.

7. **Scheduling across timezones**: All engineers see survey deadline in manager's timezone. Future solution: Display deadline in each engineer's local time (requires coarse geolocation consent).

---

**End of UX Specification**

# TeamPulse Product Requirements Document

## 1. Product Overview

TeamPulse is a lightweight anonymous team health check system that enables engineering managers to conduct recurring pulse surveys of their teams and track aggregate health trends over time. Engineers respond to 5-7 survey questions on a weekly or bi-weekly cadence; results are aggregated and visualized in a manager-only dashboard. All responses remain anonymous—managers see team-level patterns and distributions, never individual attributions.

**Users:**
- Engineers (respondents): answer surveys anonymously
- Managers: configure surveys, manage team membership, view team-level trends
- System Admin (implicit): manage system settings (not detailed in V1)

---

## 2. Functional Requirements

### 2.1 Engineer / Respondent Experience

**Survey Notification & Access**
- Engineers receive a survey notification via email or Slack (manager selects channel)
- Notification contains:
  - A clickable/tappable link to the survey form
  - Survey title or round number (e.g., "Health Check: Week of 2026-08-12")
  - Human-readable deadline (e.g., "Due by Friday, 5pm in your local timezone")
  - No indication of which team or manager created the survey
- A single engineer may receive surveys from multiple managers if on multiple teams; each survey link is distinct
- Notification is sent at the same day/time each cycle (schedule controlled by manager; timezone TBD—see Open Questions)

**Survey Form**
- Accessible via unique URL; no login required if link is opened within company network or with session cookie
- Works on mobile browsers (iOS Safari, Android Chrome) at 320px viewport width minimum
- Completable in ≤3 minutes (mean completion time tracked for monitoring; alert if median >3m)
- Displays 5-7 survey questions in sequence
- No progress indicator or step counter (to avoid perception of length)
- Question types and formats (e.g., Likert scale, multiple-choice, free text) defined per survey (see Data Model below)
- Submit button is distinct and clearly labeled
- Upon submission: success confirmation displayed inline; respondent may close form or return to prior page
- No redirect to external site or manager dashboard

**Response Submission & Anonymity**
- Response is POSTed to backend immediately upon form submission
- Engineer receives no tracking cookie or identifier that persists after form close
- No email confirmation or response ID sent to respondent
- Response cannot be edited after submission
- Respondent IP address is not captured or stored in response record

### 2.2 Manager Experience

**Dashboard Overview**
- Managers log in via SSO (Entra ID / OIDC) and see their assigned teams and surveys
- Dashboard shows a list of surveys created by this manager, sorted by most recent first
- For each survey, display:
  - Survey title
  - Team name
  - Frequency (weekly or bi-weekly)
  - Current survey cycle / round (e.g., "Round 3, due Friday")
  - Total response count this round (e.g., "12 of 15 responses")
  - Response rate as percentage (e.g., "80%")
  - Last updated timestamp

**Trend Dashboard for a Single Survey**
- Clicking a survey opens its trend view
- Display a separate trend line for each of the 5-7 questions
- X-axis: time, labeled by survey round (e.g., "Round 1", "Round 2", etc.) or date (e.g., "Aug 12", "Aug 19")
- Y-axis: depends on question type:
  - For Likert-scale questions (1-5): mean response value (e.g., 3.2) ± confidence interval or std deviation
  - For binary yes/no questions: percentage answering "yes"
  - For multiple-choice: percentage selecting each option (multi-series line chart or separate charts)
- Each data point represents aggregate response for one survey round, only if response count ≥1
- Hovering over a point displays: round number, count of responses, exact aggregate metric (mean, %, etc.)
- Legend identifies each question by its text (e.g., "Do you feel supported by your manager?")
- Comparison band or reference line (optional visual):
  - If manager specifies a prior round for comparison, shade or highlight the difference between that round and current round
  - Difference calculated as: current metric − prior metric

**Survey Configuration Interface**
- Manager can create a new survey by specifying:
  - Survey title (text, ≤100 characters)
  - Team(s) to survey (multi-select from teams manager owns)
  - Frequency: weekly or bi-weekly (radio button)
  - Start date: date survey is first sent (date picker)
  - Question set: 5-7 questions, manager selects from:
    - Predefined templates (if available in V1) or custom questions
    - For each question: question text, question type (Likert 1-5, Yes/No, Multiple choice, Free text), and options (if MC)
  - Notification channel: email or Slack (radio button)
  - Time of day to send notification (time picker; timezone TBD)
  - Optional: stop date (survey no longer sent after this date)
- Manager can edit survey configuration (questions, frequency, time, channel) **before the next survey cycle starts** (TBD—see Open Questions re: mid-cycle edits)
- Manager can pause or cancel a survey at any time; no responses are deleted

**Team Management**
- Manager views a list of teams they own
- For each team:
  - Team name
  - Current member count
  - Button to manage membership
- Manager can:
  - Add a user to a team (lookup by email or name; must be in SSO directory)
  - Remove a user from a team
  - No bulk operations in V1

---

## 3. Data Model & Storage

### 3.1 Core Entities

**Survey Definition** (one record per survey configuration)
- `survey_id` (UUID)
- `manager_id` (SSO user ID)
- `team_id` (UUID)
- `title` (text, ≤100 characters)
- `frequency` (enum: "weekly" or "bi-weekly")
- `notification_channel` (enum: "email" or "slack")
- `notification_time` (time of day, e.g., "09:00"; timezone TBD)
- `start_date` (date survey first sent)
- `stop_date` (nullable; date survey stops being sent)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Questions for this survey stored in separate table (see below)

**Question Definition** (one record per question in a survey)
- `question_id` (UUID)
- `survey_id` (foreign key)
- `question_text` (text, ≤500 characters)
- `question_type` (enum: "likert_5", "yes_no", "multiple_choice", "free_text")
- `display_order` (integer; order in which question appears on form)
- `options` (JSON; only populated for "multiple_choice", e.g., `["Option A", "Option B", "Option C"]`)
- `created_at` (timestamp)

**Survey Cycle / Round** (one record per instance a survey is sent)
- `cycle_id` (UUID)
- `survey_id` (foreign key)
- `cycle_number` (integer; e.g., 1, 2, 3—incremented each time survey is sent)
- `sent_date` (date; when notifications were sent)
- `due_date` (date; deadline for responses)
- `created_at` (timestamp)

**Response** (one record per submitted response)
- `response_id` (UUID; no correlation to engineer identity)
- `cycle_id` (foreign key; which survey round this belongs to)
- `question_id` (foreign key; which question this answers)
- `response_value` (JSON; format depends on question type):
  - Likert: integer 1–5
  - Yes/No: boolean
  - Multiple choice: string (one option selected)
  - Free text: string (≤2000 characters; captured but not surfaced in V1 dashboards)
- `submitted_at` (timestamp)
- `response_order` (integer; for grouping related responses from same form submission)
- **NO** fields for respondent email, IP address, session ID, or any personal identifier
- **NO** timestamps linkable to an individual (e.g., if submitted_at is too granular and combined with other metadata, could deanonymize)

**Team** (one record per team)
- `team_id` (UUID)
- `manager_id` (SSO user ID; only this manager can view/edit)
- `team_name` (text, ≤100 characters)
- `created_at` (timestamp)

**Team Membership** (junction table)
- `team_id` (foreign key)
- `user_id` (SSO user ID)
- `added_at` (timestamp)

### 3.2 Data Persistence & Retention

- All response data is stored in PostgreSQL
- Response records persist indefinitely until explicitly deleted by a manager (bulk-delete not in V1)
- Survey definitions and team membership persist until deleted by manager
- Session/temporary data (e.g., form draft state) is NOT persisted; closing the browser forfeits any unsaved responses
- Data is NOT synced to external systems in V1 (HR, Slack analytics, etc.)
- Backups: PostgreSQL backup policy follows standard company practice (TBD; scope of this PRD assumes backup is handled separately)

---

## 4. Non-Functional Requirements

### 4.1 Performance & Scalability

- **Survey form load time**: ≤2 seconds (DOMContentLoaded) on 4G LTE connection
- **Survey form submission time**: ≤1 second (response POST to server acknowledgment)
- **Dashboard load time**: ≤3 seconds (initial page load with trend data for one survey)
- **Trend line queries**: response times ≤500ms for surveys with ≤5 years of history and ≤1000 responses per round
- **Anticipated scale (V1)**: system is expected to support ≤50 managers, ≤100 teams, ≤10,000 engineers in first 6 months; optimize for this range

### 4.2 Availability & Reliability

- **Uptime target**: 99.5% availability (allows ~36 minutes unplanned downtime per month)
- **Graceful degradation**: if backend is unavailable, survey form displays an error message (see Notifications section) and does not submit; user can retry after 30 seconds
- **Planned maintenance**: surveys sent on maintenance windows are rescheduled for the next available time (notification not lost; TBD—see Open Questions)

### 4.3 Anonymity & Security

- **Response anonymity guarantee**: no response record contains, and no dashboard view displays, any field that identifies the respondent by name, email, ID, or IP address
- **Audit**: a tamper-proof log records all manager dashboard access (who, when, what survey viewed) for later audit
- **Data encryption**: responses in transit (survey form → backend, backend → dashboard) must use TLS 1.2 or higher
- **RBAC**: managers can only view/edit surveys and teams they own; no cross-team access via URL manipulation or API
- **SSO enforcement**: only users authenticated via Entra ID / OIDC can access manager dashboard

### 4.4 Accessibility

- **WCAG 2.1 Level AA** for survey form and manager dashboard
- Survey form must be keyboard-navigable and screen-reader compatible
- Dashboard charts must have text alternatives (e.g., downloadable CSV summary)

### 4.5 Browser & Device Support

- **Survey form**: mobile browsers (iOS Safari 14+, Android Chrome 90+), desktop (Chrome, Firefox, Safari, Edge latest 2 versions)
- **Manager dashboard**: desktop browsers (Chrome, Firefox, Safari, Edge latest 2 versions); mobile dashboard is out of scope for V1
- **Responsive design**: survey form adapts to viewport 320–1920px; manager dashboard adapts to 1024–1920px

### 4.6 Data Quality & Logging

- All API requests to survey submission endpoint are logged with: timestamp, endpoint, HTTP status, response time (but NOT request body or user identifier)
- Survey completion time is calculated and logged (form opened → submitted; used for monitoring mean/median completion time)
- Invalid responses (e.g., out-of-range Likert values) are rejected server-side with a 400 error; no partial saves

---

## 5. User-Facing Notifications & Signals

### 5.1 Email Notification

**Sent to**: respondent email address (from SSO directory)  
**Trigger**: on survey start date, then on schedule (weekly or bi-weekly per manager config)  
**Content**:
- Subject line: `[TeamPulse] Health Check - Week of {date}` (or `Bi-week of {date}`)
- Body:
  - Brief intro: "Your manager is asking for your feedback. Please take ~3 minutes to complete this survey."
  - Button or link: "Complete Survey"
  - Deadline: "Respond by {due_date} at 11:59pm {timezone}" (timezone TBD)
  - Footer: "Your responses are anonymous."
- Plain text and HTML alternatives provided

**Delivery**:
- Sent via company email provider (SMTP, SendGrid, etc.; TBD)
- If email fails to send (bounce, block), manager sees a warning on dashboard: "Failed to send round X to {count} recipients; email addresses: [list]" (or generic: "Failed to send to some recipients")
- Delivery is not retried; failed email is noted once and archived

**Example**: *Email sent at 2026-08-12 09:00 UTC, due 2026-08-16 23:59 local time.*

### 5.2 Slack Notification

**Sent to**: Slack workspace (requires Slack app integration; see Open Questions)  
**Trigger**: same as email (on schedule)  
**Content**:
- Channel: manager selects a target channel or DM recipients individually (TBD)
- Message: "Hey team! {Manager Name} is asking for feedback via TeamPulse. [Survey Link] Due by {due_date}."
- Emoji or formatting to distinguish from other Slack messages
- Message is NOT threaded; each survey is a top-level message

**Delivery**:
- Sent via Slack bot using Slack API (OAuth token stored securely)
- If Slack delivery fails (bot removed, channel deleted, rate-limited), manager sees error on dashboard or receives an email fallback alert (TBD)
- No retry; failure is logged

### 5.3 Dashboard & Survey Status Signals

**Survey list view**:
- Green checkmark: survey is active and next cycle is scheduled
- Yellow warning icon: survey has not received responses for 2+ consecutive rounds; tooltip: "No responses in last 2 rounds"
- Gray icon: survey is paused or stopped
- Red error icon: last send attempt failed (e.g., email delivery failed); tooltip shows date of failure

**Trend dashboard**:
- "Loading..." spinner while fetching data
- If data refresh fails, an inline error banner: "Unable to load trend data. Please refresh the page or contact support."
- If a round has 0 responses (no one answered), the trend line has a gap or is omitted from display; a note appears: "No responses for Round 3"

**Form submission**:
- Success message (inline, above submit button): "Thank you! Your response has been recorded." (green background, present for 3 seconds then fade out)
- Error message (if submission fails): "We couldn't save your response. Please check your connection and try again." (red background, persistent until dismissed or retry succeeds)

---

## 6. Dashboard & Visualization Specification

### 6.1 Trend Chart Details

**Type**: Multi-series line chart (one line per question)  
**Display context**: full-width container, height ≥400px  
**Data source**: PostgreSQL queries aggregating responses per cycle

**Axes**:
- **X-axis (time)**:
  - Labels: survey cycle (e.g., "Round 1", "Round 2") or date (e.g., "Aug 12, 2026")
  - Tick marks: one per cycle; evenly spaced
- **Y-axis (metric)**:
  - Scale: depends on question type
    - Likert 1–5 questions: 1.0 to 5.0
    - Yes/No (% yes): 0% to 100%
    - Multiple-choice (% selecting each option): 0% to 100%
  - Gridlines: light gray, every 0.5 units (Likert) or 10% (percentage)
  - Zero-line (if applicable): darker/bolder than other gridlines

**Data representation**:
- **Series color**: each question assigned a distinct color from a 7-color palette (support up to 7 questions)
- **Data point**: circular marker at each cycle; diameter ≥6px
- **Line style**: solid line connecting points; line width ≥2px
- **Missing data**: if a cycle has 0 responses, that cycle is omitted from the line (no interpolation or placeholder)

**Interactivity**:
- Hover over data point: tooltip displays:
  - Cycle number or date
  - Count of responses
  - Exact metric value (e.g., "3.2" for Likert mean, "75%" for Yes%)
  - Standard deviation or confidence interval (optional for V1; if included, display as ±range, e.g., "3.2 ± 0.5")
- Click on legend item (question name): toggle visibility of that line (visual feedback: line becomes transparent or grayed out)
- Zoom/pan: out of scope for V1

**Legend**:
- Positioned below or to the right of chart (auto-layout depends on viewport)
- Lists each question by its full text
- Colored dots matching series colors
- Clickable to toggle visibility

### 6.2 Comparison Mode (Optional)

- Manager can select a prior round from a dropdown: "Compare to Round X"
- On selection:
  - Dashboard shows two sets of trend lines: current (solid) and prior round (dashed)
  - Or: a shaded band (±range) between the two rounds, highlighting change
  - Summary stat displayed: "Average change: +0.3 points (Likert), +5% (Yes/No)"
- Comparison is cleared if manager selects a new survey or clicks "Clear Comparison"

### 6.3 Report Export (Out of Scope for V1)

- Generate a CSV or PDF summary of trend data is **NOT** in V1; listed in Out of Scope

### 6.4 Data Persistence in Dashboard

- Trend data persists on the client (browser) until the page is closed or refreshed
- No auto-refresh of dashboard (manager must manually refresh to see new responses); refresh frequency is not specified in V1
- If a new response arrives after dashboard is open, manager is not notified; data is stale until refresh

---

## 7. Authentication & Authorization

### 7.1 Manager Authentication

- **Method**: Entra ID / OIDC via company SSO
- **Scope**: managers authenticate once per session; session expires after 30 minutes of inactivity (TBD—see Open Questions)
- **Endpoint**: `/auth/login` redirects to Entra ID, then returns to dashboard with session cookie
- **User identification**: SSO user ID (email or ID claim from OIDC) is stored in session

### 7.2 Access Control

- **Manager role**: assigned via SSO group membership or stored in application DB (TBD)
- **Implicit roles**: 
  - `manager`: can create surveys, manage teams, view own surveys' dashboards
  - `engineer`: (no special permissions in TeamPulse; simply receives survey links)
- **No cross-team access**: manager can only view/edit teams and surveys they own
  - API enforces: `GET /surveys/{survey_id}` returns 403 Forbidden if manager_id ≠ logged-in user
  - URL manipulation (e.g., changing survey_id in URL) is blocked by backend authorization checks

### 7.3 Engineer (Respondent) Access

- **Survey link access**: link is a unique token (UUID-based) that grants one-time or multi-use access to the survey form
  - Multi-use: engineer can open the link multiple times within the survey cycle; only the last submission counts (or submissions are merged; TBD—see Open Questions)
  - No login required; link is sufficient proof of access
- **Session handling**: no persistent session for engineers; closing the browser clears any state
- **Rate-limiting**: if the same survey link is submitted >3 times in 5 minutes from the same IP, subsequent submissions are rejected (anti-abuse; TBD confirmation)

---

## 8. Out of Scope / Not in V1

The following capabilities are **not** included in V1 and should not be implemented:

1. **ML-based sentiment analysis or keyword extraction**: free-text responses are captured in the database but not automatically analyzed, summarized, or scored. Manager sees raw text, if displayed at all.

2. **Cross-team comparisons or benchmarking**: managers cannot see aggregate metrics for other teams, even their own. Each survey dashboard shows only that team's data.

3. **Integration with HR systems (e.g., Workday, SuccessFactors)**: no automatic sync of team membership, terminations, or other HR events. Team membership is manually managed in TeamPulse.

4. **Native mobile apps (iOS/Android)**: survey form and dashboard are web-based only. Mobile access is via responsive web browser.

5. **Survey branching or conditional logic**: questions are always displayed in the same order; no "skip this question if you answered X to the previous question" functionality.

6. **Automated alerts or threshold notifications**: manager does not receive automated email/Slack alerts if a metric drops below a threshold (e.g., "engagement dropped to <3.0"). Alerts would require manual setup.

7. **Custom report generation or export (CSV, PDF)**: manager cannot export trend data to file. Dashboard is the only view.

8. **Bulk team operations**: no bulk import of team members via CSV, no bulk-add/remove in manager dashboard. Membership is added one user at a time.

9. **Survey templates or question library**: managers write questions from scratch or select from a very small set of default templates (if provided). Community question sharing is not supported.

10. **Scheduled delivery at specific times by timezone**: survey notifications are sent at a single global time (e.g., 09:00 UTC); timezone-aware scheduling is out of scope.

11. **Response history per engineer** (view all surveys a person has responded to): only managers can see aggregate team data. No "user profile" showing which surveys you've answered.

12. **Admin dashboard or system-wide analytics**: no super-admin view of all surveys across all managers. TeamPulse is manager-scoped only.

---

## 9. Open Questions

The following questions remain unsettled and should be resolved before development begins:

1. **Free-text response handling**: free-text questions are captured, but how are they displayed to managers? In the dashboard, should managers see:
   - A list of all free-text responses (anonymously)?
   - Only a sampling?
   - A summary word cloud or tag cloud?
   - Or are they excluded from V1 dashboard entirely (captured but not shown)?

2. **Mid-cycle survey edits**: can a manager edit a survey's questions after it has been sent to a team but before the cycle closes? If so, do new responses apply only to the new question or to both old and new versions?

3. **Response overrides / multiple submissions**: if an engineer opens the same survey link twice and submits different answers, does the system:
   - Keep only the latest submission (overwrite)?
   - Keep both and aggregate them (double-count)?
   - Reject the second submission and show an error?

4. **Response rate visibility**: should the manager be able to see which specific people have NOT responded (by name/email), or only the aggregate count?
   - Current spec says "anonymous," so likely only aggregate count, but this should be explicit.

5. **Timezone handling for notifications and deadlines**: when a manager sets "send at 09:00", in which timezone is this interpreted?
   - UTC?
   - Manager's timezone?
   - Recipient's timezone (engineers see different send times)?
   - A single fixed timezone for all (company headquarters)?

6. **Session expiration & re-authentication**: after inactivity, does the manager session timeout? If so, what is the timeout duration (30 minutes, 1 hour, 8 hours)?

7. **Slack integration setup**: does the Slack notification feature require:
   - A TeamPulse Slack app to be installed in the workspace (OAuth)?
   - A webhook URL configured by the company admin?
   - Manual setup per manager?

8. **Planned maintenance & survey delivery**: if a survey is scheduled to send during a maintenance window, should it be:
   - Rescheduled to the next available time (and notified)?
   - Skipped (cycle is missed)?
   - Sent before or after the window (assuming brief maintenance)?

9. **Data retention policy**: how long should response data be stored in PostgreSQL?
   - Indefinitely (until manager deletes)?
   - Automatic purge after 1 year, 3 years, etc.?
   - Configurable per manager?

10. **Admin/support access to anonymous responses**: in an incident, can a system admin or support engineer access response data for debugging? If so, should they be able to correlate responses with individual engineers, or should responses remain fully anonymous even to admins?

11. **Question types in V1**: the spec mentions Likert, Yes/No, Multiple-choice, and Free-text. Are all four required in V1, or should some be deferred (e.g., free-text out of scope)?

12. **Performance limits**: are there hard limits on the number of questions per survey, teams per manager, or members per team? Should these be configurable or fixed?

---

## 10. Acceptance Criteria & Definition of Done

### 10.1 Feature Acceptance Criteria

**Survey Form**:
- ✓ Form displays 5–7 questions from the survey definition
- ✓ Form is responsive and usable on mobile (320px) and desktop (1920px)
- ✓ Form submission completes in ≤1 second and displays success message
- ✓ Responses are stored in PostgreSQL with no identifying information
- ✓ Engineer cannot view or edit submitted response

**Manager Dashboard**:
- ✓ Manager logs in via Entra ID and sees their teams and surveys
- ✓ Clicking a survey displays a trend chart with one line per question
- ✓ Trend chart X-axis shows survey cycles (or dates); Y-axis shows aggregate metric
- ✓ Hovering over a data point displays cycle, count, and metric value
- ✓ Manager can see response count and response rate for each survey round
- ✓ Manager cannot access surveys or teams they do not own (403 Forbidden)

**Survey Configuration**:
- ✓ Manager can create a survey, specify questions, frequency, notification channel, and team
- ✓ Manager can edit survey questions and settings before the first send
- ✓ Manager can pause, resume, or delete a survey
- ✓ Manager can add/remove team members

**Notifications**:
- ✓ Email notifications are sent on schedule with survey link and deadline
- ✓ Slack notifications are sent (if configured) with survey link and deadline
- ✓ Failed notifications are logged and surfaced to manager (warning in dashboard)

**Anonymity & Security**:
- ✓ No response record stores respondent email, name, IP, or identifier
- ✓ No dashboard view reveals individual respondent identities
- ✓ All data in transit uses TLS 1.2+
- ✓ Manager RBAC prevents cross-team access

### 10.2 Non-Functional Acceptance Criteria

- ✓ Survey form loads in ≤2 seconds on 4G LTE
- ✓ Dashboard loads in ≤3 seconds
- ✓ Form completion time is logged and median time is ≤3 minutes (monitored via logging/metrics)
- ✓ System handles ≤10,000 engineers, ≤100 teams, ≤50 managers
- ✓ Survey form and dashboard meet WCAG 2.1 Level AA accessibility
- ✓ Uptime is ≥99.5% (monitored via health checks)

### 10.3 Code & Quality Standards

- ✓ React frontend code uses functional components and hooks (no class components unless justified)
- ✓ Node.js backend follows REST API conventions; requests return appropriate HTTP status codes
- ✓ All API endpoints that modify data (POST, PUT, DELETE) require manager authentication
- ✓ Invalid input (e.g., out-of-range Likert values) is rejected with 400 Bad Request
- ✓ Unit tests cover ≥80% of backend API logic (CRUD, aggregation, auth)
- ✓ Integration tests cover survey submission, dashboard retrieval, and manager RBAC
- ✓ No console errors or warnings in production builds
- ✓ Secrets (DB passwords, OAuth tokens) are stored in environment variables or secure vault, not hardcoded

### 10.4 Documentation

- ✓ API endpoints documented with request/response schemas (Swagger/OpenAPI or equivalent)
- ✓ Database schema documented with ER diagram and field descriptions
- ✓ Deployment guide covers environment setup, database migrations, and startup
- ✓ Manager user guide covers survey creation, team management, and dashboard navigation

---

## 11. Technical Architecture Notes

**Frontend**: React (version TBD); responsive CSS (flexbox/grid); no external charting library chosen yet (Chart.js, Recharts, or D3.js candidates)

**Backend**: Node.js (Express or similar framework); REST API with JSON request/response

**Database**: PostgreSQL; migrations managed via standard tool (e.g., Flyway, Knex, or native scripts)

**Authentication**: Entra ID / OIDC integration; session management via secure HTTP-only cookies

**Deployment**: Docker containers (assumed); CI/CD pipeline via GitHub Actions (assumed)

**Monitoring**: application logs via stdout/structured JSON; metrics via Prometheus or similar (TBD)

**Email**: SMTP or third-party service (SendGrid, AWS SES); TBD

**Slack**: Slack API (bot token or webhook); requires workspace admin to install app; TBD

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-12  
**Status**: Ready for Development Planning

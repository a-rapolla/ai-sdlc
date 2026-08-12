# TeamPulse - Team Health Check System

## 1. Overview

TeamPulse is a lightweight, anonymous team health check system that enables engineering managers to run recurring pulse surveys with their teams, track sentiment and engagement trends over time, and identify team-wide patterns without seeing individual attributions.

## 2. Goals

- Provide engineering managers with a simple mechanism to gauge team health and engagement weekly or bi-weekly
- Maintain complete anonymity of individual responses at all system layers (including admin access)
- Display team-level trends and patterns in an accessible dashboard format
- Minimize survey completion burden: <3 minutes per survey, mobile-first experience

## 3. User Roles and Permissions

### Manager
- Creates and manages team(s)
- Configures survey questions, frequency, and team membership
- Views team-level aggregated results in a dashboard
- Cannot see individual responses, identifying information, or which specific engineers responded
- Cannot view results from teams they don't manage

### Engineer/Team Member
- Receives survey notifications (email or Slack)
- Completes anonymous survey via mobile-accessible form
- Has no access to survey results or dashboard
- Can participate in multiple teams' surveys

### System Administrator
- Manages Auth0 integration and user provisioning
- Cannot bypass anonymity guarantees to view individual responses
- Can audit system logs (which contain no individual response content)
- Can disable or reconfigure survey instances

## 4. Feature Requirements

### 4.1 Survey Configuration

**Manager Capabilities:**
- Create new surveys tied to a specific team (team must have ≥3 members)
- Define survey questions (5-7 questions per survey; set is configurable)
- Set survey frequency: weekly or bi-weekly
- Manage team membership (add/remove engineers by email)
- Edit survey questions and frequency only for *future* survey cycles; edits do not retroactively affect historical data
- Pause or stop surveys
- View survey response rate as a percentage and count (e.g., "8 of 10 responses received")

**Data Captured:**
- Survey ID (UUID)
- Team ID (UUID, foreign key)
- Manager ID (Auth0 sub)
- Question set (array of question text, question type, required flag)
- Frequency (enum: `weekly`, `bi-weekly`)
- Creation timestamp (UTC)
- Last modified timestamp (UTC)
- Status (enum: `active`, `paused`, `stopped`)
- Current cycle start date and end date (UTC)

**Storage:** MongoDB collection `surveys` with indexing on `team_id` and `manager_id` for query performance.

### 4.2 Survey Questions and Response Types

**Supported Question Types:**
- **Likert Scale (1-5):** Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree; mapped to integer values 1–5 for trend analysis
- **Multiple Choice:** 2–4 predefined options; manager defines option text
- **Free-Text:** up to 500 characters; optional unless manager marks as required

**Validation Rules:**
- Survey must contain minimum 5 and maximum 7 questions
- Question text: non-empty, ≤300 characters
- Multiple Choice: minimum 2 options, maximum 4 options
- Free-text: max 500 characters enforced on client and server

**Open Questions:**
- Should free-text responses be reviewable by managers in V1, or deferred to V2?
- What word/phrase filtering (if any) should be applied to free-text responses for safety?

### 4.3 Survey Distribution and Notifications

**Notification Channels:**
- Email (primary)
- Slack (secondary, if team has Slack workspace integration enabled)

**Notification Dispatch:**
- When a survey cycle begins, the system sends one notification per team member
- Notification includes: unique, single-use survey link (token-based), survey deadline (date and time in manager's configured time zone), number of questions, expected completion time ("< 3 minutes")
- Notification does NOT include team name, manager name, or any identifying information that associates the survey with a specific manager or team

**Retry and Failure Handling:**

| Scenario | Behavior |
|----------|----------|
| Email bounces or rejected by MTA | Retry up to 3 times over 24 hours; if all fail, mark notification as `delivery_failed` |
| Slack API returns failure (user not found, expired token, workspace inactive) | Log failure, fall back to email immediately; if email also fails, mark as `delivery_failed` |
| Engineer does not respond within 2 days | Send one reminder notification (via same channels, identical content, no identifying information) |
| No more than 2 reminder notifications per survey cycle | After 2nd reminder, no further attempts |
| Delivery status display in dashboard | Manager sees "undelivered" count but NOT which engineers failed to receive notifications |

**Data Captured:**
- Notification ID (UUID)
- Survey ID (foreign key)
- Unique survey token (UUID, cryptographically secure, ≥256 bits entropy)
- Channel (enum: `email`, `slack`)
- Sent timestamp (UTC)
- Delivery status (enum: `sent`, `delivery_failed`, `opened`, `clicked`)
- Token expiration time (survey cycle end date + 1 day)

**Storage:** MongoDB collection `notifications` with TTL index set to auto-delete 90 days after survey cycle end date (prevents fingerprinting of participation over time).

**Critical Constraint:** No engineer ID, email address, or other identifying information is stored in the notifications collection. The survey token is the only link between an engineer and their notification; this token is deleted after response submission.

### 4.4 Survey Response Capture

**Response Form:**
- Mobile-responsive HTML form rendered via HTMX
- All communication over HTTPS (TLS 1.2+)
- CSRF protection via HTMX token validation or manual token exchange
- No persistent cookies or local storage; form submission is atomic
- One question per screen OR all questions on one scrollable page (UX decision: open question)
- Progress indicator showing current question / total questions
- Submit button disabled until all required questions answered; visual feedback provided

**Form Validation (Client + Server):**
- All Likert Scale questions: required (user cannot submit without selecting a value)
- All Multiple Choice questions: required
- Free-text questions: optional unless marked required by manager; character limit enforced on both client and server
- Invalid or malformed submissions rejected with user-friendly error message; no response record created

**Response Data Captured:**
- Response ID (UUID)
- Survey ID (foreign key)
- Question ID (from survey question set)
- Answer value (integer 1–5 for Likert, string for multiple choice/free-text)
- Response timestamp (UTC)
- Anonymized geographic data: IP geolocation country code only (no city, subnet, or device fingerprint)
- Response completion time in seconds (UX metrics only; not linked to engineer)

**Critical Anonymity Enforcement:**
- NO engineer ID, email address, Auth0 sub, IP address, or other identifying information is stored with response data
- Survey token is deleted immediately after response submission and stored separately in `notifications` collection
- No logs, audit trails, or temporary files contain identifying information correlated with responses
- Admin users cannot retrieve or reconstruct a link between a response and an engineer, even with direct database access
- Application logic prevents any query that attempts to correlate responses with engineer identities

**Storage:** MongoDB collection `responses` with:
- Indexes on `survey_id` and `question_id` for aggregation queries
- TTL index set to auto-delete 24 months after survey cycle end date (legal/audit retention period)
- No indexes on engineer or user fields

**Open Questions:**
- Should response data be accessible via an API endpoint to managers, or only via the dashboard?
- What is the retention policy for free-text responses vs. quantitative responses?

### 4.5 Manager Dashboard

#### 4.5.1 Survey Overview
- List all surveys managed by the current user
- For each survey: name, team name, frequency, total team members, current cycle response count (e.g., "8/10"), response rate percentage, status, last survey cycle date
- Click-through to view trend data for a specific survey

#### 4.5.2 Trend Dashboard (Per Survey)
**Data Visualization:**
- X-axis: survey cycle (displayed as cycle start date)
- Y-axis: aggregated response value

**For Likert Scale questions:**
- Display mean score (1–5) with 95% confidence interval
- Render as line chart with confidence band

**For Multiple Choice questions:**
- Display count and percentage of responses per option
- Render as bar chart or stacked bar chart showing option distribution over time

**For Free-Text questions:**
- Display "Not visualized in V1" (see Out of Scope)

**Dashboard Interactivity:**
- Filter by date range (start date picker, end date picker)
- Comparison toggle: "Compare to prior cycle" (displays delta or side-by-side comparison; exact format: open question)
- Export button: CSV download (same data visible in dashboard)
- Refresh data: dashboard reloads latest aggregated data on each page load (no stale data)

**Data Source:** Responses from `responses` collection, filtered by `survey_id`.

**Minimum Group Size Protection (Privacy):**
- If team has <3 members: survey cannot be created; UI displays "Team must have ≥3 members to run a survey"
- If team drops below 3 members mid-cycle: dashboard displays results but annotates "Small group—results may not be representative"
- If survey cycle receives <3 responses: dashboard displays "Insufficient responses (n < 3)—results suppressed" instead of showing data points or trends
- This ensures single or two-person responses cannot be analyzed or reverse-engineered

**Dashboard Persistence:**
- Historical trend data persists for 24 months (same retention as response data)
- Trend data computed on-demand from `responses` collection on each page load (no separate materialized views)
- CSV exports generated on-demand and not stored on disk

#### 4.5.3 Team Management
- List team members assigned to this team
- Add members: by email address (resolved to Auth0 sub; system verifies email is a valid Auth0 user)
- Remove members: manager selects member and clicks "Remove"
- Update team name (≤100 characters) and description
- **Critical:** No member-level response data displayed; manager cannot see which members responded

**Data Captured:**
- Team ID (UUID)
- Manager ID (Auth0 sub)
- Team name (string, ≤100 characters)
- Team description (string, ≤500 characters)
- Team members (list of Auth0 subs; no email addresses stored)
- Created timestamp (UTC)
- Last modified timestamp (UTC)

**Storage:** MongoDB collection `teams` with indexing on `manager_id`.

**Open Questions:**
- Can a manager transfer team ownership to another manager?
- Can multiple managers manage the same team, or is it exclusive?

## 5. Non-Functional Requirements

### 5.1 Performance
- Survey form page load time: ≤1.5 seconds (p95) on 4G mobile network (LTE, ~10 Mbps)
- Dashboard page load time: ≤2 seconds (p95) on typical desktop connection (≥50 Mbps)
- Trend computation (4 survey cycles, ≤20 team members, 7 questions): ≤500 milliseconds (p95)
- Email notification delivery: all emails sent within 1 hour of survey cycle start
- Slack notification delivery: all messages sent within 5 minutes of survey cycle start

### 5.2 Reliability
- Uptime SLA: 99.5% for survey form and dashboard (excludes third-party dependencies: Auth0, email MTA, Slack API)
- All survey responses persisted atomically; no partial response records
- Notification retry logic ensures all reachable engineers receive ≥1 attempt within 24 hours

### 5.3 Security
- All client↔server communication: TLS 1.2 or higher
- Survey forms: CSRF protection via HTMX token or manual token validation
- Survey tokens: ≥256 bits cryptographic entropy, single-use, expires at survey cycle end
- Admin users: cannot retrieve individual responses or reconstruct engineer↔response mappings, even with direct database access
- Password reset/account recovery: must not expose information about registered users
- Response data: not logged, not transmitted to third parties except manager exports (non-identifiable)

### 5.4 Anonymity and Privacy Guarantees
- Individual engineer identities must never be stored with, logged with, or derivable from response data
- The system must not maintain any mapping between engineers and responses (not in logs, not in temporary files, not in database backups)
- The only link between engineer and response is the single-use survey token; this token is deleted after submission and stored separately in `notifications` collection
- Admin access to the database cannot reveal which engineer provided which response
- All response data treated as anonymous from capture onward; future data analysis, exports, or integrations must verify this guarantee

**Enforcement Mechanisms:**
- Application layer: no engineer ID written to response creation or storage
- Database layer: no foreign key or index linking responses to engineers in `responses` collection
- Audit layer: log all access to response data; flag and alert on queries attempting to correlate responses with engineers

### 5.5 Accessibility
- Survey form: WCAG 2.1 Level AA compliance
- Form labels associated with inputs via `<label for>` or ARIA attributes
- Likert Scale: selectable via keyboard (arrow keys, Tab, Enter)
- Color not the only distinguishing factor; use text labels, icons, or ARIA to indicate UI states
- Mobile viewport: minimum font size 16px, touch targets ≥48px (height and width)

### 5.6 Data Retention and Deletion
- Response data: retained 24 months from survey cycle end date; automatically deleted via TTL index
- Notification records: retained 90 days from survey cycle end date; automatically deleted via TTL index
- Manager dashboard access logs: retained 12 months
- System audit logs: retained 12 months
- Deletion is permanent and unrecoverable; no soft deletes or archive tables

### 5.7 Scalability Targets
- Support ≤1,000 concurrent survey form submissions
- Support dashboards with ≤100 team members and 24+ historical survey cycles
- Response aggregation queries remain <500ms even at maximum scale

## 6. Technical Environment and Integration Points

### 6.1 Frontend
- HTMX-based server-rendered HTML
- Mobile-responsive layout (viewport meta tag, flexbox/grid)
- No external JavaScript frameworks (React, Vue, etc.)
- Static assets cached with appropriate HTTP headers (if applicable)

### 6.2 Backend
- Python FastAPI
- Request validation via Pydantic models
- All database queries indexed; no full-table scans for user-facing operations

### 6.3 Database
- MongoDB as primary data store
- Collections: `surveys`, `responses`, `notifications`, `teams`
- TTL indexes configured for automatic cleanup
- Single instance (no sharding for V1)

### 6.4 Authentication and Authorization
- Auth0 (OAuth 2.0 / OIDC)
- Managers and engineers authenticate the same way; role determined by manager team assignment
- All authenticated users treated as potential engineers unless explicitly assigned as managers
- Session management approach: open question (HTTP-only cookies vs. JWT)

### 6.5 Notifications
- **Email:** SMTP integration (provider: open question; e.g., AWS SES, SendGrid, Mailgun)
- **Slack:** Slack Workspace app (OAuth, workspace-scoped token)
- **Queueing:** message broker (e.g., Redis, RabbitMQ, Celery) to decouple sending from API requests

### 6.6 Monitoring and Observability
- Log all API requests: timestamp, endpoint, response time, HTTP status
- Log all database write operations: timestamp, collection, operation type
- **Do NOT log:** response content, query parameters, individual identifiers, or any data that could identify engineers
- **Metrics:** notification delivery rate, form submission success rate, dashboard load time (p50, p95, p99)
- **Alerting:** trigger on notification delivery failures >5% per cycle, dashboard load p95 >2s, API error rate >1%

## 7. Data Flow Summary

### Survey Creation
1. Manager logs in via Auth0
2. Manager navigates to "Create Survey"
3. Manager defines 5–7 questions, frequency (weekly or bi-weekly), team members
4. System validates team has ≥3 members; rejects creation if not
5. System stores survey configuration in `surveys` collection
6. System schedules notification dispatch for cycle start

### Survey Cycle Execution
1. At cycle start time, system queries `surveys` collection for all active surveys with cycle start time = now
2. For each survey, system retrieves team members from `teams` collection
3. System generates unique survey token per engineer; stores in `notifications` collection (no engineer ID stored)
4. System enqueues notification tasks (email and Slack) to message broker
5. Notification worker processes queue asynchronously; sends via email and/or Slack
6. Engineers receive notification with survey link + token

### Survey Completion
1. Engineer clicks survey link (includes unique token in URL)
2. HTMX frontend fetches form from backend (token not persisted in form HTML; validated on submission)
3. Engineer answers all questions and submits
4. Backend validates token: confirms single-use, not yet consumed, not expired
5. Backend creates response record in `responses` collection (no engineer ID)
6. Backend invalidates and deletes token from `notifications` collection
7. Backend returns success message to engineer (no confirmation email or audit log with identifying info)

### Dashboard Viewing
1. Manager logs in via Auth0
2. Manager navigates to dashboard
3. Backend queries `surveys` collection for all surveys where `manager_id` = current user
4. For each survey, backend queries `responses` collection and aggregates by question + cycle
5. Backend applies minimum group size filter: suppress results if n < 3, display explanatory message
6. Backend renders trend data (mean/percentage, confidence intervals, etc.)
7. Manager can filter by date range, export to CSV

## 8. Open Questions

1. **Session Management:** HTTP-only cookies (simpler, requires CSRF) or JWT tokens (stateless, requires client-side storage)?

2. **Slack Integration Model:** Should Slack notifications be opt-in per team or per engineer? How should the system handle engineers in Slack but without Slack notification enabled?

3. **Survey UX Layout:** All questions on one scrollable page, or one question per screen? Trade-off: completion time, perceived progress, mobile UX.

4. **Comparison Models:** When manager clicks "Compare to prior cycle," show side-by-side comparison, delta visualization, or both?

5. **Time Zone Handling:** Use manager's local time zone (if configured), browser time zone, or UTC for survey cycle dates and deadlines?

6. **Free-Text in V1:** Should free-text responses be reviewable by managers in V1, or fully deferred to V2? If reviewable, what safeguards prevent identification through response content?

7. **Multi-Manager Teams:** Can multiple managers manage the same team? If yes, can they create conflicting surveys on the same team?

8. **Engineer Removal Mid-Cycle:** When an engineer is removed from a team mid-cycle, should their previous responses be retained, deleted, or marked "no longer team member"?

9. **Export Format:** Should manager CSV exports include individual row-level data (aggregated by question) or only summary statistics?

10. **Third-Party HR Integration:** Is employee provisioning via HR systems (Workday, BambooHR, ADP) required for V1, or is manual team management sufficient?

## 9. Out of Scope / Not in V1

1. **ML-based Sentiment Analysis:** The system does not use NLP or machine learning to classify or summarize free-text responses. Free-text is captured but not visualized or analyzed.

2. **Cross-Team Comparison:** Managers cannot compare their team's results against other teams or company-wide baselines. Each manager sees only their own team(s).

3. **HR System Integration:** No integration with HR systems (Workday, BambooHR, ADP, etc.) for employee provisioning or attrition tracking.

4. **Native Mobile Apps:** Web-based only; no separate iOS or Android apps.

5. **Custom Report Builder:** Managers cannot create custom reports or dashboards beyond the provided trend dashboard and export.

6. **Anonymous Comment or Discussion Forums:** No mechanism for managers and engineers to discuss survey results anonymously.

7. **Automated Action Recommendations:** No AI-driven suggestions for manager actions based on survey trends (e.g., "engagement declining—consider team offsite").

8. **Survey Branching / Conditional Logic:** Surveys cannot include branching logic where the next question depends on the previous answer.

9. **Calendar Integration:** The system does not automatically schedule surveys around team calendars, holidays, or sprints.

10. **Response Weighting or De-Duplication:** All responses treated equally (no weighting by tenure or role). Duplicate submissions not detected or deduplicated.

11. **Manager-to-Engineer Feedback Loop:** No mechanism for managers to send anonymized feedback or action plans back to engineers based on survey results.

12. **Sentiment Trending Over Individual Questions:** No cross-question correlation analysis or cohort segmentation (e.g., "engagement trends differ by team tenure").

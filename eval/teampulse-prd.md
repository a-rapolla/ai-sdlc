# TeamPulse - Team Health Check System

## Overview
TeamPulse is a lightweight, anonymous team health check system designed for engineering managers to gather recurring pulse survey data from their team members. The system anonymizes all individual responses while providing managers with aggregated trend dashboards to identify team patterns and health trajectories over time.

## 1. User Roles and Scope

### 1.1 Engineer (Survey Respondent)
- Receives recurring survey invitations via email or Slack
- Completes a 5-7 question survey form
- No account required to respond (link-based survey access)
- Cannot see aggregated results or other responses

### 1.2 Manager (Dashboard Viewer)
- Belongs to one or more teams
- Configures survey questions, frequency, and team membership
- Views aggregated results for their own team(s) only
- Cannot see individual responses or identify respondents
- Cannot see results from teams they do not manage

### 1.3 System Administrator
- Cannot view individual responses or identify respondents, even with direct database access
- Can manage team and manager assignments
- Can view system health/operational metrics
- Technological guarantee: database schema architecture makes individual attribution impossible even for admins

## 2. Core Workflow

### 2.1 Survey Scheduling and Distribution

**Frequency Options**
- Weekly surveys (sent on a configurable day and time, e.g., every Monday at 9:00 AM)
- Bi-weekly surveys (sent on a configurable day and time)
- Manager configures frequency per team

**Notification Delivery**
- Email notifications:
  - Subject line: "[Manager name] requested your team health input - 2 min survey"
  - Contains unique, anonymized survey link (14-day expiration or single-use upon completion)
  - Includes deadline for response (e.g., "respond by Friday 5 PM")
  - Plain text and HTML versions supported
  - From address: noreply@teamPulse.[company domain]
  
- Slack notifications (if configured):
  - Posted to a designated team channel or DM
  - Contains unique anonymized survey link
  - Includes deadline
  - Text: "[Manager name] is running a 2-min team pulse survey"

**Notification Delivery Guarantee**
- If email delivery fails (bounce, spam filter), the notification is retried up to 3 times over 24 hours
- If all email attempts fail, manager receives an alert: "Failed to notify X team members about survey launch"
- If Slack is unavailable, email is sent as fallback (if configured)
- Survey remains open even if notifications fail (manager can manually share the link or resend)

**Respondent Tracking (Anonymized)**
- Each survey response link is time-bound and single-use per survey cycle
- System records: (survey_id, response_timestamp_hour_precision, anonymized_response_id, team_id)
- Does NOT record: individual identifier, email, name, IP address, device fingerprint, or any correlation data
- Timestamps are salted to hour precision (not exact minute) to prevent timing correlation attacks
- After response submission, response link is invalidated

### 2.2 Survey Form

**Structure**
- 5-7 questions configured by the manager
- Question types: Likert scale (1-5), multiple choice (single select)
- Each question is required (manager cannot mark as optional in V1)
- Mobile-first responsive design (works on phones, tablets, laptops)
- Accessibility: WCAG 2.1 Level AA compliance (semantic HTML, color contrast ΓëÑ4.5:1, keyboard navigation)

**Form Specifications**
- Maximum completion time: 3 minutes for 95th percentile of users
  - Operationalized: Form must be completable end-to-end in Γëñ180 seconds on a representative mobile device (iPhone 12, 4G connection)
  - If user takes >5 minutes, a warning appears but submission is not blocked
- Must function without JavaScript (basic HTML form with server-side rendering fallback)
- Must not require account login or credentials
- Survey identifier is anonymized (not tied to respondent email or user ID)

**Data Captured During Survey**
- Responses to each question (Likert value, multiple-choice selection)
- Survey completion timestamp (hour precision only, not minutes/seconds)
- Browser type classification (mobile/tablet/desktop; used for analytics only, not stored per-response)
- Inferred timezone from IP geolocation (coarse, used for display and scheduling only, not correlated with response)

**Data Not Captured**
- Email address or user ID of respondent
- Full IP address (only coarse geolocation for timezone inference, then immediately discarded)
- Device identifiers, session IDs, or cookies that could correlate responses
- Keystroke timing or interaction patterns
- Detailed geolocation beyond timezone
- DNS or network metadata
- User agent string (only classification extracted)

### 2.3 Response Storage and Anonymization

**Anonymization Mechanism**
- Each survey response is assigned a random, one-time anonymized_response_id (UUID v4)
- Survey responses are stored in a table: (survey_id, anonymized_response_id, team_id, q1_response, q2_response, ..., q7_response, submitted_at_hour, browser_class)
- NO column for user_id, email, manager_id, or any identifier
- The notification link itself is salted and does not encode respondent identity
- Managers and admins cannot query or view any mapping from responses back to individuals

**Data Persistence**
- Responses persist indefinitely in the database (retention policy is an open question; see Open Questions)
- Responses are not deleted when a team member leaves (they are already anonymized)
- Responses are immutable once submitted (no update or delete by manager request)
- On database backup/restore or disaster recovery, responses remain anonymized

**Privacy Guarantee Enforcement**
- Database schema: No foreign key from responses table to users/engineers table
- Application layer: No code path allows a manager, admin, or API caller to retrieve individual responses or link responses to users
- Audit logging: All queries to responses table are logged; any access attempting correlation triggers an alert
- Ad-hoc security review: Quarterly audit of database schemas and application code to verify anonymity cannot be broken

## 3. Manager Dashboard

### 3.1 Dashboard Overview
- Accessible at `/manager/dashboard` after SSO authentication
- Displays results for teams the logged-in manager is assigned to
- No cross-team data visible
- Real-time updates: dashboard refreshes every 5 minutes or on-demand (manager clicks "Refresh")

### 3.2 Trend Visualization

**Trend Lines**
- For each question, display a line chart showing:
  - X-axis: survey cycle date (weekly or bi-weekly intervals)
  - Y-axis: aggregated response (mean for Likert scales, count/percentage for multiple choice)
  - Time range: up to 12 survey cycles (past 3 months for weekly, past 6 months for bi-weekly)
  - Legend: question text and current trend direction (e.g., "Γåæ +0.3 from previous cycle")
  - Y-axis scale: Likert scale always 1ΓÇô5 (not autoscaled)

**Aggregation Rules**
- Likert scale (1-5): Calculate arithmetic mean (to 1 decimal place) and standard deviation; display mean as a point with error bar showing ┬▒1 standard deviation
- Multiple choice: Display as stacked bar chart (count or percentage per option; manager choice in settings)
- Minimum group size rule: If fewer than 3 responses received for a survey cycle, display: "Not enough responses to display results (X responses received, minimum 3 required)" instead of chart

**Prior Period Comparison**
- For each question, display: "This cycle: 4.2 vs. last cycle: 4.1 (+0.1)"
- Percentage change: "Trend: +2.4% vs. 3 cycles ago"
- For multiple choice: "Option A selected 60% (vs. 55% last cycle, +5%)"
- If data is suppressed due to minimum group size, comparison is also suppressed: "Not enough data to compare"

### 3.3 Dashboard Filters and Controls
- Filter by team (if manager has multiple teams)
- Filter by time range (past 3 weeks, past 3 months, past 6 months, custom date range)
- Sort questions by: question order, current mean score (ascending/descending), largest absolute change from previous cycle

### 3.4 Survey Response Rate
- Display: "X of Y team members responded (Z%)"
- Y = team size as of survey launch date (not current roster)
- Updated in real-time as responses come in
- Only counts team members assigned to the survey at survey launch time

### 3.5 Data Persistence on Dashboard
- Dashboard state persists across page refresh (filters, time range, zoom state on charts)
- State stored in URL query parameters (no local storage required)
- Filters reset if browser session ends (manager re-authenticates)

### 3.6 Access Control
- Manager can only view dashboard for teams they are assigned to
- Assignment is role-based: Entra ID group membership (e.g., "engineering-manager-team-A")
- Sharing a dashboard URL does not grant access (authentication and team membership required)
- Session timeout: 30 minutes of inactivity; manager must re-authenticate

## 4. Manager Configuration

### 4.1 Team Membership
- Manager defines which engineers are in their team via:
  - Import from Entra ID group (if available)
  - Manual upload (CSV with email addresses)
  - Manual entry (add/remove individual engineers)
- Team roster changes are applied to future surveys, not retroactively
- On engineer removal from team: future surveys do not include them; past responses remain anonymized and counted

### 4.2 Survey Frequency and Schedule
- Manager selects: weekly or bi-weekly
- Manager specifies: day of week and time (e.g., "Monday 9:00 AM", "Friday 2:00 PM")
- Timezone for scheduling: manager's timezone (inferred from SSO profile or configurable in settings)
- Changes to frequency/schedule take effect on the next scheduled survey cycle
- No backfill surveys if schedule is changed

### 4.3 Survey Questions
- Manager defines 5-7 Likert or multiple-choice questions (cannot be blank or duplicate)
- Likert scale: 1-5 with custom labels (e.g., "Strongly Disagree" to "Strongly Agree")
- Multiple choice: 2-6 options with one correct/selected answer per respondent
- Free-form text questions: not supported in V1
- Manager can add/edit questions anytime; changes apply to the next survey cycle
- Responses from prior surveys are not re-aggregated when questions change
- Historical trend data remains tagged with its original question text and response data, even if the question is later modified or deleted

### 4.4 Notifications Configuration
- Manager selects notification channel(s): Email only, Slack only, or Both
- For Slack: manager specifies channel name or chooses "DM to respondents"
- For Email: system from address is fixed (noreply@teamPulse.[company domain]); manager cannot customize

## 5. System Architecture and Technical Requirements

### 5.1 Authentication and Authorization
- Authentication: OAuth 2.0 / OIDC via Entra ID (company SSO)
- Authorization: Role-based access control (RBAC) ΓÇö engineer, manager, admin
- Token expiry: 8 hours; refresh token valid for 30 days
- Logout on idle: 30 minutes of inactivity
- Survey respondents do not require authentication (link-based access with no tracking to identity)

### 5.2 Technology Stack
- Frontend: React (TypeScript)
- Backend: Node.js (Express or similar)
- Database: PostgreSQL
- Message queue: Redis or similar for async notification dispatch
- Email provider: AWS SES or SendGrid
- Slack integration: Slack API v2
- Hosting: Kubernetes or cloud PaaS (AWS/Azure/GCP)

### 5.3 Performance and Scalability

**Dashboard Load Time**
- Initial dashboard load (12 survey cycles, 7 questions): Γëñ2 seconds (p95 latency)
- Trend chart rendering in browser: Γëñ500ms
- Measured on a typical manager device (modern laptop, 4G or better internet, Chrome/Firefox)

**Survey Form Load and Submit**
- Form page load: Γëñ1 second
- Form submission: Γëñ2 seconds from user click to confirmation page
- Mobile (3G): Γëñ3 seconds for form load, Γëñ4 seconds for submission

**Concurrent Users**
- Support up to 100 managers and 1,000 engineers concurrently
- Response time degradation allowed only if concurrent count exceeds limits

**Database**
- Query for 12-cycle dashboard aggregation: Γëñ500ms (indexed on survey_id, team_id, submitted_at_hour)
- No N+1 queries

### 5.4 Data Retention
- Survey responses: retained indefinitely (confirm policy in Open Questions)
- Notification delivery logs: retained for 30 days (for debugging)
- Manager audit logs: retained for 90 days

### 5.5 Compliance and Security

**Data Privacy**
- Personal data (email, SSO user ID) is kept separate from responses
- PII is never linked to responses at query time
- PII (email, name) is used only for notification dispatch; discarded after send
- No analytics or telemetry on individual responses

**GDPR Compliance**
- Engineers can request a data export: response is "No personal data is stored; your responses are permanently anonymized"
- Engineers can request deletion: response is "Your responses cannot be identified or linked to you and are already deleted from any personal data store"
- Basis for processing: Legitimate interest of manager to understand team health

**Security**
- All API endpoints: HTTPS with TLS 1.2 or higher
- CSRF protection: Tokens on all state-changing operations (survey config, team edits)
- SQL injection prevention: Prepared statements for all database queries
- XSS prevention: React auto-escaping; template output always escaped
- Rate limiting:
  - 10 survey submissions per unique survey link
  - 100 dashboard page loads per minute per manager
  - 5 email notification sends per minute per team
- Password-less: SSO only; no stored passwords

### 5.6 Infrastructure Requirements
- Uptime SLA: 99.5% availability
- Database: PostgreSQL with automated daily backups (retained 30 days)
- Disaster recovery: RPO Γëñ1 hour, RTO Γëñ4 hours
- Log retention: 90 days in application logs, 30 days in database query logs

## 6. User-Facing Flows

### 6.1 Engineer Receives Notification and Responds
1. Engineer receives email or Slack message with anonymized survey link
2. Engineer clicks link, form loads in Γëñ1 second
3. Engineer reads 5-7 questions and responds (total time Γëñ3 minutes)
4. Engineer clicks "Submit"
5. System validates all required fields; if missing, shows inline error: "Question X is required"
6. On success, engineer sees confirmation page: "Thanks for your feedback! Your response is anonymous and helps us understand team health."
7. Confirmation auto-dismisses after 5 seconds or engineer can close
8. Survey link is invalidated; re-submission attempts show: "Survey link expired or already used"

### 6.2 Manager Configures Survey
1. Manager logs in via Entra ID
2. Manager navigates to `/manager/settings`
3. Manager selects or creates a team
4. Manager uploads/enters team roster (email addresses)
5. Manager defines 5-7 Likert or multiple-choice questions
6. Manager selects frequency (weekly or bi-weekly), day, time, timezone
7. Manager selects notification channels (email, Slack, or both)
8. Manager clicks "Save & Activate"
9. Confirmation: "Survey will launch [day/time]. X team members will be notified."
10. Manager is redirected to dashboard

### 6.3 Manager Views Results
1. Manager logs in via Entra ID
2. Manager navigates to `/manager/dashboard`
3. Dashboard loads with trend lines for all questions and response rate
4. Manager can filter by time range, sort questions, toggle response rate display
5. Manager sees prior-period comparisons (change from last cycle, 3-cycle change)
6. Dashboard shows only their own team(s); no cross-team visibility
7. Data updates every 5 minutes or on-demand refresh

## 7. Error Handling and Edge Cases

### 7.1 Survey Response Scenarios
- **User clicks survey link twice**: Second click shows "Survey already submitted by this link"
- **User clicks survey link after expiry (14 days)**: Shows "Survey link expired. Ask your manager for a new link."
- **User starts survey but closes browser**: Form data not saved; reopening shows blank form
- **User submits with blank required field**: Inline error: "Question X is required. Please answer before submitting."
- **Network timeout during submit**: Shows "Network error. Your response was not saved. Please try again."
  - On retry: system detects prior submission and prevents double-submit

### 7.2 Manager Configuration Scenarios
- **Manager removes team member mid-survey cycle**: Team member still receives notification; their response is counted for this cycle
- **Manager changes roster before next survey**: Only new roster receives next survey
- **Manager modifies survey questions between cycles**: Old trend data preserved with old question text; new question appears as new trend line starting from current cycle
- **Manager disables survey**: Notifications stop; dashboard remains visible with historical data
- **Manager re-activates survey after pause**: No backfill surveys; survey resumes on next scheduled date

### 7.3 Data Aggregation Edge Cases
- **Zero responses in a survey cycle**: Chart shows no data point for that cycle; prior comparison is not shown
- **Fewer than 3 responses** (minimum group size): Display message: "Not enough responses to display results (X responses received, minimum 3 required)". No aggregation shown. Comparison also suppressed.
- **All respondents select same Likert option**: Mean = that option, std dev = 0 (error bar has no height)
- **Multiple choice with zero selections for an option**: Option shown as 0% or not displayed if manager configures "hide zero options"

### 7.4 Notification Edge Cases
- **Slack channel deleted**: Notification fails; manager sees alert "Slack channel not found. Update notification settings."
- **Engineer email invalid**: Notification fails; manager sees alert "Failed to notify X team members. Check email validity."
- **Slack rate-limited**: Retry with exponential backoff (1s, 2s, 4s); fail after 3 retries with manager alert

### 7.5 Anonymity Edge Cases
- **Very small team (2 people)**: Survey still runs; if only 1 responds, results are suppressed (minimum group size = 3)
- **Text responses accidentally revealing identity**: Not applicable in V1 (text questions excluded)
- **IP correlation attacks**: Timestamps salted to hour precision; IP address not stored; timezone inferred and discarded

## 8. Out of Scope / Not in V1

- **ML-based sentiment analysis**: Text responses are not analyzed for sentiment or themes. Free-form questions excluded in V1.
- **Cross-team comparison**: Managers cannot compare results across their teams or see averages/benchmarks. Dashboard is team-specific.
- **Integration with HR systems**: No export to Workday, BambooHR, or other HR platforms. Manager can screenshot or export manually.
- **Native mobile applications**: No iOS or Android app. Mobile-responsive web form provided via browser.
- **Customizable analytics and reports**: No SQL query builder, pivot tables, or custom chart creation. Fixed dashboard layout only.
- **Survey branching or conditional logic**: Surveys are linear; questions do not conditionally show based on prior answers.
- **Multi-language support**: All UI and surveys in English only.
- **Manager-to-engineer communication**: No mechanism for manager to send targeted feedback in response to survey results. Dashboard is view-only.
- **Organization-wide or cross-team surveys**: Survey is single-team only; no org-wide pulse or cross-team comparisons.
- **Free-form text responses**: Likert scale and multiple-choice only. Text questions excluded in V1.
- **Anonymous feedback channels**: No mechanism for engineers to submit additional anonymous comments outside the structured survey.
- **Survey results export or sharing**: No CSV/PDF export. Manager can screenshot or print.

## 9. Open Questions

1. **Minimum group size for result suppression**: Currently specified as 3 responses per survey cycle. Confirm if this is appropriate given expected team sizes. Consider if suppression rule should also apply to team size (e.g., teams <10 always suppressed for privacy).

2. **Free-form text question support**: V1 excludes text questions. Should V1.5 add text questions? If yes, how should responses be aggregated and displayed?
   - Recommendation: Exclude in V1; revisit in V1.5.

3. **Data retention and deletion policy**: How long should survey responses be retained?
   - Option (a): Indefinitely (current proposal)
   - Option (b): 12 months rolling window (auto-delete older responses)
   - Option (c): Until team is archived (purge all responses when team is deleted)
   - Confirm retention policy and any compliance drivers (GDPR, data minimization, etc.).

4. **Slack result sharing**: After survey closes, should results be posted to Slack, or is email/dashboard the only result channel?
   - Recommendation: Email/dashboard only in V1; add Slack result posting in V1.5.

5. **Survey link expiration strategy**: Should survey link expire after single submission or be reusable within 14 days?
   - Current proposal: Single-use after submission; expires after 14 days if not started.
   - Confirm if this prevents accidental double-submission sufficiently.

6. **Timezone handling for scheduling**: Should the system respect each engineer's inferred timezone when displaying deadlines and survey link, or use manager's timezone for all notifications?
   - Recommendation: Deadline deadline based on manager's timezone; engineer sees link immediately after notification send.

7. **Survey cycle overlap and scheduling changes**: If a manager changes frequency (weekly to bi-weekly), what happens to surveys already scheduled?
   - Recommendation: Current surveys complete normally; frequency change takes effect on next scheduled cycle.

8. **Admin audit of anonymity enforcement**: What auditing mechanism verifies anonymity is maintained? Should there be an audit log of failed correlation attempts, or is quarterly code review sufficient?
   - Recommendation: Quarterly code review + audit logging of any queries that attempt to join responses to user tables.

9. **Notification delivery SLA**: What is the target SLA for notifying all team members by survey launch time?
   - Current proposal: Best-effort with up to 3 retries over 24 hours.
   - Should it be stronger (e.g., "95% notified within 1 hour")?

10. **Multiple team membership**: If an engineer is assigned to two teams and both teams run surveys the same week, does the engineer receive two separate survey links (one per team)?
    - Recommendation: Yes, two separate links, tracked separately per team. Engineer completes both surveys independently.

---

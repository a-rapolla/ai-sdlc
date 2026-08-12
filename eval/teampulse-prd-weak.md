# TeamPulse: Team Health Check System
## Product Requirements Document

---

## 1. Overview

TeamPulse is a lightweight pulse survey system that enables engineering managers to measure and track team health through recurring anonymous surveys. The system collects weekly or bi-weekly feedback from engineers on a configurable set of 5-7 questions, aggregates responses at the team level, and presents trend analysis to managers while maintaining complete response anonymity.

---

## 2. Problem Statement

Engineering managers need visibility into team health and morale but lack a simple, non-intrusive way to gather regular feedback. Existing solutions are often too complex, require significant overhead to administer, or fail to guarantee anonymity. TeamPulse solves this by providing a streamlined, manager-friendly tool that respects engineer privacy while delivering actionable insights.

---

## 3. Goals & Success Metrics

### Primary Goals
- Enable managers to gather team sentiment on a recurring, scheduled basis with minimal friction
- Provide trend visibility over time to detect shifts in team health
- Maintain engineer privacy through complete anonymity and no data attribution

### Success Metrics
- **Adoption**: ≥50% survey completion rate among invited team members within first 8 weeks
- **Engagement**: Average response time <3 minutes per survey
- **Manager value**: 80%+ of managers report actionable insights from trend data
- **Reliability**: 99.5% uptime for survey delivery and response collection
- **Privacy**: Zero cross-contamination of team data or response attribution across organizations

---

## 4. User Personas

### Engineering Manager
- Responsible for 5–15+ direct reports
- Needs quarterly or biannual health check-ins but wants continuous signal
- May not be technical; requires simple UI for setup and dashboard interpretation
- Concerns: Response rate, data accuracy, manager overhead

### Engineer / Individual Contributor
- Receives survey link via email or Slack
- Wants to provide feedback but values privacy and appreciates anonymity guarantees
- Expects a fast, mobile-friendly experience

---

## 5. Functional Requirements

### 5.1 Survey Administration (Manager Portal)

#### 5.1.1 Survey Configuration
- **Create / Edit Survey**: Manager can define a survey with:
  - Survey name and description
  - 5–7 questions (mix of scales and free-text; see 5.1.2)
  - Recurrence: weekly or bi-weekly
  - Team selection: checkbox or search interface to add/remove team members
  - Launch date/time and optional end date
  - Status: draft, active, paused, closed
- **Question Types**:
  - Likert scale (1–5 or 1–10)
  - Single-select (multiple choice)
  - Free-text (optional/short comment field)
- **Question Library**: Managers can save questions as templates for reuse
- **Validation**: Prevent creation of surveys with no questions or with >7 questions

#### 5.1.2 Team Management
- Add/remove team members to a survey
- Use company SSO/Entra ID directory to search and add members
- Display team member count and survey completion status (count only, no names)
- Bulk upload capability (CSV with email addresses)
- Display which team members have already responded (anonymous count only, e.g., "3 of 8 responded")

#### 5.1.3 Survey Scheduling & Delivery
- Automatic scheduling: surveys launch at specified date/time
- Delivery: send notifications (email and/or Slack, configurable) with anonymous survey link
- Reminder option: optional follow-up reminder after 3 days (configurable)
- Manual trigger: manager can resend survey link to specific team manually
- Notification template: pre-built, customizable message with survey details and link

#### 5.1.4 Response Cutoff
- Manager can view live response count during active period
- Set automatic cutoff date/time; responses after cutoff are rejected
- Manual close: manager can close survey early

---

### 5.2 Survey Respondent Flow (Engineer)

#### 5.2.1 Survey Delivery & Access
- **Email/Slack notification**: Contains:
  - Team name and manager name (context, no survey identity)
  - Brief description of survey purpose
  - Anonymous survey link (token-based, not tied to respondent email)
  - Link expiry: link valid for entire active survey period
  - CTA: "Take the survey" (target: <3 minutes)
- **Link properties**:
  - Unique token per notification (does NOT embed respondent identity)
  - Valid across all devices
  - No login required; anonymous session

#### 5.2.2 Survey Form UI
- **Mobile-first responsive design**: optimized for phone, tablet, desktop
- **Single-page form** with progress indicator (e.g., "Question 2 of 7")
- **Question rendering**:
  - Likert/scale: radio buttons or slider
  - Multiple choice: radio buttons or dropdown
  - Free-text: single-line or multi-line input (optional/lightweight)
- **Accessibility**: WCAG 2.1 AA compliance (alt text, keyboard nav, color contrast)
- **Form state**: local storage to allow tab switches without data loss (cleared on submit)
- **Submit button**: disabled until all required questions answered
- **Confirmation screen**: "Thank you for your feedback" (no data echoed)

#### 5.2.3 Response Submission
- **Server-side validation**: verify response format, required fields, survey still open
- **No logging of respondent identity**: the submission token is not retained or logged in a way that can be correlated back to an individual
- **Duplicate prevention**: one response per unique token; if token submitted again, return 409 or silent accept (no error)

---

### 5.3 Manager Dashboard

#### 5.3.1 Dashboard Overview
- **Left sidebar**: list of active, scheduled, and past surveys (team-filtered)
- **Main panel**: default view is the most recent active survey (or next scheduled)
- **Date range selector**: "Last 4 weeks", "Last 8 weeks", custom range
- **Survey selector**: dropdown to switch between surveys

#### 5.3.2 Results Visualization
For each question, display:
- **Trend line chart** (time-series):
  - X-axis: survey response date/week
  - Y-axis: average score (for Likert/scale) or % distribution (for multiple-choice)
  - Tooltip: show exact count and average on hover (e.g., "5 responses, avg 4.2")
  - Color coding: fixed colors per question (not theme-dependent)
- **Current snapshot** (most recent survey):
  - Score/distribution with team member count
  - Previous period comparison: badge or delta (e.g., "↑ 0.3 from last week")
- **Free-text responses** (if applicable):
  - Aggregate summary (e.g., word cloud or top themes) — optional for V1
  - Raw list of responses (paginated, not searchable, no filtering by content)

#### 5.3.3 Team Visibility
- Manager sees response **count only** (e.g., "6 of 8 responses")
- No individual names, emails, or IDs associated with responses
- No way to filter, search, or drill down to an individual respondent

#### 5.3.4 Data Export (Stretch)
- Export results as CSV: survey name, question, response date, aggregated count/average
- No raw individual response data in export

---

### 5.4 Authentication & Authorization

#### 5.4.1 Sign-In
- SSO via Entra ID (OIDC flow)
- Automatic redirect on unauthenticated access
- Token stored in secure HTTP-only cookie with 24-hour expiry

#### 5.4.2 Authorization
- **Manager role**: can create, edit, view, and manage surveys; see dashboards for assigned teams
- **Engineer role**: access only to survey links sent to them; no manager UI
- **Admin role**: (optional for V1) view cross-team analytics (out of scope)
- Role sourced from company AD group or claim in OIDC token

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **Survey form load**: <2 seconds on 4G connection
- **Dashboard load**: <3 seconds (with cached data)
- **Notification delivery**: <5 minutes from scheduled time
- **Survey response save**: <1 second latency

### 6.2 Scalability
- Support 100+ teams, 1000+ engineers, 50+ concurrent survey sessions
- No performance degradation with 10,000+ historical responses per survey

### 6.3 Reliability
- **Uptime SLA**: 99.5% monthly
- **Database backups**: daily, retained for 30 days
- **Disaster recovery**: RPO <1 hour, RTO <4 hours

### 6.4 Security
- **HTTPS only**: all communication encrypted in transit
- **CSRF protection**: tokens on all state-changing forms
- **Rate limiting**: 100 requests/minute per IP on survey endpoints
- **SQL injection prevention**: parameterized queries throughout
- **XSS prevention**: sanitize all user input, especially free-text responses
- **Data retention**: responses retained for 2 years; automatic purge after
- **Audit logging**: log all survey creation, modification, and deletion by manager

### 6.5 Accessibility
- **WCAG 2.1 AA** compliance for all UI
- **Keyboard navigation** throughout
- **Color contrast** ratios ≥4.5:1 for text
- **Screen reader** support (ARIA labels)

### 6.6 Privacy & Anonymity (Critical)
- **Zero response attribution**: no respondent email, name, or ID stored with response data
- **No correlation**: response data and respondent identity are in separate logical storage with no join key
- **No IP logging** tied to responses
- **No cookies** tracking respondent identity
- **Token expiry**: survey access tokens expire at survey close or 30 days, whichever is sooner
- **No admin override**: admins cannot view individual respondent identity, even in emergencies
- **Compliance**: GDPR/CCPA ready (no PII in response records, right to be forgotten via token rotation)

---

## 7. Technical Architecture & Constraints

### 7.1 Stack
- **Frontend**: React (TypeScript recommended)
- **Backend**: Node.js (Express or similar)
- **Database**: PostgreSQL
- **Authentication**: OIDC via company Entra ID
- **Version control**: GitHub
- **Issue tracking**: Jira

### 7.2 Data Model (High-Level)

#### Core Entities
- **User** (from SSO)
  - id, email, name, role (manager/engineer), team_id (optional)
  - Sourced from Entra ID; no local password storage

- **Team**
  - id, name, manager_id (FK to User), created_at, updated_at

- **Survey**
  - id, team_id (FK), name, description, status (draft/active/paused/closed), recurrence_type (weekly/biweekly), start_at, end_at, created_at, updated_at, created_by (FK to User)

- **Question**
  - id, survey_id (FK), order, type (likert/multiple_choice/free_text), text, options (JSON for multiple-choice), required (boolean), created_at

- **Response** (anonymized)
  - id, survey_id (FK), question_id (FK), answer_value (JSON to support different types), submitted_at
  - **NO respondent_id or user_id**; use a random token or session ID as temporary coupling for multi-question submission only

- **SurveyNotification**
  - id, survey_id (FK), user_id (FK), token (unique, random), sent_at, delivered_at, clicked_at (optional)
  - Token is single-use or valid-for-survey-period; not logged with response

- **AuditLog**
  - id, user_id (FK), action (create_survey/edit_survey/close_survey/export), resource_type, resource_id, timestamp

### 7.3 Key Architectural Decisions

#### Anonymity
- Response table has no foreign key to User
- Notification tokens are one-time use (marked as "used" after first form load)
- Session-based response assembly: client sends responses with a temporary session ID; server discards session ID after response saved
- No logging of respondent IP or device fingerprint in the response record

#### Database Partitioning (Optional, Post-V1)
- Responses table partitioned by survey_id to enable faster historical queries

---

## 8. User Flows

### 8.1 Manager Creates and Launches Survey
1. Manager logs in via SSO
2. Clicks "Create Survey" → form opens
3. Fills: survey name, 5–7 questions, selects team members, sets recurrence (weekly) and start date
4. Saves as draft → review screen
5. Clicks "Launch" → system schedules notification send
6. Notifications queued for delivery at scheduled time

### 8.2 Engineer Receives and Completes Survey
1. Engineer receives email/Slack notification with anonymous link
2. Clicks link → survey form loads (no sign-in required)
3. Answers 5–7 questions in <3 minutes
4. Clicks submit → confirmation screen
5. Optional follow-up reminder email (3 days later if not completed)

### 8.3 Manager Views Results
1. Manager logs in and navigates to survey
2. Sees current response count (e.g., "6 of 8 responded")
3. Views trend charts for each question over past 8 weeks
4. Compares to prior survey period
5. Optional: exports CSV for external analysis

---

## 9. Out of Scope (V1)

- ML-based sentiment analysis on free-text responses
- Cross-team comparison or benchmarking
- Integration with HR systems (ADP, Workday, etc.)
- Native mobile apps (web is mobile-responsive)
- Advanced filtering or cohort analysis (e.g., "by tenure" or "by department")
- Real-time webhooks or external API integrations
- White-label/multi-tenant support
- Historical data migration from other survey tools
- Video or audio feedback

---

## 10. Assumptions & Dependencies

### Assumptions
- All users have valid Entra ID accounts and are discoverable via company directory
- Managers have clear ownership of team membership; no matrix reporting for V1
- Survey responses are voluntary; no enforcement or escalation if response rates are low
- Company tolerates 5–10 minute email delivery delay for notifications

### Dependencies
- Company Entra ID instance is up and accessible
- Email or Slack infrastructure available for notifications
- PostgreSQL instance with ≥10 GB storage
- Node.js runtime (v18+ recommended)

---

## 11. Success Criteria & Metrics

### Launch Readiness
- ✅ All functional requirements implemented and tested
- ✅ Privacy audit passed (no PII leakage in response data)
- ✅ Performance benchmarks met (form load <2s, dashboard <3s)
- ✅ WCAG 2.1 AA compliance verified

### Post-Launch KPIs (8 weeks)
- Average survey response rate: ≥50%
- Manager satisfaction (NPS): ≥7 out of 10
- Dashboard session frequency: ≥1 per manager per week
- Zero privacy incidents or unauthorized access attempts

---

## 12. Future Enhancements (Post-V1)

- Sentiment analysis summary on free-text responses
- Custom thresholds and alerts (e.g., "notify manager if avg score <3")
- Survey templates from industry benchmarks
- Cross-team trend comparison (opt-in for teams sharing metrics)
- Native mobile apps
- Two-factor authentication for managers
- Role-based dashboard customization

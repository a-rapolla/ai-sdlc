# TeamPulse Architecture Document

## 1. Executive Summary

TeamPulse is an anonymous team health survey system that enables engineering managers to measure sentiment through recurring surveys while maintaining strict response anonymity. The system architecture separates respondent identity (held during notification delivery) from survey responses (stored without any trace of respondent), uses token-based anonymous survey access, and enforces this separation at the database schema, API, and application logic layers.

The stack is built on React (frontend), Node.js/Express (backend), PostgreSQL (data), and Entra ID OIDC (authentication). The core architectural principle is: **respondent identity never joins with response data**. This guarantee is enforced through physical schema separation, token-based access, and explicit absence of logging or correlation mechanisms.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Systems                         │
├─────────────────────────────────────────────────────────────────┤
│  Entra ID (OIDC)  │  Email Service  │  Slack API  │  GitHub     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Load Balancer / CDN                          │
│              (Proposal: AWS CloudFront or Nginx)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────┬──────────────────────────────────────────┐
│   React SPA          │     Express Backend (Node.js)            │
│  (TypeScript)        │                                          │
├──────────────────────┼──────────────────────────────────────────┤
│ • Manager Portal     │ • Manager API (authenticated)            │
│ • Survey Form        │ • Response Submission API (anonymous)    │
│ • Dashboard          │ • Notification Dispatch                  │
│ • Team Config UI     │ • Background Job Workers                 │
└──────────────────────┴──────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                                │
├─────────────────────────────────────────────────────────────────┤
│  Users  │  Teams  │  Surveys  │  Questions  │  Responses        │
│  (Identity-coupled)           │  (Anon-only)                    │
│                                                                  │
│  SurveyNotifications │ AuditLog │ SurveyTemplates              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Background Services (Proposal: Redis Queue + Workers)          │
│  • Notification Scheduler                                       │
│  • Email/Slack Dispatcher                                       │
│  • Data Retention Cleanup                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 Frontend (React SPA)

#### Technology Stack
- **React 18+** (TypeScript)
- **Routing**: React Router v6
- **State Management**: Proposal: TanStack Query (React Query) for server state; Zustand or Context for local UI state. Rationale: TanStack Query handles cache invalidation on survey updates and supports offline-first patterns. Alternative: Redux if more complex state orchestration is needed.
- **UI Components**: Proposal: Material-UI (MUI) or Headless UI + Tailwind CSS. Rationale: MUI provides WCAG 2.1 AA accessible components out-of-the-box. Alternative: Headless UI if lightweight custom styling is preferred.
- **HTTP Client**: Axios or native Fetch API
- **Build Tool**: Vite (fast builds, HMR)

#### Deployment
- Proposal: Static hosting on AWS S3 + CloudFront (CDN), or Vercel. Rationale: no server-side rendering needed; client fetches data from API. Reduces backend load and enables edge caching. Alternative: self-hosted Nginx if infrastructure control is required.

#### Key Features
- **Manager Portal**: authenticated, team-scoped survey creation, dashboard with trend visualization
- **Survey Form**: anonymous, no authentication, token-based access; mobile-first; local storage for form state
- **Dashboard**: responsive charts (Proposal: Recharts or Chart.js), real-time response count polling

#### Security in Frontend
- CSRF tokens on all form submissions (state-changing POST/PUT/PATCH)
- XSS prevention: React's JSX auto-escapes by default; additional sanitization for free-text display (Proposal: DOMPurify)
- Secure cookie handling: HttpOnly, Secure, SameSite flags set by backend
- No local storage of sensitive data (auth tokens in HttpOnly cookies only)

### 3.2 Backend (Node.js/Express)

#### Technology Stack
- **Runtime**: Node.js v18+ (LTS)
- **Framework**: Express.js v4+
- **Database Driver**: `pg` (node-postgres)
- **Authentication Middleware**: `passport-oidc-implicit` or `oidc-provider` (custom OIDC client)
- **Request Validation**: Proposal: Zod or Joi. Rationale: schema validation at API boundary reduces bugs and improves security. Alternative: manually validate if simplicity is paramount.
- **Logging**: Proposal: Winston or Pino for structured JSON logging. Rationale: centralized logging aids debugging and audit trail. Alternative: console.log if minimal overhead preferred.
- **Background Jobs**: Proposal: Bull (queue library backed by Redis) or node-cron. Rationale: Bull provides reliable job scheduling, retry, and distribution. Alternative: native setTimeout for prototyping.

#### API Layer

**Manager-Authenticated Endpoints** (require valid Entra ID session):
- `POST /api/surveys` - Create survey (team-scoped)
- `GET /api/surveys` - List surveys for manager's teams
- `GET /api/surveys/{id}` - Get survey details
- `PATCH /api/surveys/{id}` - Update survey (questions, team members, dates)
- `POST /api/surveys/{id}/launch` - Transition to active, trigger notification scheduling
- `POST /api/surveys/{id}/close` - Close survey, stop accepting responses
- `POST /api/surveys/{id}/send-reminder` - Trigger reminder notification
- `GET /api/surveys/{id}/results` - Fetch aggregated results (trend data, response counts)
- `POST /api/teams` - Create team (admin or manager)
- `GET /api/teams` - List teams for manager
- `PATCH /api/teams/{id}` - Update team members (bulk upload via CSV or search)
- `GET /api/entra/search` - Search Entra ID directory for users
- `GET /api/export/surveys/{id}` - Export results as CSV (data export; stretch feature)

**Anonymous Survey Endpoints** (no authentication):
- `GET /api/surveys/token/{token}` - Fetch survey form (validates token, does NOT consume it)
- `POST /api/surveys/token/{token}/submit` - Submit responses (consume token after validation)

**Authentication Endpoints**:
- `GET /api/auth/login` - Redirect to Entra ID OIDC login
- `GET /api/auth/callback` - OIDC callback, set session cookie
- `POST /api/auth/logout` - Logout, clear session

**Health/Status Endpoints**:
- `GET /health` - Liveness probe (database connectivity)
- `GET /readiness` - Readiness probe

#### Response Schema Handling

Responses support multiple question types:
- **Likert/Scale**: `{ type: 'number', value: 1-10 }`
- **Multiple Choice**: `{ type: 'choice', value: 'option_id' }`
- **Free-text**: `{ type: 'text', value: 'raw text (sanitized)' }`

Backend validates answer types and required fields before storing.

#### Rate Limiting & Security

- **Rate Limiting**: Proposal: Express rate-limit middleware. Provisional limit: 100 requests per minute per IP on `/api/surveys/token/*/submit`. Rationale: prevents brute-force flooding; alternative thresholds in open decisions section.
- **CORS**: Configured to accept requests from frontend domain(s)
- **HTTPS Only**: enforced via middleware redirect
- **SQL Injection Prevention**: parameterized queries (pg library enforces this)
- **CSRF Protection**: tokens validated on state-changing operations

### 3.3 Database (PostgreSQL)

#### Schema Design

The core anonymity principle: **Response records have NO foreign key to User; the connection is severed after notification.**

```sql
-- Identity-coupled tables (respondent known)
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  entra_id VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'engineer', -- 'manager', 'engineer', 'admin'
  team_id UUID REFERENCES team(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  manager_id UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE survey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'paused', 'closed'
  recurrence_type VARCHAR(50), -- 'weekly', 'biweekly', or NULL for one-time
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
  "order" INT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'likert', 'multiple_choice', 'free_text'
  text TEXT NOT NULL,
  options JSONB, -- for multiple_choice: [{ id, label }]
  required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE survey_notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE, -- random, secure token
  token_used BOOLEAN NOT NULL DEFAULT FALSE, -- marked used after first form load
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  clicked_at TIMESTAMP,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'email', -- 'email', 'slack'
  created_at TIMESTAMP DEFAULT NOW()
  -- NO: response_id, survey_response_id, or any foreign key linking to response
);

-- Anonymous-only tables (respondent NOT known)
CREATE TABLE survey_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  answer_value JSONB NOT NULL, -- { type, value } structure
  submitted_at TIMESTAMP DEFAULT NOW()
  -- NO: user_id, respondent_id, token, or notification_id
  -- NO: ip_address, user_agent, device_fingerprint
);

-- Session table for multi-question form assembly (temporary coupling)
CREATE TABLE response_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES survey(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL, -- from survey_notification.token
  session_expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
  -- Discarded after response submission or expiry
);

CREATE TABLE survey_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  questions JSONB NOT NULL, -- serialized array of question configs
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'create_survey', 'edit_survey', 'close_survey', 'export', 'delete_survey'
  resource_type VARCHAR(100), -- 'survey', 'team', 'question'
  resource_id UUID,
  details JSONB, -- optional additional context
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_survey_team ON survey(team_id);
CREATE INDEX idx_survey_status ON survey(status);
CREATE INDEX idx_question_survey ON question(survey_id);
CREATE INDEX idx_response_survey ON survey_response(survey_id);
CREATE INDEX idx_response_question ON survey_response(question_id);
CREATE INDEX idx_response_submitted ON survey_response(submitted_at);
CREATE INDEX idx_notification_survey ON survey_notification(survey_id);
CREATE INDEX idx_notification_token ON survey_notification(token);
CREATE INDEX idx_notification_used ON survey_notification(token_used);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
```

**Key Privacy Decisions**:
1. **survey_response table**: NO user_id, no token, no respondent coupling. Responses are keyed only by survey_id + question_id + submitted_at.
2. **response_session table**: Temporary table used only for the duration of form submission. Session ID is generated per survey delivery, discarded after response saved. It provides ephemeral linkage between multi-part responses; server never logs it beyond the session row itself.
3. **survey_notification table**: Holds the delivery token, marked "used" after first form load. Token is NOT stored in response table.
4. **No IP/User-Agent logging**: survey_response schema explicitly omits these; if collected for debugging, they must go to a separate, time-bound log not accessible by normal query paths.

#### Data Retention & Cleanup

- **Response records**: Provisional retention: 2 years from survey close. Automatic purge via background job every week.
- **Notification records**: Kept for delivery/troubleshooting purposes; provisional retention: 6 months.
- **Audit logs**: Provisional retention: 1 year.
- **Response sessions**: Expired automatically via `DELETE FROM response_session WHERE session_expires_at < NOW()` (run hourly).

#### Partitioning (Post-V1)

Proposal: Partition `survey_response` table by `survey_id` for large surveys (10k+ responses). Rationale: improves query speed on historical dashboards. Alternative: without partitioning, indexes on (survey_id, submitted_at) suffice for V1.

### 3.4 Authentication (Entra ID OIDC)

#### OAuth 2.0 / OIDC Flow

1. **Login Initiation**: User clicks "Sign In" → redirected to Entra ID authorization endpoint.
2. **Authorization**: User logs in with corporate credentials.
3. **Callback**: Entra ID redirects to `/api/auth/callback` with authorization code.
4. **Token Exchange**: Backend exchanges code for ID token (and optionally access token for directory access).
5. **Session Creation**: Backend validates token signature, creates session, sets HttpOnly secure cookie.
6. **Redirect**: Frontend redirected to `/manager` or `/team` (authenticated area).

#### Session Management

- **Cookie-based sessions**: HttpOnly, Secure, SameSite=Strict
- **Session storage**: Proposal: in-memory store (development) or Redis (production). Rationale: Redis is distributed, survives restarts, enables multi-instance backends. Alternative: persistent DB session store if cloud provider not available.
- **Session TTL**: Provisional 24 hours. User re-authenticates on expiry or token refresh (if OAuth provider supports it).
- **Logout**: Server invalidates session, clears cookie.

#### OIDC Configuration

```javascript
// Backend setup (pseudocode)
const oidcConfig = {
  authority: 'https://login.microsoftonline.com/{tenant}/v2.0',
  clientId: process.env.ENTRA_CLIENT_ID,
  clientSecret: process.env.ENTRA_CLIENT_SECRET,
  redirectUri: 'https://app.teampulse.example.com/api/auth/callback',
  scope: 'openid profile email',
  responseType: 'code', // Authorization Code flow (secure for server)
};
```

#### Role Resolution

- **Manager Role**: User is member of Entra AD group `teampulse-managers` OR has manager claim in token.
- **Engineer Role**: Default; all authenticated users.
- **Admin Role**: Reserved for future; not in V1 scope.

#### Entra ID Directory Integration

- **Team Member Search**: Backend calls Microsoft Graph API to search Entra ID users and fetch email addresses.
- **Bulk Upload**: CSV with emails → validate against Entra ID directory before adding to team.
- **Proposal**: Cache Entra ID directory locally (Redis or DB) with 1-hour TTL. Rationale: reduces API calls, improves search latency. Alternative: live search each time (slower, no cache overhead).

---

## 4. Data Flow & Privacy Trace

### 4.1 Survey Creation & Scheduling (Manager)

```
Manager Portal
    ↓
[POST /api/surveys] (authenticated)
    ↓
Backend validates request, creates Survey + Questions, stores in DB
    ↓
[POST /api/surveys/{id}/launch] (authenticated)
    ↓
Backend:
  1. Fetch team members from team_member table
  2. For each team member:
     - Generate random token (64-char hex)
     - Insert row into survey_notification (survey_id, user_id, token)
  3. Queue notification jobs (one per user)
    ↓
Background Worker (Bull queue)
    ↓
For each notification job:
  1. Fetch survey details + questions + manager name
  2. Fetch user email from survey_notification.user_id join
  3. Render email template with survey name, link: https://.../survey?token={token}
  4. Send via email provider
  5. Update survey_notification.sent_at, delivered_at (when confirmed)
    ↓
User receives email
```

**Privacy Checkpoint**: At no point is the token linked to the response. The token is metadata for _delivery_, not for response tracking.

### 4.2 Survey Submission (Engineer)

```
Engineer receives email with token {token}
    ↓
Clicks link → https://app.teampulse.example.com/survey?token={token}
    ↓
Frontend:
  1. Validates token present
  2. [GET /api/surveys/token/{token}]
       Backend:
         - Fetches survey_notification by token
         - If token_used = true, return 410 Gone (or silent ignore)
         - Fetch survey + questions
         - Set token_used = true (mark consumed)
         - Return survey metadata + questions (NO user_id, no identity)
  3. Creates temporary response_session in DB (for multi-question forms)
  4. Renders survey form
    ↓
Engineer fills out form (local state in React)
    ↓
[POST /api/surveys/token/{token}/submit]
    Backend:
      1. Validate token exists and survey is still open
      2. Validate responses (required fields, format)
      3. Sanitize free-text responses (XSS prevention)
      4. For each response:
         - INSERT INTO survey_response (survey_id, question_id, answer_value, submitted_at)
         - NO user_id, NO token, NO session_id stored
      5. DELETE response_session where id = ... (clean up ephemeral data)
      6. Return 200 OK "Thank you for your feedback"
    ↓
Frontend displays confirmation screen
```

**Privacy Checkpoints**:
1. Token is used for delivery validation only, never stored in response.
2. Response table has zero respondent identity.
3. Temporary session is deleted after use.
4. Free-text responses are sanitized to prevent PII injection.

### 4.3 Dashboard View (Manager)

```
Manager logs in (authenticated)
    ↓
[GET /api/surveys/{id}/results]
    Backend:
      1. Verify manager owns the team
      2. Query:
         SELECT question_id, COUNT(*) as response_count, 
                AVG(answer_value->'value'::float) as avg_score
         FROM survey_response
         WHERE survey_id = {id}
         GROUP BY question_id, DATE_TRUNC('day', submitted_at)
      3. Join with questions table to fetch question text
      4. Return aggregated data only (counts, averages, trends)
         NO: individual responses, respondent names, emails
    ↓
Frontend renders trend chart, current snapshot
    ↓
Manager sees: "6 of 8 responded", "avg score 4.2", ↑ 0.3 from last week
```

**Privacy Checkpoint**: At no point in the results query do we reference the user, notification, or team_member tables. Results are isolated to the response table.

### 4.4 Export (Stretch Feature)

```
[POST /api/export/surveys/{id}]
    Backend:
      1. Verify manager owns team
      2. Query survey_response with aggregation
      3. Generate CSV:
         survey_name, question_text, response_date, response_count, avg_score
         (for free-text: question_text, response_text (sanitized), count)
      4. NO individual respondent data
      5. Return CSV file
    ↓
Manager downloads file
```

**Privacy Checkpoint**: CSV contains only aggregated data, never individual mappings.

---

## 5. Critical Privacy & Anonymity Guarantees

### 5.1 Design Enforcement

| Guarantee | Design Mechanism | Verification Point |
|-----------|------------------|--------------------|
| **Zero response attribution** | Response table has no user_id, respondent_id, or foreign key to any identity table | Schema review: survey_response table definition |
| **No correlation path** | Token stored in survey_notification; after form load, token_used=true; no reference in survey_response | Code review: response submission endpoint, no token saved |
| **No IP logging** | survey_response schema omits ip_address, user_agent fields | Schema review; audit logging (if IP logged, must be in separate non-joinable table) |
| **Token expiry** | Token marked as used after first form load; survey_id checked against end_at timestamp | Backend validation: GET /surveys/token/{token} endpoint |
| **No admin override** | Audit logs do NOT include a "view_response_for_user" action; no admin UI to fetch individual responses | Code review: no admin API endpoints for individual response lookup |
| **GDPR right to be forgotten** | Token-based delivery means no persistent respondent→response link; upon user deletion, survey_notification rows deleted; responses remain anonymous | Procedure: on user deletion, cascade delete from survey_notification; survey_response data untouched (already anonymous) |

### 5.2 Data Retention Compliance

```
Timeline:

[Survey Created] → [Responses Collected] → [Survey Closed] → [2-year retention] → [Purge]
                                                                      ↓
                                                   DELETE FROM survey_response
                                                   WHERE survey_id IN (
                                                     SELECT id FROM survey
                                                     WHERE closed_at < NOW() - INTERVAL '2 years'
                                                   )

Notification records:
[Delivered] → [6-month retention] → [Purge]
                  ↓
           DELETE FROM survey_notification WHERE created_at < NOW() - INTERVAL '6 months'

Audit logs:
[Logged] → [1-year retention] → [Purge]
    ↓
DELETE FROM audit_log WHERE timestamp < NOW() - INTERVAL '1 year'
```

All purge operations run as scheduled background jobs (proposal: Daily at 2 AM UTC).

### 5.3 Logging & Audit Trail

**What is logged** (for compliance / debugging):
- Manager actions: survey creation, modification, launch, closure, export
- Email/Slack delivery status (sent, delivered, bounced)
- API errors (invalid requests, auth failures)

**What is NOT logged**:
- Individual response submission (no "user {id} responded to survey {sid}")
- Notification token in request/response logs
- IP address or device fingerprint of respondent
- Free-text response content in application logs (only stored in response table)

---

## 6. Deployment & Infrastructure

### 6.1 Deployment Architecture

#### Development
- Local React dev server (Vite) on `http://localhost:5173`
- Local Express backend on `http://localhost:3000`
- Local PostgreSQL instance
- Environment variables (`.env.local`) for Entra ID, database credentials

#### Staging / Production

**Proposal: Containerized deployment (Docker) on AWS ECS or Kubernetes.** Rationale: scalable, standardized across environments, supports auto-scaling. Alternative: serverless (AWS Lambda) if minimal operational overhead is priority.

```
┌─────────────────────────────────────────┐
│       CloudFront / CDN                  │
│     (React SPA caching)                 │
└──────────────┬──────────────────────────┘
               ↓
┌──────────────────────────────────────────┐
│     Application Load Balancer (ALB)      │
│     (HTTPS, sticky sessions)             │
└──────────────┬──────────────────────────┘
               ↓
┌────────────────────────────────────────────────────┐
│   ECS Cluster (Proposal) / Kubernetes              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Backend  │  │ Backend  │  │ Backend  │  (N=3+) │
│  │ Service  │  │ Service  │  │ Service  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Worker   │  │ Worker   │  │ Worker   │  (N=2+) │
│  │ (Bull)   │  │ (Bull)   │  │ (Bull)   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
└────────────────────────────────────────────────────┘
               ↓
┌────────────────────────────────────────────────────┐
│           AWS RDS (PostgreSQL)                     │
│           Multi-AZ, automated backups              │
│           (Proposal)                               │
└────────────────────────────────────────────────────┘
               ↓
┌────────────────────────────────────────────────────┐
│           AWS ElastiCache (Redis)                  │
│           Session store, Bull queue, caching       │
│           (Proposal)                               │
└────────────────────────────────────────────────────┘
```

**Proposal Rationales**:
- **AWS RDS**: Managed PostgreSQL with automated backups, Multi-AZ failover. Alternative: self-managed PostgreSQL (lower cost, higher ops burden).
- **AWS ElastiCache Redis**: Distributed session store, job queue, cache. Alternative: self-hosted Redis (cost savings, ops complexity).
- **ALB**: Layer 7 load balancing, HTTPS termination, sticky sessions for backend affinity. Alternative: Nginx if infrastructure is on-premises.
- **ECS**: Container orchestration. Alternative: bare EC2 instances (manual scaling), Kubernetes (higher complexity).

### 6.2 Environment Configuration

```bash
# Backend .env (sample)
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/teampulse
REDIS_URL=redis://redis-endpoint:6379/0
ENTRA_AUTHORITY=https://login.microsoftonline.com/{tenant}/v2.0
ENTRA_CLIENT_ID=...
ENTRA_CLIENT_SECRET=...
FRONTEND_URL=https://app.teampulse.example.com
LOG_LEVEL=info
NODE_ENV=production
SESSION_SECRET=... (random 32-char string)
```

### 6.3 Backups & Disaster Recovery

- **RDS Automated Backups**: Daily, retained for 30 days (provisional retention, noted in open decisions).
- **Point-in-time Recovery**: Enabled; RPO <1 hour (provisional).
- **Disaster Recovery Plan**: RTO <4 hours (provisional). In event of region failure, failover to standby RDS replica in alternate AZ.
- **No backup of survey_notification tokens**: tokens are not backed up separately; if DB is restored, previously-sent tokens are re-playable (acceptable since responses are anonymous).

---

## 7. Monitoring & Observability

### 7.1 Metrics (Proposal: Prometheus + Grafana)

**Application Metrics**:
- `http_requests_total` (by endpoint, status code, method)
- `http_request_duration_seconds` (histogram; latency SLO targets)
- `survey_responses_submitted_total` (by survey_id)
- `survey_notifications_sent_total` (by status: sent, delivered, bounced)
- `survey_notifications_pending` (count of queued deliveries)
- `database_query_duration_seconds` (slow query detection)
- `active_sessions` (gauge)

**Business Metrics**:
- `survey_response_rate_percent` (responses / invitations)
- `survey_completion_time_seconds` (p50, p95, p99)

### 7.2 Logging (Proposal: ELK Stack or CloudWatch)

**Structured Logging Format** (JSON):
```json
{
  "timestamp": "2025-08-12T14:32:10.123Z",
  "level": "info",
  "service": "backend",
  "request_id": "req-abc123",
  "message": "survey_created",
  "survey_id": "survey-xyz",
  "team_id": "team-abc",
  "created_by": "user-def",
  "action": "create_survey"
}
```

**Log Levels**:
- `error`: API errors, database failures, auth failures
- `warn`: rate limit exceeded, invalid input
- `info`: survey actions (created, launched, closed), notification dispatch
- `debug`: request headers, query execution (development only)

### 7.3 Alerting (Proposal: PagerDuty or AWS SNS)

**Alerts** (trigger page/escalation):
- Database unavailable (health check fails)
- API error rate >1% for 5 minutes
- Response submission endpoint latency p99 >5 seconds
- Notification delivery failure rate >5%
- Disk usage on RDS >80%

**Non-urgent notifications** (Slack):
- Daily summary: surveys created, responses submitted, response rates
- Weekly: top questions by engagement, low response rate surveys

---

## 8. Security Implementation Details

### 8.1 Input Validation & Sanitization

**Question Creation**:
- Max 7 questions per survey (enforced at API)
- Question text max 500 chars (provisional)
- Multiple-choice options: max 10 options, max 100 chars each (provisional)

**Response Submission**:
- Likert responses: must be integer 1-10 (for 1-10 scale) or 1-5 (for 1-5 scale)
- Multiple-choice: value must match one of question's defined options
- Free-text: sanitize HTML (DOMPurify), max 2000 chars (provisional)

**Team Member Bulk Upload**:
- CSV parsing: max 500 rows (provisional)
- Email validation: RFC 5322 format, checked against Entra ID directory
- Reject duplicate emails in upload

### 8.2 HTTPS & TLS

- All traffic encrypted in transit (TLS 1.3)
- Certificate from Let's Encrypt or AWS Certificate Manager
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 8.3 Rate Limiting

**Endpoints**:
- `/api/surveys/token/{token}/submit`: 1 request per token; 100 requests/minute per IP (provisional)
- `/api/auth/login`: 10 login attempts per IP per hour (provisional)
- `/api/entra/search`: 30 searches per user per hour (provisional)
- All other authenticated endpoints: 1000 requests/minute per user (provisional)

Implementation via `express-rate-limit` middleware.

### 8.4 CORS

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://app.teampulse.example.com', 'https://staging.teampulse.example.com'],
  credentials: true, // allow cookies
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
```

---

## 9. API Specifications (Detailed)

### 9.1 Manager APIs

#### Create Survey
```
POST /api/surveys
Content-Type: application/json
Authorization: Bearer {oidc_session}

Request:
{
  "name": "Q3 Team Health",
  "description": "Checking in on team morale and workload",
  "team_id": "team-uuid",
  "recurrence_type": "weekly",
  "start_at": "2025-08-19T09:00:00Z",
  "end_at": "2025-08-26T09:00:00Z",
  "questions": [
    {
      "order": 1,
      "type": "likert",
      "text": "How would you rate team morale this week?",
      "required": true,
      "options": { "scale": 10 }
    },
    {
      "order": 2,
      "type": "multiple_choice",
      "text": "What's your biggest blocker right now?",
      "required": false,
      "options": [
        { "id": "opt1", "label": "Unclear requirements" },
        { "id": "opt2", "label": "Technical debt" },
        { "id": "opt3", "label": "Insufficient resources" }
      ]
    },
    {
      "order": 3,
      "type": "free_text",
      "text": "Any other feedback?",
      "required": false
    }
  ]
}

Response (201 Created):
{
  "id": "survey-uuid",
  "name": "Q3 Team Health",
  "status": "draft",
  "team_id": "team-uuid",
  "created_by": "user-uuid",
  "created_at": "2025-08-12T14:32:10Z",
  "questions": [...]
}
```

#### Launch Survey
```
POST /api/surveys/{id}/launch
Authorization: Bearer {oidc_session}

Response (200 OK):
{
  "id": "survey-uuid",
  "status": "active",
  "notifications_queued": 12,
  "started_at": "2025-08-19T09:00:00Z"
}
```

#### Get Survey Results
```
GET /api/surveys/{id}/results?from=2025-07-12&to=2025-08-12
Authorization: Bearer {oidc_session}

Response (200 OK):
{
  "survey_id": "survey-uuid",
  "survey_name": "Q3 Team Health",
  "team_id": "team-uuid",
  "total_invitations": 12,
  "total_responses": 8,
  "response_rate": 0.667,
  "questions": [
    {
      "id": "question-1",
      "order": 1,
      "type": "likert",
      "text": "How would you rate team morale this week?",
      "current_average": 4.2,
      "current_count": 8,
      "previous_average": 3.9,
      "delta": 0.3,
      "trend": [
        { "date": "2025-08-19", "average": 4.1, "count": 8 },
        { "date": "2025-08-12", "average": 3.9, "count": 9 }
      ]
    }
  ]
}
```

#### Add Team Members
```
POST /api/teams/{team_id}/members
Authorization: Bearer {oidc_session}
Content-Type: application/json

Request:
{
  "emails": ["alice@company.com", "bob@company.com"]
}

Response (200 OK):
{
  "added": ["alice@company.com"],
  "already_member": ["bob@company.com"],
  "not_found": []
}
```

#### Bulk Upload Team Members
```
POST /api/teams/{team_id}/members/upload
Authorization: Bearer {oidc_session}
Content-Type: multipart/form-data

Request:
multipart file: teams.csv
  alice@company.com
  bob@company.com
  charlie@company.com

Response (200 OK):
{
  "processed": 3,
  "added": 2,
  "already_member": 1,
  "errors": []
}
```

### 9.2 Anonymous Survey API

#### Get Survey Form
```
GET /api/surveys/token/{token}

Response (200 OK):
{
  "survey_id": "survey-uuid",
  "survey_name": "Q3 Team Health",
  "team_name": "Platform Team",
  "manager_name": "Sarah Chen",
  "description": "Checking in on team morale...",
  "expires_at": "2025-08-26T09:00:00Z",
  "questions": [
    {
      "id": "question-1",
      "order": 1,
      "type": "likert",
      "text": "How would you rate team morale this week?",
      "required": true,
      "options": { "scale": 10 }
    },
    ...
  ]
}
```

#### Submit Responses
```
POST /api/surveys/token/{token}/submit
Content-Type: application/json

Request:
{
  "responses": [
    {
      "question_id": "question-1",
      "answer": { "type": "number", "value": 8 }
    },
    {
      "question_id": "question-2",
      "answer": { "type": "choice", "value": "opt1" }
    },
    {
      "question_id": "question-3",
      "answer": { "type": "text", "value": "Great work this sprint!" }
    }
  ]
}

Response (200 OK):
{
  "message": "Thank you for your feedback",
  "submitted_at": "2025-08-12T15:22:45Z"
}

Error (410 Gone) if token already used:
{
  "error": "survey_already_completed",
  "message": "This survey link has already been used. Thank you for your response."
}

Error (403 Forbidden) if survey is closed:
{
  "error": "survey_closed",
  "message": "This survey has ended."
}
```

### 9.3 Authentication API

#### Login Redirect
```
GET /api/auth/login

Response (302 Found):
Location: https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize?
  client_id=...&
  scope=openid+profile+email&
  response_type=code&
  redirect_uri=https://app.teampulse.example.com/api/auth/callback
```

#### OIDC Callback
```
GET /api/auth/callback?code={auth_code}&state={state}

Response (302 Found):
Location: https://app.teampulse.example.com/manager
Set-Cookie: session={encrypted_session_id}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

#### Logout
```
POST /api/auth/logout
Authorization: Bearer {oidc_session}

Response (200 OK):
Set-Cookie: session=; Max-Age=0
{
  "message": "Logged out successfully"
}
```

---

## 10. Open Technical Decisions

| Decision | Options | Impact | Notes |
|----------|---------|--------|-------|
| **Email/Slack Delivery Service** | (1) SendGrid / AWS SES (managed), (2) self-hosted SMTP, (3) Slack API for native messaging | Affects notification latency, cost, ops overhead | Provisional: assume SendGrid (managed, low ops). V1 may start with email only; Slack integration can be added. |
| **Background Job Scheduler** | (1) Bull (Redis queue), (2) node-cron (in-process), (3) AWS SQS + Lambda | Affects reliability, distribution, scaling | Provisional: Bull with Redis. Rationale: job persistence, retry, monitoring. Alternative: node-cron for prototyping; scales to Bull later. |
| **Session Storage** | (1) Redis (distributed), (2) in-memory (single-process), (3) PostgreSQL (durable) | Affects multi-instance scaling, failover | Provisional: Redis. Rationale: fast, distributed, already used for Bull. Alternative: in-memory for dev, upgrade to Redis for production. |
| **Caching Layer** | (1) Redis, (2) Memcached, (3) CDN only (CloudFront), (4) in-memory (Node.js) | Affects dashboard latency, load on DB | Proposal: use Redis (already required for Bull/sessions). Cache aggregated survey results (30-min TTL). Alternative: no caching in V1; profile and add if needed. |
| **Rate Limiting** | (1) express-rate-limit (in-process), (2) Redis-backed (distributed), (3) API Gateway (AWS ALB) | Affects per-instance enforcement, multi-instance coordination | Provisional: express-rate-limit for V1 (simple, no external dependency). Upgrade to Redis-backed if multi-instance coordination needed. |
| **Monitoring Backend** | (1) Prometheus + Grafana, (2) AWS CloudWatch, (3) Datadog, (4) New Relic | Affects observability, cost, vendor lock-in | Proposal: CloudWatch (AWS native, minimal extra config). Alternative: Prometheus (self-hosted, open-source). Defer Datadog/New Relic until scale demands advanced features. |
| **Container Registry** | (1) AWS ECR, (2) Docker Hub, (3) GitHub Container Registry | Affects image storage, CI/CD integration | Proposal: ECR (AWS native). Alternative: GitHub Container Registry (free, GitHub integrated). |
| **Infrastructure as Code** | (1) Terraform, (2) CloudFormation (AWS native), (3) Kubernetes YAML | Affects deployment reproducibility, vendor lock-in | Proposal: Terraform (cloud-agnostic, readable). Alternative: CloudFormation (AWS-native, simpler for single-region). |
| **Notification Retry Logic** | (1) Exponential backoff (1m, 5m, 30m), (2) fixed delay (5m every hour), (3) no retry | Affects delivery reliability, queue buildup | Provisional: exponential backoff (1m, 5m, 30m). Rationale: handles transient failures, doesn't overwhelm providers. Alternative: fixed delay if simpler logic preferred. |
| **Data Partitioning** | (1) Partition survey_response by survey_id (post-V1), (2) no partitioning | Affects dashboard query performance at scale | Provisional: defer to post-V1. No partitioning in V1; monitor performance. Implement if dashboard queries exceed latency SLO. |
| **CSV Export Pagination** | (1) return all rows (large download), (2) paginated API with cursor, (3) stream response | Affects UX, memory usage, latency | Provisional: return all rows in V1 (assume <10k responses per survey). Pagination/streaming if export grows beyond 10k rows. |
| **Free-Text Sanitization** | (1) DOMPurify (client + server), (2) bleach (server Python), (3) custom regex | Affects XSS prevention, performance | Proposal: DOMPurify on client (UX), `pg-promise` parameterization on server (prevents SQL injection). Alternative: server-only sanitization if client-side deemed redundant. |
| **Token Generation** | (1) crypto.randomBytes (Node.js), (2) UUID v4, (3) hash(email + secret + timestamp) | Affects token entropy, collision resistance | Proposal: crypto.randomBytes(32).toString('hex') (64 chars, 256-bit entropy, cryptographically secure). Alternative: UUID v4 if simpler; lower entropy but sufficient for notification tokens. |
| **Temporary Session Storage** | (1) PostgreSQL response_session table, (2) Redis, (3) in-memory Map (single-process) | Affects persistence, distribution, cleanup | Provisional: response_session table (durable). Cleaned up after submission or on 1-hour expiry. Alternative: Redis if in-memory not acceptable. |
| **Audit Log Retention** | (1) 1 year (provisional), (2) 90 days, (3) 3 years | Affects storage, compliance, historical analysis | Provisional: 1 year. Rationale: covers typical audit window; 3 years if legal/compliance mandates. Decision in open; review with legal. |
| **Response Session TTL** | (1) 1 hour (provisional), (2) 30 minutes, (3) 24 hours | Affects how long user can "pause" form without losing data | Provisional: 1 hour. Rationale: balances UX (form state persisted) and privacy (no session data lingering). Local storage on client also used; session is backup only. |
| **Survey End Date Behavior** | (1) Reject responses after end_at timestamp, (2) silent ignore (don't insert), (3) queue for manual review | Affects late submissions, response count accuracy | Provisional: reject with 403 error. Rationale: clear to user; accurate counts. Alternative: silent ignore if error messages deemed confusing. |
| **Notification Delivery Retry Exhaustion** | (1) Mark notification as failed, alert ops, (2) re-queue indefinitely, (3) drop silently | Affects notification reliability, bounce handling | Provisional: mark as failed after 5 retries (1hr elapsed). Log to audit_log for ops investigation. Rationale: prevents queue overflow; allows manual retrigger. |
| **Entra ID Directory Caching** | (1) Cache with 1-hour TTL (provisional), (2) cache with 24-hour TTL, (3) no caching (live search) | Affects search latency, Entra ID API quota | Proposal: 1-hour cache in Redis. Rationale: user search responsive, quota-friendly. Alternative: no cache if Entra ID quota abundant. |

---

## 11. Frontend & UX Specifications

### 11.1 Manager Portal Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Logo  │  Logout                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Surveys]  [Team Settings]                                 │
│                                                              │
├──────────────────┬──────────────────────────────────────────┤
│  Surveys List    │  Survey Details / Results                │
│                  │                                          │
│  □ Q3 Morale     │  Q3 Team Health                         │
│  □ Q2 Health     │  Team: Platform (12 members)           │
│  □ Q1 Review     │  Status: Active                         │
│                  │  Launch: Aug 19, 2025                  │
│                  │  Responses: 8 of 12                    │
│                  │                                          │
│                  │  [Trend Chart] (Likert responses)       │
│                  │  [Distribution] (Multiple choice)       │
│                  │                                          │
│                  │  [Export] [Close] [Duplicate]           │
│                  │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### 11.2 Survey Form (Engineer)

```
┌─────────────────────────────────────────────────────────────┐
│  Team Pulse    X                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Q3 Team Health                                             │
│  From: Platform Team (Manager: Sarah Chen)                  │
│                                                              │
│  Question 2 of 7                                            │
│  [===========-----]  Progress bar                           │
│                                                              │
│  How would you rate team morale this week?                  │
│  ○ 1  ○ 2  ○ 3  ○ 4  ○ 5  ○ 6  ○ 7  ○ 8  ○ 9  ○ 10        │
│       (1=Low)                         (10=High)             │
│                                                              │
│  [Continue]  [Back]                                        │
│                                                              │
│  Your responses are completely anonymous.                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Dashboard Results

```
┌─────────────────────────────────────────────────────────────┐
│  Q3 Team Health Results                                      │
│  Date Range: Last 4 weeks  [Dropdown]                        │
│  Survey: Q3 Team Health  [Dropdown]                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Overview: 8 of 12 responses (67%)                          │
│                                                              │
│  Question 1: Morale (1-10)                                  │
│  Current: 4.2 / 10  ↑ 0.3 from last week                    │
│  [Line Chart: trend over 4 weeks]                           │
│  Responses: 8 | Min: 2 | Max: 9                            │
│                                                              │
│  Question 2: Biggest Blocker                                │
│  [Pie Chart: % distribution across options]                 │
│  • Unclear requirements: 5 (62%)                            │
│  • Technical debt: 2 (25%)                                  │
│  • Insufficient resources: 1 (13%)                          │
│                                                              │
│  Question 3: Additional Feedback                            │
│  [Paginated list of anonymized free-text responses]        │
│  • "Great sprint overall"                                   │
│  • "Need better documentation"                              │
│  • "Team collaboration is strong"                           │
│                                                              │
│  [Export CSV]  [Close Survey]  [Duplicate]                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| **Privacy breach: response attribution** | Low | Critical | Schema separation (survey_response has no user_id); code review; no admin override APIs. Audit: token linkage tests. |
| **Entra ID outage** | Low | High | Graceful fallback: manual CSV team upload. Cache directory for 1 hour. |
| **High notification volume (email/Slack flood)** | Medium | Medium | Rate limiting on notification queue; stagger delivery (spread over 5-min window). Proposal: queue job distribution. |
| **Response form data loss** | Low | Medium | Client-side local storage; server session table. If session lost, form re-renders fresh (user re-enters). |
| **Database query performance on dashboard** | Medium | High | Indexes on (survey_id, submitted_at); aggregation caching (30-min TTL); post-V1 partitioning. Load test with 10k responses. |
| **Token reuse (engineer submits twice)** | Low | Low | POST is idempotent; response-submission endpoint validates token_used. Second submit returns 410 (no duplicate). |
| **XSS in free-text responses** | Medium | High | DOMPurify client-side; parameterized queries server-side; escaping on display. |
| **CSRF on survey creation** | Low | High | CSRF tokens on all state-changing forms; SameSite cookie flag. |
| **Accidental respondent ID in logs** | Medium | Critical | No logging of user_id with response submission. Code review: grep for "response" logs. Audit logs sanitized. |

---

## 13. Testing Strategy

### 13.1 Unit Tests
- API request validation (Zod schemas)
- Token generation entropy
- Response aggregation logic (avg, count, distribution)
- Sanitization functions (DOMPurify, SQL params)

### 13.2 Integration Tests
- End-to-end survey creation → notification → response → dashboard
- Entra ID login flow (mock OIDC provider)
- Database anonymity: response inserted without user_id; subsequent queries don't join user table
- Token expiry: submitted responses after end_at rejected
- Rate limiting: exceed threshold, receive 429

### 13.3 Privacy Audit
- Schema review: no user_id in survey_response, no IP logging
- Code review: no token correlation in response submission path
- Trace: response data flow from submission to dashboard; no identity leak

### 13.4 Performance Tests
- Load test: 50 concurrent survey submissions (target <1s latency p99)
- Dashboard query: retrieve 1000 responses, aggregate, render (target <3s p99)
- Notification dispatch: queue 100 notifications, deliver within 5 minutes

### 13.5 Accessibility Tests
- WCAG 2.1 AA compliance: axe, Lighthouse, manual screen reader testing
- Keyboard nav: survey form navigable without mouse
- Color contrast: all text ≥4.5:1 ratio

---

## 14. Implementation Roadmap (Post-Architecture)

### Phase 1: MVP (Weeks 1–8)
- Core survey creation & launch
- Anonymous form submission
- Basic dashboard (trend chart, response count)
- Entra ID OIDC login
- Email notifications (no Slack yet)
- Single-team MVP (no cross-team features)

### Phase 2: Hardening (Weeks 9–12)
- Privacy audit & compliance review
- Performance optimization (caching, indexing)
- Monitoring & alerting setup
- Documentation (API, deployment)
- User testing & UX refinement

### Phase 3: Features (Weeks 13+)
- Slack notifications
- Survey templates library
- CSV export
- Reminder notifications
- Free-text aggregation (word cloud / themes)

### Phase 4: Scale (Post-V1)
- Multi-team dashboards
- Response data partitioning
- Advanced filtering (cohort analysis, by tenure)
- Sentiment analysis on free-text
- API integrations (third-party survey import)

---

## 15. Compliance & Legal Considerations

### 15.1 GDPR
- **Lawful Basis**: Legitimate interest (manager assessing team health) with consent (employees agree to survey).
- **Data Processing**: Responses are anonymous; no PII retained. Notification records (user_id, email) are necessary for delivery; retention: 6 months (provisional).
- **Right to be Forgotten**: No specific request needed; survey_notification rows are deleted on user account deletion. Responses already anonymous.

### 15.2 CCPA
- **Consumer Rights**: No personal information retained in responses; notification delivery necessary for service.
- **Opt-out**: Engineers may decline survey (optional participation); no enforcement or penalty.

### 15.3 Audit & Compliance
- Audit logs: all survey creation, modification, export by manager retained for 1 year.
- No override mechanism: admins cannot view individual responses, even for compliance investigation. (Supports privacy guarantee but may conflict with some org policies; clarify with legal.)
- Data retention policy: responses purged after 2 years; notification logs after 6 months.

---

## 16. Glossary & Abbreviations

| Term | Definition |
|------|-----------|
| **OIDC** | OpenID Connect (authentication protocol) |
| **Entra ID** | Microsoft Azure Active Directory (identity provider) |
| **SPA** | Single-Page Application (React frontend) |
| **SSO** | Single Sign-On |
| **JWT** | JSON Web Token (not used here; OIDC handles session) |
| **RPO** | Recovery Point Objective (max data loss tolerance) |
| **RTO** | Recovery Time Objective (max downtime tolerance) |
| **SLA** | Service Level Agreement (uptime commitment) |
| **Bull** | Job queue library for Node.js (using Redis) |
| **CDN** | Content Delivery Network (caching layer) |
| **ALB** | AWS Application Load Balancer |
| **ECS** | AWS Elastic Container Service |
| **RDS** | AWS Relational Database Service |
| **XSS** | Cross-Site Scripting (security vulnerability) |
| **CSRF** | Cross-Site Request Forgery (security attack) |
| **TLS** | Transport Layer Security (HTTPS encryption) |
| **HSTS** | HTTP Strict Transport Security (security header) |
| **WCAG** | Web Content Accessibility Guidelines |
| **PII** | Personally Identifiable Information |
| **TTL** | Time to Live (cache/session expiry) |

---

## 17. Appendix: Sample Database Queries

### Query 1: Fetch Survey Results for Dashboard

```sql
SELECT
  q.id,
  q."order",
  q.type,
  q.text,
  COUNT(sr.id) as response_count,
  ROUND(AVG((sr.answer_value->>'value')::float), 2) as avg_score,
  DATE_TRUNC('day', sr.submitted_at) as response_date
FROM question q
LEFT JOIN survey_response sr ON q.id = sr.question_id
WHERE q.survey_id = $1
GROUP BY q.id, q."order", q.type, q.text, response_date
ORDER BY q."order", response_date DESC;
```

### Query 2: Fetch Response Count (No Identity)

```sql
SELECT
  COUNT(DISTINCT response_session.id) as total_responses,
  (SELECT COUNT(DISTINCT user_id) FROM team_member WHERE team_id = $1) as total_invitations
FROM response_session rs
JOIN survey s ON rs.survey_id = s.id
WHERE s.id = $1;
```

### Query 3: Purge Expired Response Sessions

```sql
DELETE FROM response_session
WHERE session_expires_at < NOW();
```

### Query 4: Audit Trail: Surveys Created by Manager

```sql
SELECT
  al.timestamp,
  al.action,
  s.name,
  s.id
FROM audit_log al
JOIN survey s ON al.resource_id = s.id
WHERE al.user_id = $1 AND al.action = 'create_survey'
ORDER BY al.timestamp DESC
LIMIT 20;
```

---

## 18. Conclusion

TeamPulse is an architecturally sound anonymous survey system that prioritizes privacy through schema separation, token-based delivery, and explicit absence of tracking mechanisms. The design is scalable to 100+ teams and 1000+ engineers, resilient via multi-AZ RDS and distributed backend services, and secure through OIDC, HTTPS, rate limiting, and input validation.

The core guarantee—**zero response attribution**—is enforced at the schema layer (survey_response has no user_id), validated via code review, and audited via automated tests. All open technical decisions are noted with provisional values and alternatives, enabling teams to adjust deployment choices without disrupting the privacy-first architecture.

Implementation can proceed directly from this document; no major architectural unknowns remain.

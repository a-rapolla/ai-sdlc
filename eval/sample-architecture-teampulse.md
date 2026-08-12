# TeamPulse Architecture Document

## 1. System Overview

TeamPulse is a team health survey system that provides:
- **Engineers**: Link-based access to recurring pulse surveys (no login required)
- **Managers**: Aggregate trend dashboards for assigned teams via SSO
- **Admins**: System health visibility without response attribution
- **Guarantee**: Complete anonymity of individual responses, enforced at the schema and application layer

The system manages three core flows:
1. **Survey Distribution**: Scheduled notifications (email/Slack) with anonymized survey links
2. **Response Capture**: Anonymous response collection and storage
3. **Aggregation & Visualization**: Manager dashboard showing trends per team

---

## 2. Architecture Layers

### 2.1 Frontend

**Engineer Survey Form**
- Server-side rendered HTML with progressive enhancement (functional without JavaScript)
- Responsive design targeting mobile-first (iPhone 12, 4G reference device)
- Framework: **React (TypeScript)** [proposed; rationale: CSR component state for form validation, rich interactivity on dashboard; alternatives: Vue or vanilla HTML+Htmx if SSR-only is preferred]
- Form library: **React Hook Form** [proposed; rationale: minimal bundle size for mobile, easy validation integration; alternative: Formik if more complex state needed]
- HTTP client: **Fetch API with native retry logic**
- Survey link format: `https://[host]/survey/[token]` where `token = hmac_sha256(survey_id + random_salt)` (no encoded user/email)

**Manager Dashboard**
- CSR React application with TypeScript
- Chart library: **Recharts** [proposed; rationale: React-native, minimal dependencies, supports trend lines with error bars; alternatives: D3.js (more control, higher complexity), Victory, Apache ECharts]
- State management: **React Context + hooks** for filters/time range (persisted to URL query params, not localStorage)
- Dashboard components:
  - Trend line chart (Likert scale mean ± 1σ, multiple-choice stacked bar)
  - Response rate card ("X of Y responded")
  - Filters: team (if multi-team), time range, sort order
  - Prior-period comparison display
- Real-time refresh: On-demand + automatic 5-minute polling (WebSocket not required; polling acceptable for manager use case)

**Shared Components**
- WCAG 2.1 Level AA compliance (semantic HTML, contrast ≥4.5:1, keyboard navigation, ARIA labels)
- Accessibility testing: **axe DevTools or WAVE** [proposed; rationale: automated accessibility checks; alternative: manual WCAG audits]

### 2.2 Backend

**API Layer**
- Framework: **Express.js (Node.js)** [proposed; rationale: lightweight, SSO/OIDC middleware ecosystem, matches team skill set naming in PRD; alternatives: Fastify (higher throughput), Nest.js (more structure)]
- Language: **TypeScript** for type safety across stack
- HTTP: HTTPS with TLS 1.2+ enforced

**Core Endpoints**

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/survey/:token/get` | GET | None (token-based) | Return survey questions for engineer |
| `/api/survey/:token/submit` | POST | Token validation | Submit survey response |
| `/api/manager/dashboard` | GET | Entra ID OIDC | Return aggregated results for user's teams |
| `/api/manager/team/:teamId/config` | GET/PUT | Entra ID + team owner | Survey settings (frequency, questions, roster) |
| `/api/admin/health` | GET | Admin role | System health metrics (no response data) |

**OIDC & Session Management**
- OIDC library: **passport-azure-ad** [proposed; rationale: native Entra ID support; alternative: MSAL.js server-side]
- Session store: **Redis** [proposed; rationale: fast, distributed across replicas; alternative: PostgreSQL session store if Redis unavailable]
- Session timeout: 30 minutes inactivity (PRD specified)
- Token expiry: 8 hours (refresh token 30 days per PRD)
- CSRF protection: **Double-submit cookie pattern** (synchronizer token not required for SPA with HTTPS-only cookies) [proposed; alternatives: SameSite=Strict cookies, stateful token store]

**Request Validation & Rate Limiting**
- Input validation: **Joi or Zod** [proposed; rationale: schema-based validation preventing XSS/SQL injection at boundary; alternative: manual validation functions]
- Rate limiting: **redis-rate-limit or node-rate-limiter-flexible** [proposed; rates per PRD:
  - Survey submissions: 10 per unique token (enforced client-side + server-side)
  - Dashboard loads: 100 per manager per minute
  - Notification sends: 5 per team per minute
  - Alternative: In-process memory limiting if Redis unavailable (trade-off: not distributed across replicas)]

### 2.3 Database Layer

**Primary Datastore: PostgreSQL**

**Anonymization Schema**

```sql
-- No user_id or email column; no foreign key to engineers/users table
CREATE TABLE survey_responses (
    survey_id UUID NOT NULL,
    anonymized_response_id UUID NOT NULL PRIMARY KEY (generated at insert),
    team_id UUID NOT NULL,
    
    -- Question responses (7 columns for up to 7 questions)
    q1_response INT,  -- Likert: 1-5 or NULL if not answered
    q2_response INT,
    q3_response INT,
    q4_response INT,
    q5_response INT,
    q6_response INT,
    q7_response INT,
    -- Multiple-choice stored as option_index (0-5)
    
    submitted_at_hour TIMESTAMP NOT NULL,  -- Precision: hour only, no minutes/seconds
    browser_class VARCHAR(20),  -- 'mobile' | 'tablet' | 'desktop'
    
    UNIQUE(survey_id, anonymized_response_id),
    INDEX(survey_id, team_id, submitted_at_hour)
);

CREATE TABLE surveys (
    survey_id UUID PRIMARY KEY,
    team_id UUID NOT NULL,
    frequency VARCHAR(20),  -- 'weekly' | 'bi-weekly'
    scheduled_day INT,  -- 0-6 (Monday-Sunday)
    scheduled_time TIME,
    scheduled_timezone VARCHAR(50),
    
    questions JSONB,  -- Array of {id, type, text, options[], scale_labels[]}
    
    notification_channels JSON,  -- {email: bool, slack: bool, slack_channel?: string}
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX(team_id, created_at)
);

CREATE TABLE teams (
    team_id UUID PRIMARY KEY,
    manager_id VARCHAR(255),  -- Entra ID ObjectId
    team_name VARCHAR(255),
    roster JSON,  -- Array of {email, added_at, removed_at}
    
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX(manager_id)
);

-- Notification tracking (NOT linked to responses)
CREATE TABLE notification_log (
    id UUID PRIMARY KEY,
    survey_id UUID NOT NULL,
    team_id UUID NOT NULL,
    notification_type VARCHAR(20),  -- 'email' | 'slack'
    sent_at TIMESTAMP,
    status VARCHAR(20),  -- 'sent' | 'failed' | 'bounced'
    retry_count INT,
    
    -- NO email, user_id, or response_id stored
    
    INDEX(survey_id, sent_at)
);

-- Audit log for anonymity verification
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    action VARCHAR(100),  -- 'response_submitted' | 'query_dashboard' | 'config_updated'
    user_id VARCHAR(255),  -- Entra ID for managers/admins only
    resource_type VARCHAR(50),  -- 'survey_responses' | 'dashboard'
    resource_id UUID,
    details JSONB,
    
    created_at TIMESTAMP,
    
    INDEX(created_at, action)
);
```

**Anonymity Enforcement**
- No foreign key from `survey_responses` → `teams` or users table
- No application code path queries responses joined to user identifiers
- Notification log stores survey_id + team_id but never recipient email within response context
- Audit log tracks actions (e.g., "response_submitted") but not which response or engineer

**Indexes for Performance (PRD target: 500ms for 12-cycle dashboard)**
- `survey_responses(survey_id, team_id, submitted_at_hour)` - dashboard aggregation
- `surveys(team_id, created_at)` - manager config retrieval
- `notification_log(survey_id, sent_at)` - delivery verification
- `audit_log(created_at, action)` - compliance audits

**Query Patterns**
```sql
-- Dashboard aggregation (no joins to users)
SELECT 
    survey_id,
    AVG(q1_response) as q1_mean,
    STDDEV_POP(q1_response) as q1_stddev,
    COUNT(*) as response_count
FROM survey_responses
WHERE team_id = $1 AND survey_id IN (SELECT survey_id FROM surveys WHERE team_id = $1 ORDER BY created_at DESC LIMIT 12)
GROUP BY survey_id;

-- Manager cannot execute queries linking responses to individuals
-- Application layer prevents all joins to teams.roster, users tables
```

**Backup Strategy**
- **Automated daily backups** (PRD: 30-day retention) to object storage (S3/Azure Blob) [proposed; alternatives: managed backup service]
- Backups include anonymized responses unmodified (no restoration of identifying data)
- Encryption at rest: **AES-256** [proposed; alternative: managed keys if cloud-native]
- RPO: ≤1 hour (provisional; PRD specifies)
- RTO: ≤4 hours (provisional; PRD specifies)

### 2.4 Message Queue & Async Processing

**Task Scheduler: Recurring Notification Dispatch**
- **APScheduler (Python) or node-schedule (Node.js)** [proposed; rationale: lightweight cron for survey scheduling; alternative: external job queue like Bull/BullMQ if decoupled workers needed]
- Frequency: Check for surveys to send every minute (provisional) [alternatives: 5-minute, 15-minute depending on desired granularity]
- Cron expression template: Built from manager's `scheduled_day`, `scheduled_time`, `scheduled_timezone`
- Missed survey detection: If scheduler misses a send window, queue backfill send immediately on next check (provisional logic)

**Notification Queue: Email & Slack Dispatch**
- Queue backend: **Redis (Bull or BullMQ)** [proposed; rationale: fast, persistent in-memory queue, supports retries and backoff; alternative: AWS SQS if prefer managed service, or RabbitMQ for higher throughput]
- Worker pool: **2-4 workers** [provisional; scale based on throughput testing]
- Job structure:
  ```json
  {
    "type": "send_notification",
    "survey_id": "uuid",
    "team_id": "uuid",
    "notification_channel": "email" | "slack",
    "recipient_email": "engineer@company.com",  // Used only for send; NOT persisted to responses
    "survey_link": "https://[host]/survey/[token]",
    "deadline": "2026-08-18T17:00:00Z",
    "created_at": "2026-08-12T09:00:00Z"
  }
  ```
- Retry strategy: **Exponential backoff (1s, 2s, 4s, 8s, ...)** up to 3 retries over 24 hours (PRD specified)
- Job TTL: 24 hours (jobs not completed or retried within 24h are marked failed and generate manager alert) [provisional]

**Notification Dispatch Flow**
1. Scheduler detects survey launch time
2. Fetch team roster from `teams.roster` (email addresses only)
3. For each engineer: Generate anonymized `token = hmac_sha256(survey_id + random_salt)`
4. Enqueue `send_notification` job with recipient_email + token
5. Worker sends email/Slack with link `https://[host]/survey/[token]`
6. Log delivery status to `notification_log` (survey_id, team_id, status) — **never email or response_id**
7. Engineer never tied to survey_id or response_id in any table

**Cleanup Tasks**
- **Token invalidation (14-day expiration)**: Daily batch job [proposed; alternatives: lazy evaluation on link click]
  ```sql
  UPDATE survey_links SET is_expired = true 
  WHERE created_at < NOW() - INTERVAL '14 days' AND is_used = false;
  ```
- **Notification log retention (30 days)**: Daily deletion job [provisional; PRD: 30 days]
  ```sql
  DELETE FROM notification_log WHERE sent_at < NOW() - INTERVAL '30 days';
  ```
- **Audit log retention (90 days)**: Nightly archival to cold storage [provisional; PRD: 90 days]

### 2.5 Email & Notification Providers

**Email Service**
- Provider: **AWS SES or SendGrid** (both named in PRD)
- [Proposal] Recommend **AWS SES** [rationale: cost-effective for bulk sends, native support for reply addresses, better for compliance; alternative: SendGrid for higher deliverability reputation if SES domain reputation low]
- Template engine: **Handlebars or Nunjucks** [proposed; rationale: simple variable substitution without executing logic; alternatives: EJS, Pug]
- Email format: Plain text + HTML MIME multipart
- Reply-To: Disabled (noreply@teamPulse.[company domain], no reply handling)
- DKIM/SPF: Configured on domain (infrastructure responsibility)
- Bounce handling: Webhook to update `teams.roster[*].bounced_at` [provisional implementation detail]

**Slack Integration**
- **Slack API v2 (slack-bolt-js)** [proposed; rationale: official SDK, easy middleware; alternative: REST API calls]
- App permissions required: `chat:write`, `channels:read`, `users:read`
- Channel validation: Pre-check channel exists before enqueueing notification (fails gracefully with manager alert if channel not found)
- Bot name: "TeamPulse Bot"
- Message format: Plain text with link (no rich blocks in V1 for simplicity)

---

## 3. Privacy & Anonymity Guarantee

**Architectural Enforcement** (design prevents response attribution at all layers)

| Layer | Enforcement | Details |
|-------|-------------|---------|
| **Schema** | No identifier columns in responses | `survey_responses` table has no user_id, email, manager_id, or foreign key to users |
| **Notification Link** | Stateless token, no encoding | `token = hmac_sha256(survey_id + random_salt + timestamp_hour_salt)`, no user/email embedded |
| **Timestamp** | Hour-precision only | `submitted_at_hour` stored as TIMESTAMP truncated to hour boundary; prevents minute-level timing correlation |
| **IP Address** | Not stored | Timezone inferred from IP on request, used for scheduling display, then discarded (not persisted) |
| **Browser Classification** | Coarse only | Stored as 'mobile'/'tablet'/'desktop' bucket, not User-Agent string; no device fingerprinting |
| **Application Layer** | No join paths | All manager/admin queries select only from survey_responses, surveys, teams; no queries joining responses to user directory |
| **Audit Logging** | Action-level only | `audit_log` records "response_submitted" for survey_id, not "engineer X responded"; detects correlation attempts (e.g., admin querying for joins) |
| **Caching** | Response-level only | Cache does not store individual response mappings; only aggregated results (mean, count) per survey_id |
| **Backups** | Anonymized replica | Backups restore to anonymized state; no separate cleartext copy |

**Anonymity Verification Checklist**

- [ ] No column in any table links `anonymized_response_id` → `user_id` / `email` / `team.roster`
- [ ] No application code joins `survey_responses` to user directory (enforced by code review + static analysis) [proposed: linter rule to reject joins across schema boundary]
- [ ] Notification link format: `token = hmac(survey_id + random + hour_salt)`, verified by inspection
- [ ] Logs (application, database, audit) never output `email → response_id` mapping
- [ ] Cache entries store only aggregates (e.g., `{survey_id: 'x', q1_mean: 4.2}`) not individual response objects
- [ ] Quarterly audit: Code review of schema + application queries + logs to verify no new correlation paths exist

**Data Retention & Deletion**
- Responses retained indefinitely (provisional policy, see Open Technical Decisions)
- Engineer removal from team: Future surveys exclude removed engineer; past responses remain in database (already anonymized, no linked record to delete)
- Engineer deletion from Entra ID: No impact (responses never stored engineer Entra ID)
- Team deletion: Optionally purge `survey_responses` for deleted team (provisional; see Open Technical Decisions)
- GDPR data export request: Response is "No personal data is stored; responses are permanently anonymized and cannot be linked to you"
- GDPR deletion request: Response is "Your responses are anonymized and do not contain personal data; no identifier to delete"

---

## 4. Data Flow & System Integration

### 4.1 Survey Distribution Flow

```
┌─────────────────┐
│   Scheduler     │
│  (Every Minute) │
└────────┬────────┘
         │
         ├─ Query: SELECT * FROM surveys WHERE next_send_time <= NOW()
         │
         └─ For each survey:
            ├─ Fetch team.roster (emails only)
            ├─ For each engineer:
            │  ├─ Generate anonymized token = hmac_sha256(survey_id + random + hour_salt)
            │  ├─ Enqueue { survey_id, token, deadline, notification_channel }
            │  └─ (DO NOT store engineer email with response_id)
            │
            └─ Update survey.next_send_time to next scheduled interval

┌──────────────────┐
│  Notification    │
│    Queue (Redis) │
└────────┬─────────┘
         │
         ├─ Worker picks job
         ├─ Render email template: "Hi [Manager Name], 2-min pulse survey"
         ├─ Send email with link: /survey/[token]
         ├─ Log to notification_log: (survey_id, team_id, status)
         │  (NO email, engineer, or response_id stored)
         │
         └─ Success: notification_log.status = 'sent'
            Failure: Retry with exponential backoff (max 3 retries)
                     Manager alert: "Failed to notify X team members"
```

**Privacy Checkpoint**: Recipient email is used only in the queue job for send; once sent, email address is NOT persisted to any table. Notification log stores only `(survey_id, team_id, status)`.

### 4.2 Survey Response Flow

```
┌──────────────────┐
│  Engineer clicks │
│  /survey/[token] │
└────────┬─────────┘
         │
         ├─ Validate token: hmac_verify(token, survey_id + random + hour_salt)
         ├─ Check token not expired (>14 days old)
         ├─ Check token not already used
         ├─ Load survey questions from surveys table
         │
         └─ Render form (Server-side HTML or React SPA)

┌──────────────────┐
│  Engineer        │
│  Submits Form    │
└────────┬─────────┘
         │
         ├─ Validate: All required fields answered
         ├─ Server-side validation: Parse Likert (1-5) or multiple-choice (0-5)
         │
         └─ Insert into survey_responses:
            ├─ survey_id (from token validation)
            ├─ anonymized_response_id = UUID v4 (generated fresh)
            ├─ team_id (from survey record)
            ├─ q1_response, q2_response, ... (answers only, no identifier)
            ├─ submitted_at_hour = CURRENT_HOUR (not minute/second)
            ├─ browser_class = 'mobile' | 'tablet' | 'desktop'
            │
            └─ Mark token as used (if using stateful token store)

┌──────────────────┐
│  Response        │
│  Confirmation    │
└────────┬─────────┘
         │
         └─ Display: "Thanks for your feedback! Your response is anonymous..."
            (Auto-dismiss after 5s or engineer closes)
```

**Privacy Checkpoint**: No engineer identifier is stored or logged. The `anonymized_response_id` is a random UUID with no connection to the token or engineer. Even if token is compromised, it cannot be used to identify or retrieve the engineer's response.

### 4.3 Manager Dashboard Query Flow

```
┌─────────────────────┐
│  Manager logs in    │
│  (Entra ID OIDC)    │
└────────┬────────────┘
         │
         ├─ Extract Entra ID user ObjectId
         ├─ Query teams: SELECT team_id FROM teams WHERE manager_id = {ObjectId}
         │
         └─ Session created (8-hour token, 30-min idle timeout)

┌──────────────────────┐
│  Manager navigates   │
│  /manager/dashboard  │
└────────┬─────────────┘
         │
         ├─ Validate session (OIDC token still valid)
         ├─ Parse URL filters: ?team_id=X&timeRange=past_3_months
         │
         └─ Query aggregation (NO JOINS TO USER TABLE):
            ```sql
            SELECT 
                survey_id,
                AVG(q1_response) as q1_mean,
                STDDEV_POP(q1_response) as q1_stddev,
                COUNT(*) as response_count
            FROM survey_responses
            WHERE team_id = {manager_team} 
              AND survey_id IN (
                SELECT survey_id FROM surveys 
                WHERE team_id = {manager_team} 
                ORDER BY created_at DESC 
                LIMIT 12
              )
            GROUP BY survey_id
            ORDER BY survey_id DESC;
            ```

┌──────────────────────┐
│  Frontend renders    │
│  Trend charts        │
└────────┬─────────────┘
         │
         ├─ For each survey cycle:
         │  ├─ If response_count < 3: Display "Not enough responses (X received, min 3)"
         │  ├─ Else: Plot (survey_date, q1_mean ± 1σ) as line + error bars
         │  ├─ Stacked bar for multiple-choice (count or %)
         │  └─ Prior-period comparison: "This cycle: 4.2 vs. last: 4.1 (+0.1)"
         │
         └─ Display response rate: "12 of 15 responded (80%)"

┌──────────────────────┐
│  Auto-refresh every  │
│  5 minutes or manual │
│  "Refresh" button    │
└────────────────────┘
```

**Privacy Checkpoint**: Manager can only query aggregates for teams they manage. No individual responses are returned. No engineer names, emails, or identifiers appear in any query result.

---

## 5. Component Responsibilities

### 5.1 Frontend (React SPA + SSR)

**Survey Form (Engineer-facing)**
- Load: GET `/api/survey/{token}/get` → returns `{survey_id, team_id, questions: [{id, type, text, options}]}`
- Submit: POST `/api/survey/{token}/submit` → body: `{q1_response, q2_response, ..., q7_response}`
- Validation: Client-side (UX), server-side (enforced)
- Error handling: Retry logic for network timeouts, prevent double-submit via disabled button
- Accessibility: Semantic HTML, ARIA labels, keyboard navigation

**Manager Dashboard (Manager-facing, authenticated)**
- Load: GET `/api/manager/dashboard?team_id=X&timeRange=past_3_months` (requires valid OIDC session)
- Returns: `{surveys: [{survey_id, cycle_date, q1_mean, q1_stddev, q2_mean, ..., response_count, prior_q1_mean}], response_rate: {responded: 12, total: 15}}`
- Rendering: Recharts line charts with error bars, stacked bars for multiple-choice
- Filters: Persist to URL query params (no localStorage); reset on new session
- Auto-refresh: Polling every 5 minutes (WebSocket optional)

### 5.2 Backend (Express.js + Node.js)

**Survey Endpoint Handlers**
- `GET /api/survey/{token}/get` 
  - Validates token format and TTL
  - Returns survey questions (no engineer identifiers)
  - Returns `200` or `404`/`401` (token expired/invalid)
  
- `POST /api/survey/{token}/submit`
  - Validates token again (prevent replay)
  - Validates response schema (Likert 1-5, multiple-choice 0-5)
  - Inserts row into `survey_responses` (no email, user_id)
  - Marks token as used
  - Returns `200` with confirmation message or `400` (validation error)

**Manager Endpoint Handlers**
- `GET /api/manager/dashboard`
  - Validates OIDC session
  - Fetches manager's assigned teams from `teams` table
  - Runs aggregation query per team (no joins to user directory)
  - Returns aggregated results (mean, stddev, count)
  
- `GET /api/manager/team/{teamId}/config`
  - Validates manager owns team (via Entra ID membership)
  - Returns survey questions, frequency, roster, notification settings
  
- `PUT /api/manager/team/{teamId}/config`
  - Validates manager owns team
  - Updates surveys table (questions, frequency, notification_channels)
  - Changes apply to next survey cycle (no backfill)

**Admin Endpoint Handlers**
- `GET /api/admin/health`
  - Requires admin role (Entra ID group membership)
  - Returns system metrics: Queue depth, database connection pool, error rates (no response data)

### 5.3 Database Layer

**Responsibilities**
- Store anonymized responses (no identifier columns)
- Index by survey_id and team_id for fast aggregation
- Enforce schema constraints (no foreign keys to users)
- Support concurrent reads (dashboard queries) and writes (response submissions)
- Automatic daily backups (anonymized state preserved)

### 5.4 Message Queue & Scheduler

**Scheduler (node-schedule or APScheduler)**
- Parse manager's frequency/day/time + timezone
- Check every minute for surveys to send
- Enqueue notification jobs with anonymized tokens

**Worker Pool (Bull/BullMQ)**
- Dequeue notification jobs
- Send email (AWS SES) or Slack (Slack API)
- Log status to `notification_log` (NOT engineer email or response_id)
- Retry with exponential backoff (3 attempts max)

### 5.5 External Services

**Entra ID / OAuth 2.0 OIDC**
- Managers authenticate via company SSO
- Returns access token (8-hour expiry) + refresh token (30-day expiry)
- Extracts Entra ID ObjectId to determine manager's teams

**AWS SES or SendGrid**
- Sends survey invitation emails
- Template: Plain text + HTML
- Tracks bounces/hard failures via webhook (updates `teams.roster[*].bounced_at`)

**Slack API**
- Posts notifications to channel or DM
- Validates channel exists before sending
- Handles rate limiting (retries with backoff)

---

## 6. Performance & Scalability

### 6.1 Latency Targets (from PRD)

| Operation | Target | Measurement Conditions |
|-----------|--------|------------------------|
| Form load | ~1s | Survey form page load time |
| Form submit | ~2s | Click to confirmation page |
| Mobile form load | ~3s | 3G connection, iPhone 12 reference |
| Mobile submit | ~4s | 3G connection, iPhone 12 reference |
| Dashboard load (initial) | ~2s (p95) | 12 survey cycles, 7 questions |
| Chart rendering | ~500ms | Browser-side Recharts rendering |
| Dashboard query | ~500ms (p95) | Aggregation across 12 cycles per team |

### 6.2 Concurrency Limits (from PRD)

- **100 concurrent managers** (dashboard users)
- **1,000 concurrent engineers** (survey respondents)
- Performance degradation acceptable above these limits

### 6.3 Database Sizing

**Query Optimization**
- Primary index: `survey_responses(survey_id, team_id, submitted_at_hour)` for dashboard aggregation
- Expected row count: 1,000 teams × 15 team members × 52 weeks × 2 questions depth = ~1.5M rows/year (provisional sizing)
- Dashboard query (12 cycles, 7 questions): ~300-500ms on unindexed table; ~50-100ms with index (estimated)
- Connection pooling: **20-50 connections** [provisional; scale based on concurrent query load]

**Caching**
- **Redis cache** [proposed; rationale: dashboard aggregates are read-heavy and stable for 5 minutes; alternatives: in-process LRU if single-server, or skip if latency acceptable without]
- Cache key: `dashboard:{team_id}:{time_range}` (invalidate every 5 minutes or on-demand refresh)
- Cache TTL: 5 minutes [provisional]
- Cache miss: Regenerate from database query

### 6.4 Notification Throughput

**Email Dispatch**
- Capacity: 5 emails/minute per team [provisional; PRD specifies rate limit, not throughput]
- Worker threads: 2-4 [provisional; test under load]
- SES rate limit: Configurable per AWS account (default 14 emails/second for non-sandbox, typically sufficient)

**Slack Dispatch**
- Capacity: Slack API rate limit (typically 30+ requests/minute, sufficient for surveys)
- Retry: Exponential backoff on rate limits (1s, 2s, 4s)

### 6.5 Horizontal Scaling

**Stateless Design**
- Backend servers: No sticky sessions (OIDC session stored in Redis, accessible to all replicas)
- Message queue: Distributes jobs across worker pool (independent processes or containers)
- Database: Single PostgreSQL instance with read replicas (optional) for analytics queries

**Load Balancing**
- API Gateway or NGINX reverse proxy distributes traffic to backend replicas
- Health check: `/api/admin/health` endpoint responds within 100ms [provisional]

---

## 7. Security Architecture

### 7.1 Data Protection

**In Transit**
- HTTPS/TLS 1.2+ enforced on all endpoints (HSTS header recommended)
- Certificate: [proposed: AWS Certificate Manager or LetsEncrypt]

**At Rest**
- Database encryption: AES-256 [proposed; alternatives: managed keys via cloud provider]
- Backup encryption: AES-256 [proposed]
- Secrets management: **AWS Secrets Manager or HashiCorp Vault** [proposed; rationale: centralized rotation, audit logging; alternatives: environment variables in CI/CD secrets]

### 7.2 Authentication & Authorization

**Manager Authentication**
- OIDC via Entra ID (OAuth 2.0 authorization code flow)
- Token validation: Verify signature, expiry, audience
- Session management: Redis-backed sessions, 30-minute idle timeout, 8-hour hard expiry

**Engineer Authentication**
- No login required
- Token-based access: HMAC-signed URL token, single-use or 14-day expiry (PRD specifies single-use after submission + 14-day expiration)
- Token format: `hmac_sha256(survey_id + random_salt + hour_salt)` (no embedded user info)

**Admin Authentication**
- SSO via Entra ID
- Role check: Entra ID group membership (e.g., "TeamPulse-Admin")

### 7.3 Authorization

**Manager Access Control**
- Query RBAC: Manager can only view teams in their Entra ID group (e.g., "engineering-manager-team-A")
- Mutation control: Manager can only edit configuration for assigned teams
- Database-level enforcement: WHERE clause filters by manager's teams (no SELECT * allowed)

**Admin Access Control**
- System health only (no response data)
- Audit log access: Admin can query `audit_log` to detect correlation attempts
- Configuration management: Admins manage team/manager assignments

### 7.4 Input Validation & Output Encoding

**Input Validation**
- Schema validation: **Joi or Zod** [proposed]
  - Survey token: Format match `^[a-z0-9]{64}$` (HMAC output)
  - Likert response: Integer 1-5
  - Multiple-choice: Integer 0-5 (option index)
  - Team name: Alphanumeric + spaces, max 100 chars
  - Email: RFC 5322 format (for roster upload)
- SQL injection prevention: **Prepared statements** (all queries parameterized)
- File upload: Not supported in V1 (manual CSV or UI entry)

**Output Encoding**
- React: Auto-escapes JSX by default (XSS protection built-in)
- Email templates: Handlebars/Nunjucks auto-escapes (no raw HTML injection)
- API responses: JSON (no embedded HTML)

### 7.5 Rate Limiting & DDoS Protection

**Application-Level Rate Limiting**
- Survey submission: 10 per unique token [PRD specified]
  - Implementation: Redis counter `survey_token:{token}:submissions`, increment on each request, fail if >10
- Dashboard load: 100 per manager per minute [PRD specified]
  - Implementation: Redis counter `dashboard:manager:{user_id}:requests`, sliding window
- Notification send: 5 per team per minute [PRD specified]
  - Implementation: Redis counter `notification:team:{team_id}:requests`

**Network-Level DDoS Protection**
- [Proposal: CloudFlare, AWS Shield, or Azure DDoS Protection] [rationale: BGP-level filtering; alternatives: local rate limiting only (less effective against volumetric attacks)]

### 7.6 Audit & Compliance Logging

**Audit Log Table**
- Records: `{action, user_id, resource_type, resource_id, details, created_at}`
- Queries logged:
  - `response_submitted` (no engineer identifier)
  - `dashboard_viewed` (manager + team_id)
  - `config_updated` (manager + team_id + what changed)
  - `failed_correlation_attempt` (e.g., admin tries to join responses to users table)
- Retention: 90 days (archive older logs to cold storage) [provisional]
- Alert trigger: Any query attempting to join `survey_responses` to `teams.roster` or user directory (flagged for security review)

---

## 8. Deployment & Operations

### 8.1 Hosting Platform

**Proposal**: Kubernetes (AWS EKS, Azure AKS, or GCP GKE) or cloud PaaS (AWS Elastic Beanstalk, Azure App Service, Heroku) [rationale: scalability and multi-region support; alternatives: single-server deployment for MVP]

**Components**
- Frontend (React): Static hosting (AWS S3 + CloudFront, Azure Static Web Apps, Netlify) [proposed]
- Backend API: Container image (Node.js Express) deployed to Kubernetes or PaaS
- Database: Managed PostgreSQL (AWS RDS, Azure Database for PostgreSQL, GCP Cloud SQL) [proposed; alternatives: self-managed on VM]
- Redis (session store, cache, message queue): Managed service (AWS ElastiCache, Azure Cache for Redis) or self-hosted container [proposed]
- Message queue: Redis (as above) or AWS SQS [proposed; alternatives: RabbitMQ, Apache Kafka]

### 8.2 CI/CD Pipeline

**Build**
- Lint: ESLint (TypeScript), Prettier (code formatting)
- Test: Jest (unit tests), Supertest (API tests), React Testing Library (component tests)
- Build: Webpack or Vite (frontend bundle), Docker image build (backend)
- Security scan: OWASP Dependency Check, npm audit [proposed]

**Deploy**
- Staging: Automatically deploy on merge to `develop` branch
- Production: Manual promotion from staging (or gated by approval)
- Rollback: Docker image rollback (revert to previous tag)

### 8.3 Monitoring & Alerting

**Application Metrics** (via Prometheus + Grafana or datadog/New Relic) [proposed]
- API latency: p50, p95, p99 per endpoint
- Error rate: 5xx responses per endpoint
- Queue depth: Jobs pending in Redis queue
- Database connection pool: Active/idle connections

**Health Checks**
- `/api/admin/health` endpoint returns `{status: 'ok', dependencies: {database, redis, email_provider}}`
- Liveness probe: Pod restarts if health check fails for 3 consecutive checks (Kubernetes) [provisional]
- Readiness probe: Pod removed from load balancer if health check fails for 1 check (Kubernetes) [provisional]

**Alerts** (threshold TBD based on baseline)
- API error rate > 5% → PagerDuty/alert to oncall
- Dashboard query latency p95 > 2s (SLO breach) → alert
- Notification queue depth > 10,000 jobs → alert
- Database replication lag > 5 seconds → alert
- GDPR violation attempt (correlation query) → immediate alert + escalation

### 8.4 Backup & Disaster Recovery

**Database Backups**
- Frequency: Daily automated backup [PRD: 30-day retention]
- Method: PostgreSQL pg_dump or managed backup service
- Storage: Object storage (S3, Azure Blob) with encryption
- Restore test: Quarterly (restore to staging environment and verify data integrity)
- Anonymity check: Verify responses table has no identifying columns in backup

**Disaster Recovery Plan** (Provisional)
- RPO: ≤1 hour (latest backup age)
- RTO: ≤4 hours (time to restore and verify)
- Failover: If primary region unavailable, restore from backup to standby region [procedure TBD]

---

## 9. API Specification

### 9.1 Survey API (Engineer)

**GET /api/survey/{token}/get**
```
Response (200 OK):
{
  "survey_id": "uuid",
  "team_id": "uuid",
  "questions": [
    {
      "id": "q1",
      "type": "likert",
      "text": "How satisfied are you with your current project?",
      "scale": [1, 2, 3, 4, 5],
      "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "text": "What is your primary blocker?",
      "options": ["Resources", "Clarity", "Dependencies", "None"]
    }
  ],
  "deadline": "2026-08-18T17:00:00Z"
}

Response (400 Bad Request - token invalid format):
{ "error": "Invalid survey link" }

Response (401 Unauthorized - token expired or already used):
{ "error": "Survey link expired or already used. Ask your manager for a new link." }
```

**POST /api/survey/{token}/submit**
```
Request:
{
  "q1": 4,
  "q2": "Dependencies",
  "q3": 3,
  ...
}

Response (200 OK):
{
  "message": "Thanks for your feedback! Your response is anonymous and helps us understand team health.",
  "auto_dismiss_ms": 5000
}

Response (400 Bad Request - validation error):
{
  "error": "Validation failed",
  "fields": {
    "q1": "Question 1 is required"
  }
}

Response (429 Too Many Requests - rate limited):
{
  "error": "Too many submission attempts for this survey link. Please try again later."
}
```

### 9.2 Manager API (Authenticated)

**GET /api/manager/dashboard?team_id=X&timeRange=past_3_months**
```
Request headers: Authorization: Bearer {access_token}

Response (200 OK):
{
  "team_id": "uuid",
  "team_name": "Engineering Team A",
  "surveys": [
    {
      "survey_id": "uuid",
      "cycle_date": "2026-08-12",
      "cycle_number": 1,  // 1 = most recent
      "questions": [
        {
          "id": "q1",
          "type": "likert",
          "text": "How satisfied are you with your current project?",
          "q1_mean": 4.2,
          "q1_stddev": 0.8,
          "q1_prior_mean": 4.1,  // Previous cycle mean
          "q1_change_percent": 2.4,
          "response_count": 12
        },
        {
          "id": "q2",
          "type": "multiple_choice",
          "text": "What is your primary blocker?",
          "options": [
            { "label": "Resources", "count": 7, "percent": 58, "prior_percent": 55 },
            { "label": "Clarity", "count": 3, "percent": 25, "prior_percent": 27 },
            { "label": "Dependencies", "count": 2, "percent": 17, "prior_percent": 18 }
          ],
          "response_count": 12
        }
      ]
    }
  ],
  "response_rate": {
    "responded": 12,
    "total": 15,
    "percent": 80
  }
}

Response (403 Forbidden - manager not assigned to team):
{ "error": "Access denied. You do not have permission to view this team." }

Response (401 Unauthorized - session expired):
{ "error": "Session expired. Please log in again." }
```

**GET /api/manager/team/{teamId}/config**
```
Request headers: Authorization: Bearer {access_token}

Response (200 OK):
{
  "team_id": "uuid",
  "team_name": "Engineering Team A",
  "roster": [
    { "email": "alice@company.com", "added_at": "2026-08-01" },
    { "email": "bob@company.com", "added_at": "2026-08-05" }
  ],
  "survey_frequency": "weekly",
  "survey_day": "monday",
  "survey_time": "09:00",
  "survey_timezone": "US/Eastern",
  "questions": [
    {
      "id": "q1",
      "type": "likert",
      "text": "How satisfied are you with your current project?",
      "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
    }
  ],
  "notification_channels": {
    "email": true,
    "slack": true,
    "slack_channel": "engineering-team-a"
  }
}
```

**PUT /api/manager/team/{teamId}/config**
```
Request:
{
  "roster": [
    { "email": "alice@company.com" },
    { "email": "charlie@company.com" }  // New member
  ],
  "survey_frequency": "bi-weekly",
  "survey_day": "friday",
  "survey_time": "14:00",
  "questions": [
    {
      "id": "q1",
      "type": "likert",
      "text": "Updated question text",
      "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
    }
  ]
}

Response (200 OK):
{
  "message": "Survey configuration updated successfully",
  "next_survey_send": "2026-08-22T14:00:00-04:00"
}

Response (400 Bad Request):
{
  "error": "Invalid configuration",
  "fields": {
    "questions": "At least 5 questions required"
  }
}
```

---

## 10. Open Technical Decisions

| Decision | Options | Rationale for Provisional Choice | Affects |
|----------|---------|----------------------------------|---------|
| **Data Retention Policy** | (a) Indefinitely; (b) 12-month rolling window; (c) Until team archived | Provisional: Indefinitely (compliance requirement TBD) | Database size, regulatory compliance |
| **Message Queue Backend** | (a) Redis (proposed); (b) AWS SQS; (c) RabbitMQ | Proposed: Redis for speed and persistence; SQS if prefer managed service | Deployment complexity, throughput |
| **Caching Strategy** | (a) Redis cache for dashboard aggregates (proposed); (b) No caching; (c) In-process LRU | Proposed: Redis (distributed, survives restarts); skip if latency acceptable | Dashboard load time, cache invalidation logic |
| **Chart Library** | (a) Recharts (proposed); (b) D3.js; (c) Apache ECharts | Proposed: Recharts for React-native simplicity; D3 for full control | Bundle size, customization capability |
| **Task Scheduler Polling Interval** | (a) Every 1 minute (proposed); (b) 5 minutes; (c) 15 minutes | Provisional: Every 1 minute for responsiveness; trade-off: CPU cost | Survey launch latency (max deviation ≤1 min) |
| **Notification Retry Strategy** | Max 3 retries over 24 hours (PRD); backoff intervals provisional | Proposed: 1s, 2s, 4s, 8s exponential backoff | Failed notification rate, delay to manager alert |
| **Slack Fallback Behavior** | (a) Fall back to email if Slack unavailable (PRD specified); fallback order not prioritized | Provisional: Email fallback if Slack unavailable; confirm priority with stakeholders | Notification delivery guarantee |
| **Timezone Display in Dashboard** | (a) Manager's timezone (proposed); (b) Manager's TZ + engineer's inferred TZ in tooltip | Proposed: Manager's timezone for consistency; do NOT store engineer timezone per-response | Scheduling UX, privacy (timezone storage) |
| **Response Link Invalidation** | Single-use after submission + 14-day hard expiry (PRD specified); re-use within deadline not supported | Proposed: Single-use enforced at token level | UX (accidental resubmit prevention), simplicity |
| **Minimum Group Size for Suppression** | 3 responses (PRD specified); confirm if <10-person teams always suppressed | Provisional: 3 responses; may need additional rule for tiny teams | Privacy (small-team de-anonymization risk) |
| **Database Encryption Key Management** | (a) AWS KMS (proposed); (b) Azure Key Vault; (c) Environment variable | Proposed: Cloud-native KMS for automatic rotation; env var acceptable for non-prod | Key rotation, compliance |
| **Session Storage Backend** | (a) Redis (proposed); (b) PostgreSQL session table; (c) In-memory (single-server only) | Proposed: Redis for speed and distributed access; PostgreSQL if prefer centralized | Session latency, horizontal scaling |
| **Admin Query Access Control** | Audit logging + quarterly code review (proposed); or runtime query interception | Proposed: Audit log + code review; runtime interception (e.g., via database proxy) as defense-in-depth | Detection latency (when correlation attempts discovered) |
| **Hosting Platform** | (a) Kubernetes (proposed); (b) Cloud PaaS; (c) Single VM | Proposed: Kubernetes for horizontal scaling; PaaS if prefer ops simplification | Scalability, ops burden, cost |
| **Email Provider** | (a) AWS SES (proposed); (b) SendGrid; (c) Mailgun | Proposed: SES for cost (bulk); SendGrid if higher deliverability reputation needed | Bounce rates, cost, rate limits |
| **Backup Restore Test Frequency** | Quarterly (proposed) | Provisional: Quarterly; monthly if regulatory requirement | RTO validation timing, ops load |

---

## 11. Privacy & Compliance Summary

### 11.1 Anonymity Enforcement

**Data Segregation**
- Personal data (email, SSO user ID) stored in `teams.roster` table only
- Survey responses stored in `survey_responses` table with NO foreign key or reference to personal data
- Notification delivery tracked in `notification_log` by survey_id + team_id (email NOT stored in this context)
- Application layer prohibits all joins between `survey_responses` and tables containing identifiers

**Guarantee Verification**
- Code path analysis: All manager-facing queries SELECT only from `survey_responses`, `surveys`, `teams` tables; no joins to roster or user directory
- Audit logging: All queries logged; correlation attempts (e.g., `JOIN teams.roster ON ...`) trigger immediate alert
- Database constraints: No foreign key from `survey_responses` to any identifier table (schema enforces separation)

### 11.2 GDPR Compliance

**Data Minimization**
- Only responses and survey metadata collected; no analytics or telemetry on individual responses
- Timezone inferred from IP on request, then discarded (not stored)
- User-Agent classification only (no full UA string or device fingerprint)

**Right to Access**
- Engineers can request export of "their" responses: Response is "No personal data is stored; your responses are permanently anonymized and cannot be linked to you"
- Interpretation: No exportable data tied to individual (anonymity is the compliance answer)

**Right to Deletion**
- Engineers can request deletion: Response is "Your responses are anonymized and do not contain personal data; no identifier to delete"
- Interpretation: Responses cannot be identified or deleted; anonymity precludes deletion

**Basis for Processing**
- Legitimate interest: Manager's business need to understand team health
- No consent required (survey responses are anonymous)

### 11.3 Security Guarantees

- **Confidentiality**: HTTPS/TLS 1.2+; database encryption at rest (AES-256)
- **Integrity**: SQL injection prevention (prepared statements); CSRF protection (OIDC session tokens)
- **Availability**: 99.5% uptime SLA; automated backups with RTO ≤4 hours
- **Access control**: RBAC for managers (Entra ID groups); no engineer login required
- **Audit**: All manager/admin actions logged; correlation attempts flagged

---

## 12. Rollout & Monitoring

### 12.1 Phased Launch

**Phase 1 (Internal Pilot)** [Provisional timeline; confirm with stakeholders]
- Deploy to staging environment
- Small pilot team (1-2 managers, 10-20 engineers)
- Collect feedback on UX, performance, notification delivery
- Verify anonymity enforcement (manual code audit + penetration test)
- Duration: 2-4 weeks

**Phase 2 (Limited Rollout)**
- Deploy to production with feature flag (only available to opted-in managers)
- Monitor error rates, latency, database load
- Verify email deliverability (bounce rates <1%)
- Duration: 2-4 weeks

**Phase 3 (General Availability)**
- Remove feature flag
- Promote to all managers

### 12.2 Ongoing Monitoring

**Key Metrics**
- API error rate (target: <1%)
- Dashboard query latency p95 (target: <2s)
- Notification delivery success rate (target: >95% within 24 hours)
- Survey response rate per team (target: >50%)
- Quarterly anonymity audit (code review + correlation attempt detection)

**Alerts**
- Email delivery bounce rate > 5% → investigate ISP/domain reputation
- Survey submission errors > 10/hour → investigate form validation
- Correlation query detected in audit log → immediate escalation to security team

---

## 13. Non-Functional Requirements Summary

| Requirement | Target | Validation |
|-------------|--------|-----------|
| **Availability** | 99.5% uptime SLA | Monitor via health check; alert if 4+ consecutive failures |
| **Latency (Form Load)** | ~1s (p95) | Synthetic tests from representative device |
| **Latency (Dashboard)** | ~2s (p95) | Production monitoring; alert if p95 > 2.5s |
| **Concurrency** | 100 managers + 1,000 engineers | Load test before launch |
| **Anonymity** | No identifier column in responses | Schema review + code audit quarterly |
| **WCAG 2.1 AA** | All form elements | Automated + manual accessibility testing |
| **Mobile Responsiveness** | Works on phones, tablets, laptops | Manual testing on 2-3 device sizes |
| **Data Retention** | Indefinite (provisional) | Confirm policy; implement cleanup job if changed |
| **Backup Restore RTO** | ≤4 hours | Quarterly restore test |
| **SQL Injection Prevention** | All queries parameterized | Code review + static analysis (e.g., ESLint rule) |
| **CSRF Protection** | OIDC session tokens | Review CSRF implementation before launch |

---

## 14. Known Unknowns & Recommendations

1. **Team Size Thresholds**: If teams are very small (<5 members), minimum group size rule (3 responses) may suppress most results. Recommend pilot with diverse team sizes to validate suppression rate is acceptable.

2. **Timezone Handling**: Manager schedules surveys in their timezone; engineers receive link immediately (no timezone-staggered delivery). If org is global, consider sending link at different times per engineer's timezone in V2.

3. **Notification Delivery Cost**: With 1,000 engineers × weekly = 4,000 emails/week, AWS SES cost ~$0.0001/email = ~$0.40/week (negligible). Confirm if volume scales higher.

4. **Survey Link Token Expiry**: 14-day hard expiry may be too short for low-engagement teams. Recommend logging expiry rate (% of surveys not started before expiry) to validate this threshold.

5. **Slack Channel Permissions**: Ensure bot has `chat:write` permission to designated channel. Test fallback to email if Slack fails.

6. **OIDC Token Refresh**: Manager dashboard may be open for >8 hours; implement refresh token rotation to prevent session expiry mid-session.

7. **Cross-Team Visibility**: Design prevents managers from seeing other teams' results. If cross-team benchmarking is added later (out of scope V1), anonymization must be re-evaluated (results could be re-identified if tied to team metadata).

---

**Document Status**: Ready for implementation. All proposed technologies, provisional values, and open decisions have been marked. Anonymity guarantee is traced through all data paths. Quarterly privacy audits recommended to maintain compliance as system evolves.

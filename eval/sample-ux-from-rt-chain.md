# TeamPulse UX Specification

## 1. Overview

TeamPulse is a lightweight pulse survey system for engineering managers to measure team health through recurring anonymous surveys. This specification defines the user interface, interaction patterns, and information architecture for the manager portal and engineer survey experience.

**Scope**: Manager portal (survey admin & dashboard), engineer survey form, authentication flows, and privacy-preserving UX patterns.

---

## 2. User Flows

### 2.1 Authentication Flow

**Entry Point**: Unauthenticated user visits app root (`/`)

1. System detects missing auth token in HTTP-only cookie
2. User is redirected to Entra ID OIDC sign-in endpoint
3. User authenticates with company credentials
4. OIDC callback returns user to app with secure token
5. Token stored in HTTP-only cookie (24-hour expiry)
6. User redirected to home page based on role:
   - **Manager**: dashboard (most recent active survey)
   - **Engineer**: redirect to any survey link in browser history, or plain "no active surveys" message

**Sign-Out**: Click account menu → "Sign Out" → clear cookie → redirect to Entra ID sign-out endpoint → redirect to public landing page

---

### 2.2 Manager: Create & Schedule Survey

**Trigger**: Manager navigates to `/surveys` and clicks "Create Survey" button

**Step 1: Survey Details**
- Form with fields:
  - Survey name (required, text input, max 120 chars, counter below)
  - Description (optional, textarea, max 500 chars, counter)
  - Recurrence: radio buttons (Weekly / Bi-weekly)
  - Start date & time: date picker + time selector (24-hour format, defaults to "Next Monday 9 AM")
  - End date (optional; if unset, survey runs indefinitely until manually closed)
- Inline validation on blur (e.g., name required, dates must be in future)
- "Next" button (disabled until name + recurrence + start date provided)
- "Save as Draft" link (saves and returns to survey list)

**Step 2: Add Questions**
- "Add Question" button displays modal or expanded section
- For each question:
  - Question text (required, textarea, max 250 chars)
  - Question type: dropdown (Likert Scale / Multiple Choice / Free Text)
  - Type-specific options:
    - **Likert Scale**: radio buttons for scale type (1–5 or 1–10)
    - **Multiple Choice**: text input field "Add option" → button "Add" → list of options with remove button per option
    - **Free Text**: radio for single-line vs. multi-line
  - Required checkbox (checked by default)
  - "Add Question" button (new question appended)
  - Reorder via drag handle on left side of each question card
  - Delete button (×) on right side of each question card
- Max 7 questions enforced; if user tries to add 8th, show inline error "Maximum 7 questions per survey"
- Progress indicator at top: "3 of 7 questions added"
- "Next" button (disabled if no questions or >7)

**Step 3: Select Team**
- Header: "Add Team Members" with subtext "Select from your teams or upload a CSV"
- Two tabs: "Select Members" / "Bulk Upload"
  - **Select Members tab**:
    - Search box: "Find team member by name or email"
    - Below: list of company directory (searchable, paginated, 20 per page)
    - Checkbox per person; selected count badge shows "8 selected"
    - When team member selected, row highlights with checkmark; when deselected, checkbox clears
    - Option to "Select All in Search Results" / "Deselect All"
  - **Bulk Upload tab**:
    - File input: "Upload CSV (email addresses, one per row)"
    - Submit button: validate CSV, parse emails, show preview of emails to add
    - Confirm button: add all emails; if any email invalid or not in directory, show warning but proceed with valid emails
- Summary row below tabs: "Added X members (Show List)" — clicking "Show List" reveals collapsible summary (names/emails, dismissible)
- "Next" button enabled if ≥1 member selected

**Step 4: Review & Launch**
- Read-only summary of all survey details (name, description, recurrence, dates, questions, team size)
- Two action buttons:
  - "Back to Edit" (returns to step 3; state preserved)
  - "Launch Now" (primary, green button)
- Optional "Schedule for Later" link/button (shows date/time picker to change start_at, saves)
- On "Launch Now" click:
  - System schedules notification send at start_at
  - Modal or toast confirms: "Survey launched! Notifications will be sent on [date] at [time]."
  - User redirected to survey dashboard (`/surveys/{id}`)

---

### 2.3 Manager: View & Manage Survey

**Navigation**: Click survey from list on left sidebar → survey detail page opens at `/surveys/{id}`

**Page Layout**:
- **Header**: Survey name, status badge (Active / Scheduled / Paused / Closed), "Edit" button (if draft or paused), "More" dropdown menu
- **Tabs**: "Results" (default), "Settings", "Notifications" (optional for V1)

#### Results Tab (Default)

**Date Range Selector** (top-left below header):
- Dropdown: "Last 4 weeks" / "Last 8 weeks" / "Custom range"
- If "Custom range": date picker with "From" and "To" fields; "Apply" button

**Live Response Counter** (top-right):
- Card: "6 of 8 responded" (large number)
- Subtitle: "Last updated 2 minutes ago"
- Refresh button (optional, or auto-refresh every 30 seconds if active)

**Questions Results** (main section):
- For each question, render one of:

**Likert/Scale Question**:
- Question text (bold)
- Trend line chart (default height 180px):
  - X-axis: survey date/week labels
  - Y-axis: 1–5 or 1–10 scale
  - Line chart showing average score over time
  - Tooltip on hover: "Week of [date]: avg 4.2 (5 responses)"
  - Color: consistent accent color per question (fixed set of 7 colors)
- Current snapshot below chart (horizontal card):
  - Large bold number: current average (e.g., "4.2")
  - Scale visualization: 5 circles, proportionally filled to show distribution (or horizontal bar)
  - Right side: delta badge "↑ 0.3 from last survey" (green if up, gray if flat, red if down)
  - Respondent count: "(5 responses)"

**Multiple-Choice Question**:
- Question text (bold)
- Stacked bar chart or horizontal bar chart showing % distribution over time (or just current response counts)
- Tooltip: "[Option]: 3 responses (60%)"
- Current snapshot: horizontal stacked bar with % labels per option

**Free-Text Question**:
- Question text (bold)
- Summary section: "Themes detected" (stretch feature; optional for V1) or simple "Responses" label
- List view (paginated, 3 per page):
  - Each response as a card: quoted text in gray, no attribution
  - "Load more" or pagination at bottom
  - No search, no filtering

**Settings Tab**:
- Edit link for survey details (name, description, recurrence)
- Team member list (read-only count, no individual names)
- Recurrence and schedule details
- "Close Survey" button (moves to Closed status, survey no longer accepts responses)

#### Notifications Tab (Stretch V1):
- List of notifications sent (date, count delivered)
- "Resend Survey Link" button with recipient filtering (optionally to non-respondents only)

---

### 2.4 Manager: Question Library (Stretch V1)

**Trigger**: In survey creation step 2, "Browse Library" link

- Modal opens with pre-built or saved question templates
- Filters: by type (Likert, Multiple Choice, Free Text)
- Search box: search by question text
- Click question → add to current survey
- Option to save current question as template: "Save Question to Library" checkbox on step 2

---

### 2.5 Engineer: Receive Notification & Complete Survey

**Notification Email**:
```
Subject: Team Health Check - [Manager Name]

Hi [Engineer First Name],

Your manager, [Manager Name], is conducting a quick team health check.
This survey takes 2-3 minutes and your responses are completely anonymous.

[BUTTON: Take the Survey]

Or copy and paste this link: https://teampulse.app/s/[token]

Survey closes on [End Date].

Questions? Reply to this email.
```

**Notification Slack Message** (if enabled):
```
:chart_with_upwards_trend: Team Health Check from [Manager Name]

A quick 2-3 minute survey to gather your feedback. Responses are anonymous.

[BUTTON: Take Survey]

Survey closes [End Date].
```

**Survey Form Flow**:

**Link Access** (`/s/{token}`):
- No login required
- If token invalid or expired, show error: "This survey link is invalid or has expired. Please check your email for the correct link, or contact your manager."
- If survey already closed, show: "This survey has ended. Thank you for your participation."
- If token already used (one-time submission), show: "You've already completed this survey. Thank you!"
- On valid token: load survey form

**Survey Form Page**:

**Layout** (mobile-first):
- Full-width container (max 600px on desktop)
- Header bar (sticky on mobile):
  - Logo/branding (left)
  - Progress indicator (center): "Question 2 of 5"
  - X or Back button (right, closes form with optional confirmation)
- Main form area (padding: 16px mobile, 24px desktop):
  - Question text (large, bold, left-aligned)
  - Subtext (if any)
  - Response input (type-dependent, see below)
  - Spacing: 24px between questions
- Footer:
  - "Previous" button (disabled on Q1, left-aligned) and "Next" button (right-aligned, or "Submit" on last Q)
  - Buttons disabled if required answer missing
  - On mobile, buttons stack full-width

**Question Types**:

**Likert Scale (1–5 or 1–10)**:
- Radio button group, horizontal layout on desktop, vertical on mobile
- Labels: "Strongly Disagree" / "Disagree" / "Neutral" / "Agree" / "Strongly Agree" (or numeric 1–5)
- Hover state: button brightens, cursor pointer
- Selected state: button filled with accent color
- Keyboard nav: arrow keys to move selection, Enter/Space to select

**Multiple Choice**:
- Radio button group (single-select)
- On desktop: list (vertical), one option per line
- On mobile: same layout (no dropdown unless 10+ options; then consider native select)
- Hover: option row background lightens
- Selected: radio filled, text bold
- Keyboard nav: arrow keys, Enter/Space

**Free Text (Single-line)**:
- Text input, full width (max 200 chars)
- Character counter: "0 / 200" right-aligned below input
- Placeholder: "Your feedback..."

**Free Text (Multi-line)**:
- Textarea, full width, ~4 rows tall
- Character counter: "0 / 500" right-aligned below input
- Placeholder: "Your feedback..."

**Form State Management**:
- LocalStorage: save responses as user navigates (key: `teampulse_draft_{token}`, value: JSON of responses)
- On "Previous": move to prior question, don't lose data
- On "Next": validate required fields, show inline error if missing, don't move
- On page close/unload: data persists in localStorage (user can resume)
- On successful "Submit": clear localStorage for this token

**Submission**:
- On final question, "Next" button becomes "Submit"
- "Submit" disabled until all required questions answered
- Clicking "Submit":
  - Button shows loading state: "Submitting..." (disabled, spinner icon)
  - Send POST to `/api/surveys/{survey_id}/responses` with:
    - Temporary session ID (ephemeral, not tied to respondent)
    - Question IDs and answers as JSON
  - Server validates, saves response, discards session ID
  - On success (200): clear localStorage, navigate to confirmation screen
  - On error (5xx or network): show toast error "Something went wrong. Please try again." and re-enable button
  - On 409 (duplicate): silently accept (assume already submitted), show confirmation screen

**Confirmation Screen**:
- Full-screen overlay or new page:
  - Large checkmark icon (green)
  - Heading: "Thank you for your feedback!"
  - Subtext: "Your response has been recorded and will help [Manager Name] understand team health."
  - "Close" button or auto-close after 3 seconds with countdown
  - Optional: "Refer a friend" link (out of scope, remove)

---

### 2.6 Email Reminder Flow (Optional)

**Trigger**: 3 days after survey launched (configurable)

- System checks: is survey still active? Have any members not responded?
- For each non-respondent, send reminder email (same template as initial, but with subject "Reminder: Team Health Check")
- In manager Settings, toggle: "Send 3-day reminder" (on by default)
- Manager can adjust reminder timing or disable per survey

---

## 3. Screen Specifications

### 3.1 Authentication & Landing

**Sign-In Page** (`/login` or auto-redirect from `/`):
- Centered card (max 400px width)
- Company logo (if available)
- Heading: "Sign In with Your Work Account"
- Button: "Continue with Entra ID" (Microsoft blue, icon)
- Privacy footer: "We respect your privacy. Responses are anonymous and secure."
- Responsive: full bleed on mobile, card on desktop

**Post-Login Landing** (authenticated user, no survey context):
- **Manager**: Redirect to `/dashboard` (most recent survey or "Create Survey" CTA)
- **Engineer**: Plain page: "No active surveys at this time. Check back soon!" or if any survey in progress, show active survey with link

---

### 3.2 Manager Dashboard / Survey List

**Route**: `/surveys` or `/dashboard`

**Layout** (responsive):
- **Desktop (>1200px)**:
  - Left sidebar (300px, fixed):
    - "Create Survey" button (full-width, primary color)
    - Divider
    - "Active Surveys" section header
    - List of active surveys (overflow scrolls):
      - Each item: survey name (bold), team name (gray, smaller), response count (badge, right-aligned)
      - Hover: background highlight, cursor pointer
      - Selected: left border accent color, background highlight
    - "Scheduled Surveys" section (collapsed by default, click to expand)
    - "Completed Surveys" section (collapsed by default, click to expand)
    - Settings link (bottom, optional)
  - Main content area (flex: 1):
    - Header: "Surveys" / selected survey name
    - Survey detail or list view (see 2.3)

- **Tablet (768px–1200px)**:
  - Sidebar collapses to icon-only nav bar (top or left, narrow)
  - Survey list as collapsible sheet below header
  - Main content takes full width when survey selected

- **Mobile (<768px)**:
  - No sidebar
  - Header with hamburger icon (opens survey list in off-canvas drawer)
  - Main content full-width
  - "Create Survey" button sticky at bottom, full-width

**Survey List Item**:
- Card or table row:
  - Survey name (bold, clickable)
  - Team name (subtext)
  - Status badge (Active / Scheduled / Paused / Closed)
  - Response count (e.g., "6 of 8")
  - Last updated (small gray text)
  - More actions menu (⋮ icon) → Edit, Archive, Delete, Duplicate

---

### 3.3 Create/Edit Survey Wizard

**Route**: `/surveys/new` or `/surveys/{id}/edit`

**Multi-Step Form** (4 steps, stepper indicator at top):

```
[1. Details] → [2. Questions] → [3. Team] → [4. Review]
```

**Step Indicator** (top-left):
- Horizontal stepper with numbered circles (1, 2, 3, 4)
- Current step highlighted, completed steps show checkmark icon
- Step labels below circles (desktop only)
- Breadcrumb: "Create Survey > Step 2: Questions"

**Left Sidebar** (desktop, sticky):
- Summary of all steps:
  - Step 1: "Details" with mini preview (name, recurrence)
  - Step 2: "Questions" with count (e.g., "3 questions")
  - Step 3: "Team" with count (e.g., "8 members")
  - Step 4: "Review"
- Hyperlinks to jump to any completed step

**Main Content**:
- Step-specific form (see 2.2 for content)
- Buttons at bottom:
  - "Cancel" (left, ghost button, confirms if unsaved changes)
  - "Save as Draft" (left, secondary button, appears on steps 1–3)
  - "Previous" (left, secondary button, disabled on step 1)
  - "Next" (right, primary button, disabled if validation fails)

---

### 3.4 Survey Results Dashboard

**Route**: `/surveys/{id}`

**Header Section**:
- Back button ("<") or breadcrumb: "Surveys > [Team Name] > [Survey Name]"
- Survey title (large)
- Status badge (Active / Scheduled / Paused / Closed)
- "Edit" button (if status is Draft or Paused)
- "More" dropdown menu:
  - "Duplicate Survey"
  - "Export as CSV"
  - "Archive"
  - "Close Survey" (if Active)
  - "Delete" (if Draft)

**Tabs**:
- Results (active by default)
- Settings
- Notifications (optional)

**Results Tab Content**:
- Date range selector (top-left dropdown + custom date picker)
- Live response counter (top-right card)
- Questions results (main scrolling area):
  - Each question as a card (white bg, subtle border/shadow)
  - Card padding: 24px
  - Spacing between cards: 16px
  - Responsive: full-width on mobile, constrained to 900px max on desktop

**Question Result Card** (Likert):
- Heading: question text (bold, left-aligned)
- Trend chart (SVG or Canvas, responsive width):
  - Height: 200px (fixed)
  - X-axis labels: every 2 weeks or every 4 weeks (rotate labels on mobile)
  - Y-axis: numeric scale (1–5 or 1–10)
  - Line: smooth curve, accent color, 2px stroke
  - Grid lines: light gray, subtle
  - Tooltip: on hover, show (date, avg score, response count) in dark popover
  - Legend: below chart, "Average Score"
- Snapshot row (below chart):
  - Left: large number (avg score, e.g., "4.2"), label below ("Average Score")
  - Center: horizontal bar chart or 5 circles (distribution of 1, 2, 3, 4, 5)
  - Right: delta badge ("↑ 0.3 from last survey"), respondent count ("5 responses")

**Question Result Card** (Multiple Choice):
- Question text (bold)
- Horizontal stacked bar chart (100% width):
  - X-axis: 0% to 100%
  - Bars: one bar per option, colors distinct
  - Labels: option text + count + % (e.g., "Option A: 3 (60%)")
  - Tooltip on hover: "[Option]: 3 (60%)"
- Snapshot: current distribution (this survey period only)

**Question Result Card** (Free Text):
- Question text (bold)
- List of responses (paginated, 3 per page):
  - Each response as a light-gray box:
    - Text (italic or normal, no quotes)
    - No attribution, no metadata
  - "Show more" / "Show less" pagination
  - No search, no filtering
- Optional: "Themes" summary (V2)

---

### 3.5 Responsive Breakpoints

**Mobile (320px–767px)**:
- Single-column layout
- Buttons stack full-width
- Charts scale to 100% width, height adjusted for legibility
- Sidebar → off-canvas drawer
- Form inputs: full-width
- Spacing: 12px gutters, 16px padding

**Tablet (768px–1199px)**:
- Sidebar present but narrower (200px)
- Main content: flex 1
- Charts: 600px max width
- Buttons: side-by-side if space allows

**Desktop (1200px+)**:
- Full layout (sidebar + content)
- Charts: 700px–900px width
- Form: constrained to 600px max width (centered)
- Spacing: 24px gutters, 32px padding

---

## 4. Component Library

### 4.1 Form Components

#### Text Input
```
Label (bold, required marker *)
[________________________________________]
Helper text or character count (gray, small)
Error message (red, small, only on blur/submit if invalid)
```

- Border: 1px, light gray
- Focus state: border accent color, box-shadow (light)
- Disabled state: light gray background, cursor not-allowed
- Error state: red border, red text for error message
- Placeholder: light gray italic text
- Min height: 40px (touch target)

#### Textarea
```
Label
[____________________________________]
[____________________________________]
[____________________________________]
Character count: 120 / 500 (right-aligned, gray)
```

- Same styling as text input
- Rows: 4 (default), adjustable
- No auto-expand
- Character limit enforced client-side + server-side

#### Dropdown/Select
```
Label
[Select an option           ▼]
```

- Trigger element: full width (mobile), fixed width (desktop)
- Chevron icon (right side)
- On click: open dropdown menu below or above (if space constrained)
- Menu: list of options, overflow scrolls if >10 items
- Hover state: option background highlight
- Selected state: checkmark + highlight
- Keyboard: arrow keys, Enter to select, Escape to close

#### Radio Button Group
```
( ) Option 1
( ) Option 2
( ) Option 3
```

- Vertical layout (default)
- Horizontal layout on mobile only if ≤3 options (survey scale), space-evenly
- Circle icon: 20px, border 2px on default, filled on selected
- Label text clickable (expands hit target)
- Keyboard: arrow keys to move focus, Space/Enter to select
- Focus indicator: blue outline around circle or label

#### Checkbox
```
[✓] I agree to this condition
```

- Square icon: 20px
- Checked: filled with accent color, white checkmark
- Unchecked: border 2px, light gray
- Label text clickable
- Indeterminate state: filled with light gray (on parent checkbox if children mixed)

#### Date/Time Picker
```
Label
[Pick a date        🗓]
[HH : MM ▲▼]
```

- Date input: click opens native date picker (on mobile) or custom calendar (desktop)
- Time input: spinners or HH:MM format with up/down arrows
- Alternative: single datetime input with native picker
- Validation: must be in future (if start_at), must be after start (if end_at)

### 4.2 Button Styles

**Primary Button** (green/accent):
```
[   Create Survey   ]
```
- Background: accent color (e.g., #0066CC)
- Text: white, bold
- Padding: 12px 24px (min 44px height)
- Border radius: 6px
- Hover: background darkened 10%
- Active/pressed: background darkened 20%
- Disabled: gray background, 50% opacity, cursor not-allowed
- Focus: outline offset 2px, 2px solid accent color
- Keyboard nav: Tab to focus, Enter/Space to activate

**Secondary Button** (white border):
```
[   Save as Draft   ]
```
- Background: white
- Border: 1px, gray (#CCC)
- Text: dark gray or accent color
- Hover: light gray background
- Active: darker border, darker text
- Disabled: light gray text, cursor not-allowed

**Ghost/Tertiary Button** (text only):
```
   Cancel       Edit       Delete
```
- No background
- Text: accent color or dark gray
- Underline: optional on hover
- Hover: text bold or darker
- Focus: outline
- Padding: 8px 16px

**Button Group**:
- Buttons arranged horizontally, left to right
- Spacing: 8px between buttons
- On mobile: stack full-width, 12px gap
- Justify content: flex-end (align right) or space-between

### 4.3 Cards & Containers

**Survey Card** (list item):
```
╔════════════════════════════════════╗
║ Survey Name              Active    ║
║ Team Name         6 of 8 responded ║
║ Last updated: 2 minutes ago        ║
║                              [⋮]   ║
╚════════════════════════════════════╝
```

- Padding: 16px
- Border: 1px, light gray or box-shadow: 0 2px 4px rgba(0,0,0,0.08)
- Border radius: 8px
- Hover: box-shadow: 0 4px 12px rgba(0,0,0,0.12), cursor pointer
- Active: left border 4px accent color

**Result Card** (chart/data):
```
╔════════════════════════════════════╗
║ How satisfied are you with your    ║
║ current role?                      ║
║                                    ║
║ [Trend Chart Area]                 ║
║                                    ║
║ [Current Snapshot]                 ║
╚════════════════════════════════════╝
```

- Padding: 24px
- Border: 1px, light gray
- Border radius: 8px
- Box shadow: 0 1px 3px rgba(0,0,0,0.05)
- Spacing between cards: 16px
- Max width: 900px (desktop), full width (mobile)

### 4.4 Status Badges

```
Active        Scheduled       Paused        Closed
█ green       █ blue         █ gray        █ dark gray
```

- Pill-shaped badge: padding 6px 12px, border radius 12px
- Font size: 12px, bold
- Colors:
  - Active: green (#28A745)
  - Scheduled: blue (#0066CC)
  - Paused: gray (#6C757D)
  - Closed: dark gray (#343A40)
- Text: white on colored background

### 4.5 Progress Indicators

**Stepper** (multi-step form):
```
   (1)  →  (2)  →  (✓)  →  (4)
 Details  Questions  Team  Review
```

- Circles: 40px diameter, center-aligned numbers (1–4)
- Current step: filled with accent color, white text
- Completed steps: filled green with checkmark
- Future steps: light gray border, light gray text
- Connecting lines: light gray
- Step labels: below circles (desktop), hidden (mobile)

**Progress Bar** (form completion):
```
████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
60% complete
```

- Full width, height 4px, light gray background
- Filled portion: accent color
- Label: optional, right-aligned, small gray text

**Survey Form Progress** (in header):
```
Question 2 of 5
```

- Text label, center-aligned in sticky header
- Updates as user navigates questions

### 4.6 Data Visualization

**Trend Line Chart**:
- SVG or Canvas-based
- X-axis: survey dates (e.g., "Week 1", "Week 2", etc. or "Jul 1", "Jul 8", etc.)
- Y-axis: numeric scale (1–5, 1–10, or percentage)
- Line: smooth (bezier curve), 2px stroke, accent color
- Dots: 4px circles at data points, same color
- Grid lines: light gray, subtle (optional)
- Tooltip: dark background, white text, appears on hover (position below/above depending on space)
- Legend: below chart, indicates what line represents (e.g., "Average Score")
- Responsive: scales to container width, height fixed at 200px

**Horizontal Bar Chart** (multiple choice distribution):
```
Option A ████████░░░░ 60%
Option B ██████░░░░░░░░ 40%
```

- Full width
- Bars: colors distinct per option
- Labels: option text + percentage (right-aligned)
- Tooltip: on hover over bar, show count + %
- Mobile: stack labels above bars if space constrained

**Response Distribution** (Likert):
```
1 ◯  2 ◯◯  3 ◯◯◯◯  4 ◯◯◯  5 ◯
```

- 5 circles (for 1–5 scale) or 10 (for 1–10)
- Circle size: proportional to count (or all same size with count label)
- Filled circles: color matches scale (green for 5, red for 1)
- Alternative: horizontal stacked bar with same logic

---

## 5. Interaction Patterns

### 5.1 Form Navigation

**Multi-Step Form**:
- "Previous" button:
  - Disabled on step 1
  - Navigates to step N–1 without validation
  - Preserves all form data
- "Next" button:
  - Validates current step (required fields, data format)
  - Shows inline error above step content if validation fails
  - On success, navigates to step N+1
  - Scrolls to top of form on mobile
- "Cancel" button:
  - Confirms if unsaved changes: "Discard changes and leave?" with Cancel/Discard buttons
  - Navigates to `/surveys`
- "Save as Draft" link:
  - Saves current step without validation
  - Shows toast: "Survey saved as draft"
  - Stays on same page
  - No confirmation needed

### 5.2 Survey Response Form

**Navigation Between Questions**:
- "Previous" (Q1 disabled):
  - On click, navigate to Q–1
  - Preserve response data (localStorage + form state)
  - No validation
- "Next" (on Q2–N):
  - Validate current question: if required and empty, show inline error and prevent navigation
  - Error message: "This question is required" (red text, appears above button or inline)
  - On valid response, navigate to Q+1
  - Clear error state
- "Submit" (on final Q):
  - Validate all required questions on page (not just final Q)
  - If invalid, show errors and don't submit
  - On valid submission:
    - Disable button, show loading state ("Submitting...")
    - POST to API
    - On success: clear localStorage, navigate to confirmation
    - On error: show toast error, re-enable button

**Unsaved Data Persistence**:
- As user answers questions, save responses to localStorage (key: `survey_draft_{token}`)
- On page unload (tab close, back button), data persists
- On resume (return to same link): reload from localStorage
- On successful submit: clear localStorage

### 5.3 Modal Dialogs

**Confirmation Dialog** (e.g., "Close survey?"):
```
╔═════════════════════════════════════╗
║ Close Survey?                       ║
║                                     ║
║ This action cannot be undone.      ║
║ Responses will no longer be         ║
║ accepted.                           ║
║                                     ║
║      [Cancel]   [Close Survey]      ║
╚═════════════════════════════════════╝
```

- Dark overlay (opacity 0.5)
- Centered card (max 400px)
- Title (bold, large)
- Body text
- Button row: Cancel (secondary), action (primary)
- Keyboard: Escape to cancel, Tab to move between buttons, Enter to activate focused
- Focus: first interactive element (Cancel button) gets focus on open

**Form Modal** (add question, add team member):
- Same layout as confirmation
- Scrollable content area if content >600px height
- Close button (×) in top-right corner

### 5.4 Toasts & Notifications

**Toast Message** (temporary notification):
```
✓ Survey saved successfully       [×]
```

- Fixed position: bottom-right (desktop), bottom center (mobile)
- Padding: 12px 16px
- Border radius: 6px
- Background: success color (green) or error (red) or info (blue)
- Text: white
- Icon: checkmark (success), X (error), i (info)
- Auto-dismiss: 4 seconds
- Close button (×): manual dismiss
- Keyboard: press Escape to dismiss (if focused)
- Multiple toasts: stack vertically with 8px gap

### 5.5 Dropdowns & Menus

**Dropdown List** (date range selector, survey selector):
```
[Last 4 weeks           ▼]

Last 4 weeks
Last 8 weeks
Custom range
```

- Trigger element: full-width or fixed width, chevron icon
- Menu: appears below (or above if no space), left-aligned with trigger
- Items: padding 12px 16px, hover background light gray
- Keyboard: arrow keys to move selection, Enter to select, Escape to close
- Mobile: native select if browser provides better UX (date inputs, especially)

**More Actions Menu** (⋮ icon):
```
        ┌─────────────────┐
        │ Edit Survey     │
        │ Duplicate       │
        │ Archive         │
        │ Delete          │
        └─────────────────┘
```

- Icon: three dots (vertical, ⋮)
- Click opens dropdown menu
- Items: list with hover background
- Destructive actions (Delete, Archive): show delete-specific color (red) or require confirmation
- Keyboard: arrow keys, Enter to select, Escape to close
- Position: top-right corner of card or toolbar, no overflow off-screen (auto-flip if needed)

### 5.6 Pagination

**Paginated Response List** (free-text responses):
```
Response 1
Response 2
Response 3

[< Previous]  Page 1 of 8  [Next >]

Or:

Response 1
Response 2
Response 3
[Load More]  (Showing 3 of 24)
```

- Show 3–5 items per page (desktop), 2–3 (mobile)
- Pagination controls at bottom: "Previous/Next" buttons (disabled if at start/end)
- Page indicator: "Page 1 of 8" or count "3 of 24 shown"
- Alternative "Load More" button: simpler for mobile, lazy-loads next batch
- Keyboard: Previous/Next buttons navigable via Tab and Enter

---

## 6. Responsive Design

### 6.1 Mobile-First Approach

**Mobile (320px–767px)**:
1. Single-column layout
2. Sidebar → off-canvas drawer (hamburger menu)
3. Form inputs: full-width, stacked vertically
4. Buttons: full-width, stacked, bottom toolbar (sticky)
5. Charts: 100% width, height adjusted (e.g., 180px instead of 240px)
6. Dropdowns: native select on input[type="date/time"] (better UX on mobile)
7. Cards: full bleed on mobile (0 margin), 8px padding gutters
8. Spacing: 12px vertical gutters, 16px padding
9. Touch targets: min 44px height for buttons and interactive elements

**Tablet (768px–1199px)**:
1. Sidebar: present but narrower (160px–200px)
2. Main content: flex 1, scrolls if needed
3. Charts: 500px–600px width
4. Form: 500px width, centered
5. Two-column layout for related items (optional)

**Desktop (1200px+)**:
1. Full sidebar + main content layout
2. Charts: 700px–900px width
3. Forms: 600px width, centered
4. Four-column grid for survey cards (if many surveys)
5. Spacing: 24px gutters, 32px padding

### 6.2 Breakpoint Media Queries

```css
/* Mobile (default) */
/* 320px–767px */

/* Tablet */
@media (min-width: 768px) { ... }

/* Desktop */
@media (min-width: 1200px) { ... }

/* Large Desktop (optional) */
@media (min-width: 1600px) { ... }

/* High DPI / Retina */
@media (-webkit-min-device-pixel-ratio: 2) { ... }
@media (min-resolution: 192dpi) { ... }

/* Touch Devices */
@media (hover: none) {
  /* Increase touch targets, remove hover states if not needed */
}

/* Landscape Mobile */
@media (max-height: 600px) {
  /* Adjust spacing, hide non-critical elements */
}
```

### 6.3 Flexible Components

**Sidebar Navigation**:
- Desktop (1200px+): left sidebar, 300px, fixed or sticky
- Tablet (768px–1199px): left sidebar, 160px, narrow
- Mobile (<768px): hamburger menu, off-canvas drawer from left

**Charts**:
- Always responsive to container width
- Use SVG or Canvas with resize observer to re-render on container change
- Height: fixed at breakpoints (e.g., 200px mobile, 240px desktop)

**Form Layout**:
- Single column on mobile (<768px)
- Two columns on desktop (label left, input right) only if space (>1000px)
- Max width: 600px to ensure readability

---

## 7. Accessibility

### 7.1 WCAG 2.1 AA Compliance

**Semantic HTML**:
- Use `<button>`, `<input>`, `<select>`, `<textarea>` instead of divs with click handlers
- Use `<label>` associated with inputs via `for` attribute
- Use `<fieldset>` and `<legend>` for grouped form controls
- Use `<h1>`, `<h2>`, etc. for heading hierarchy
- Use `<table>` for tabular data (results export)
- Use `<nav>` for navigation (sidebar, breadcrumbs)

**ARIA Labels**:
- Add `aria-label` or `aria-labelledby` to icon buttons
- Add `aria-expanded` to collapsible sections and dropdowns
- Add `aria-live="polite"` to status messages (toasts, loading states)
- Add `aria-current="page"` to active nav item
- Add `aria-required="true"` to required form fields (in addition to HTML `required`)
- Add `role="alert"` to error messages (will be announced immediately)
- Add `aria-describedby` to inputs with helper text or error messages

**Keyboard Navigation**:
- All interactive elements (buttons, links, inputs, dropdowns) must be keyboard-accessible via Tab
- Tab order follows logical visual flow (left-to-right, top-to-bottom)
- No keyboard traps (Tab always exits an element/dialog)
- Escape key closes modals and dropdowns
- Enter and Space activate buttons
- Arrow keys navigate lists, menus, and radio/checkbox groups
- Focus management: focus moves to dialog on open, returns to trigger on close

**Focus Indicators**:
- Visible focus outline on all interactive elements
- Outline: 2–3px solid, contrasting color (blue or accent color)
- Outline offset: 2px (slightly offset from element edge)
- Does NOT rely on color alone to indicate focus (e.g., not just a color change)

**Color Contrast**:
- Normal text: ≥4.5:1 contrast ratio (e.g., dark gray on white)
- Large text (≥18pt or ≥14pt bold): ≥3:1
- UI components (buttons, form borders): ≥3:1
- Do NOT rely on color alone to convey information (e.g., status badges must have text + color + optional icon)

**Text & Typography**:
- Font size: ≥16px for body text (mobile), ≥14px (desktop)
- Line height: ≥1.5 for body text
- Line length: ≤80 characters per line (optimal readability)
- Font: sans-serif preferred (system fonts: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- Avoid all-caps for body text (headings OK)

**Images & Icons**:
- All images have `alt` text (descriptive, <125 characters)
- Decorative images: `alt=""` (empty)
- Icons: wrapped in `<svg>` with `aria-label` or paired with visible text label
- Icon-only buttons: `aria-label` required (e.g., `<button aria-label="Close modal">×</button>`)

**Forms**:
- Every `<input>` has associated `<label>` via `for` attribute
- Required fields: `required` attribute + visual indicator (red asterisk) + aria-required
- Error messages: associated via `aria-describedby` to input; displayed with `role="alert"` or `aria-live="polite"`
- Multi-step forms: use `aria-current="step"` on current step indicator
- Form groups: use `<fieldset>` with `<legend>` for radio/checkbox groups

**Modals**:
- Add `role="dialog"` or `<dialog>` element
- Add `aria-modal="true"`
- Trap focus within modal (Tab loops to first/last element)
- Close on Escape key
- Announce modal title via `aria-labelledby`

**Notifications & Alerts**:
- Toasts: use `aria-live="polite"` or `role="alert"`
- Status messages: use `aria-live="assertive"` for errors, `polite` for confirmations
- Auto-dismiss: announce before disappearing ("Message will disappear in 5 seconds")

**Links**:
- Link text must be descriptive (avoid "Click here", "Read more")
- If link text is ambiguous, add `aria-label` or `title` attribute

**Data Visualization**:
- Charts: provide table or text summary of data (alternative to visual)
- Trend lines: use both color and pattern/shape (not color alone to distinguish lines)
- Legend: always present and accessible via keyboard

---

### 7.2 Screen Reader Testing

**Test with**:
- NVDA (Windows, free)
- JAWS (Windows, paid)
- VoiceOver (macOS/iOS, built-in)
- TalkBack (Android, built-in)

**Key flows to test**:
1. Sign-in flow (navigate form, fill inputs, submit)
2. Survey creation (navigate steps, add/remove questions)
3. Survey form (fill 7 questions, understand progress, submit)
4. Dashboard (understand survey list, navigate to results, interpret charts)

**Expected announcements** (examples):
- "Survey name, edit text, required"
- "Question 2 of 5, heading"
- "How satisfied are you with your current role?, heading"
- "Likert scale, 1 to 5, radio group, 1 selected"
- "Responses, 6 of 8, heading"
- "Trend chart, image, use arrow keys to explore data" (or provide table fallback)

---

## 8. Error Handling & Validation

### 8.1 Client-Side Validation

**Form Inputs**:
- **On Blur**: validate field, show error if invalid
- **On Submit**: validate all fields, prevent submission if any invalid
- **Real-time feedback** (optional): show inline success checkmark after valid input

**Survey Form**:
- Required fields: show error "This question is required" if empty on Next or Submit
- Likert/Multiple Choice: force selection (radio checked) before Next
- Free text: optional by default (allow empty), unless marked required
- Character limit: show count, prevent submission if over limit

**Error Message Format**:
```
[!] Survey name is required.
```

- Icon: red exclamation (!)
- Color: red (#D32F2F or #DC3545)
- Position: below input or above Next button
- Announcement: screen reader announces as alert

**Inline Validation Errors**:
- Show below input field on blur (if empty or invalid format)
- Error text: red, small (12px), 8px above input
- Input border: red (2px) on error state
- Clear error on valid input (blur after correction)

**Form-Level Errors** (on submit):
```
╔══════════════════════════════════════╗
║ Please fix the errors below:         ║
║                                      ║
║ • Survey name is required            ║
║ • At least 1 team member required    ║
╚══════════════════════════════════════╝
```

- Scoped error summary at top of form (red background, red text)
- List of errors with links to problematic fields
- Clicking error link scrolls to field and focuses it
- Announce via `role="alert"` for screen readers

### 8.2 Server-Side Validation

**API Responses**:
- **200 OK**: request succeeded, return result
- **400 Bad Request**: validation error (e.g., invalid question type)
  ```json
  {
    "error": "Invalid question type",
    "details": {
      "field": "questions[2].type",
      "message": "Must be one of: likert, multiple_choice, free_text"
    }
  }
  ```
- **401 Unauthorized**: missing/invalid auth token, redirect to sign-in
- **403 Forbidden**: user not authorized for resource (no survey access)
- **404 Not Found**: survey/question doesn't exist
- **409 Conflict**: duplicate response (same token already submitted)
- **422 Unprocessable Entity**: semantic error (e.g., survey closed, can't submit)
- **429 Too Many Requests**: rate limit exceeded, show message "Too many requests. Please try again in a few minutes."
- **5xx Server Error**: show generic error "Something went wrong. Please try again later." + log error ID for support

### 8.3 Error UX

**Network Error** (timeout, connection lost):
```
╔══════════════════════════════════════╗
║ ⚠ Network Error                      ║
║                                      ║
║ Unable to submit your response.      ║
║ Please check your connection and     ║
║ try again.                           ║
║                                      ║
║       [Retry]   [Go Back]            ║
╚══════════════════════════════════════╝
```

- Modal or inline banner (red background, white text)
- Message: clear, non-technical
- Action: Retry button (re-send request), Go Back button (lose form data with confirmation)
- Auto-retry (optional): retry once after 3 seconds with backoff

**Invalid Link** (expired or malformed token):
```
This survey link is invalid or has expired.
Please check your email for the correct link,
or contact your manager.
```

- Page redirect: user sent to landing page
- Message display: clear, non-alarming (gray text, not red error)
- Alternative: email manager link in message

**Survey Closed** (end date passed or manually closed):
```
This survey has ended.
Thank you for your participation.
```

- Page display (no modal)
- Gray text, friendly tone
- No error state

**Already Submitted** (token used twice):
```
You've already completed this survey.
Thank you!
```

- Page display
- Green checkmark (success state, not error)
- No indication that re-submission failed (silent success)

### 8.4 Loading States

**Form Submission** ("Submitting..."):
- Button shows loading spinner (animated, gray)
- Button text: "Submitting..." or just spinner
- Button disabled (cursor not-allowed)
- Form inputs disabled (readonly)
- No visual feedback to cancel submission

**Async Data Load** (dashboard results):
- Chart area: skeleton loader (light gray animated placeholder)
- Or: spinner centered with "Loading results..."
- If load takes >3 seconds: show progress message

---

## 9. Data States

### 9.1 Empty States

**No Surveys**:
```
╔════════════════════════════════════════╗
║                                        ║
║        📋 No Surveys Yet               ║
║                                        ║
║  Create your first pulse survey to     ║
║  start gathering team feedback.        ║
║                                        ║
║      [Create Survey]                   ║
║                                        ║
╚════════════════════════════════════════╝
```

- Centered content, light gray text
- Icon or illustration (optional)
- CTA button: "Create Survey"
- Appear on `/surveys` if no surveys exist

**No Results** (survey has no responses):
```
No responses yet.

Survey started on [Date].
Respondents have until [End Date] to respond.

Responses received: 0 of 8
```

- Centered message
- Expected timeline
- Current response count
- No error state (normal, interim state)

**No Responses** (free-text question, no answers):
```
No responses to this question.
```

- Displayed in question card
- Light gray text

### 9.2 Loading States (Data Fetching)

**Dashboard Loading**:
- Chart areas: skeleton loader (animated light gray bars)
- Response counter: "– of –"
- Spinners: subtle, small, gray
- Message: "Loading results..." (optional)

**Survey List Loading**:
- Card placeholders: 3–5 skeleton cards (full height)
- Animated shimmer effect (optional)
- Timeout: if loading >5 seconds, show error toast

### 9.3 Populated States

**Survey List** (multiple active surveys):
- Cards arranged in grid or list
- Each card shows name, team, status, response count, last updated
- Hover state: shadow/highlight, cursor pointer

**Results Dashboard** (populated charts):
- Trend lines show data points and smooth curves
- Tooltips on hover
- Snapshot cards show current metrics
- Delta badges show change from prior survey

**Response Form** (in progress):
- Questions rendered one per page or section
- Progress indicator updates as user answers
- Button states update (Previous disabled on Q1, Submit enabled on last Q if all required answered)
- Form state persisted to localStorage

---

## 10. Design System

### 10.1 Color Palette

**Neutral Colors** (light mode, dark mode uses inverse):
```
White         #FFFFFF
Light Gray    #F5F5F5
Medium Gray   #EFEFEF
Gray          #CCCCCC
Dark Gray     #999999
Charcoal      #333333
Black         #000000
```

**Semantic Colors**:
```
Success/Green #28A745
Error/Red     #DC3545
Warning/Orange #FFC107
Info/Blue     #0066CC
Accent        #0066CC (primary brand color)
```

**Interactive States** (per component):
```
Default: #0066CC (blue)
Hover:   #0052A3 (darker blue)
Active:  #003D7A (even darker)
Disabled: #CCCCCC (gray)
Focus:   2px solid #0066CC (outline)
```

**Dark Mode**:
- Swap foreground/background: dark charcoal background, light text
- Reduce brightness of colors (e.g., blue → #1E88E5 instead of #0066CC)
- Maintain contrast ratios ≥4.5:1

### 10.2 Typography

**Font Family** (system fonts, no web fonts for performance):
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

**Font Sizes & Weights**:
```
H1: 32px, bold (700), line-height 1.3
H2: 24px, bold (700), line-height 1.3
H3: 20px, bold (700), line-height 1.4
H4: 16px, bold (700), line-height 1.4
Body: 14px–16px, regular (400), line-height 1.5
Small: 12px, regular (400), line-height 1.4
Label: 14px, bold (600), line-height 1.5
```

**Color**:
- Body text: dark gray (#333 on light, #F5F5F5 on dark)
- Labels: darker gray or charcoal
- Links: accent blue (#0066CC)
- Link hover: underline
- Helper text: medium gray (#999)
- Error text: red (#DC3545)
- Placeholder text: light gray (#CCCCCC)

### 10.3 Spacing & Layout

**Base Unit**: 8px (all spacing multiples of 8px)

**Spacing Scale**:
```
XS:  4px   (button icon padding, tight spacing)
S:   8px   (padding within small elements, gap between inline items)
M:  16px   (default padding, margin between components)
L:  24px   (section spacing, card padding)
XL: 32px   (page-level padding, large gaps)
XXL: 48px  (hero spacing, very large sections)
```

**Component Spacing**:
- **Button**: 12px vertical, 24px horizontal (min height 44px)
- **Input/Select**: 12px vertical, 16px horizontal (min height 40px)
- **Card**: 16px padding (mobile), 24px (desktop)
- **Form group**: 24px gap between fields
- **Section**: 32px margin above
- **Page padding**: 16px (mobile), 24px (tablet), 32px (desktop)

**Grid**:
- 12-column responsive grid (optional, for layouts)
- Gutter: 16px (mobile), 24px (desktop)
- Column width: `(100% - gutters) / 12`

### 10.4 Border Radius

```
Subtle:    2px   (light borders)
Small:     4px   (inputs, small components)
Medium:    6px   (cards, buttons)
Large:     8px   (large cards, modals)
Pill:     12px   (badges, circular buttons)
Circle:   50%    (avatars, round buttons)
```

### 10.5 Shadows

```
Subtle:   0 1px 3px rgba(0, 0, 0, 0.05)
Small:    0 2px 4px rgba(0, 0, 0, 0.08)
Medium:   0 4px 12px rgba(0, 0, 0, 0.12)
Large:    0 8px 24px rgba(0, 0, 0, 0.16)
```

**Usage**:
- Subtle: hover state on list items
- Small: card default state, dropdown
- Medium: card hover, modal shadow
- Large: full-page overlay (modals, drawers)

### 10.6 Animation & Transitions

**Timing**:
```
Fast:     100ms  (hover effects, micro-interactions)
Normal:   300ms  (modal open/close, color transitions)
Slow:     500ms  (full-page transitions, large reflows)
```

**Easing**:
```
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)  (default, smooth)
ease-in:     cubic-bezier(0.4, 0, 1, 1)    (accelerating)
ease-out:    cubic-bezier(0, 0, 0.2, 1)    (decelerating)
```

**Common Animations**:
- **Fade in**: opacity 0 → 1, 300ms ease-out
- **Slide in**: transform translateY(10px) → 0, 300ms ease-out
- **Color change**: background-color, 300ms ease-in-out
- **Scale on hover**: transform scale(1.02), 100ms ease-out
- **Loading spinner**: rotate 360deg, 1s linear infinite
- **Pulse (emphasis)**: opacity 1 → 0.7 → 1, 2s infinite

**No animation** (preference):
- Respect `prefers-reduced-motion` media query
- If enabled, remove/disable animations
- Keep visual states (hover, focus) without motion

---

## 11. States & Transitions

### 11.1 Survey Lifecycle

**Draft**:
- Manager can edit
- No notifications sent
- Not visible to engineers
- CTA: "Launch" or "Schedule for Launch"
- Actions: Edit, Duplicate, Delete

**Scheduled**:
- Notifications pending (will send at start_at)
- Manager can edit (until launch time)
- Engineer view: link not yet active
- CTA: "View" or "Manage"
- Actions: Edit (if before launch), Cancel, Duplicate

**Active**:
- Notifications sent to engineers
- Manager can view live response count
- Engineer view: link active, form accessible
- CTA: View results, send reminder
- Actions: Close early, Pause, Duplicate

**Paused**:
- Engineers can't submit responses
- Manager can resume or close
- CTA: "Resume" or "Close"
- Actions: Resume, Close, Duplicate

**Closed**:
- No new responses accepted
- Results final
- Read-only view for manager
- CTA: View results, Duplicate (to relaunch)
- Actions: Duplicate, Archive, Delete

---

### 11.2 Response Status Indicators

**Survey Response Counter**:
- Live updates every 30 seconds (or on manager refresh)
- Format: "X of Y responded"
- Example: "6 of 8 responded" (75%)
- Optional: progress bar below text showing % completion

---

## 12. Privacy & Anonymity UX

### 12.1 Design Principles

**Transparency**:
- On survey form page: "Your responses are anonymous and confidential."
- In email notification: "Your responses cannot be traced back to you."
- In manager dashboard: Never show respondent names, emails, or IDs
  - Only aggregate counts: "6 of 8 responded" (no names)
  - Responses presented without any identifier

**No Tracking**:
- Survey links do not require login (engineer can remain anonymous)
- No user cookies or fingerprinting in response record
- LocalStorage cleared after successful submission

**Data Isolation**:
- Response data stored separately from respondent identity
- Manager cannot "drill down" to see individual respondents
- Export feature includes only aggregated data (counts, averages, no individual responses)

### 12.2 Privacy Messaging

**In Email Notification**:
```
Your responses are completely anonymous.
Your manager will see only trends and summaries,
not your individual answers.
```

**In Survey Form** (header or footer):
```
✓ Anonymous  ✓ Confidential  ✓ Secure
```

**In Manager Dashboard**:
```
Tip: Response counts are shown only as totals
(e.g., "6 of 8 responded"). Individual
respondent names and emails are never visible.
```

---

## 13. Implementation Guidelines

### 13.1 Browser Support

**Minimum Supported Versions**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 90+)

**Features**:
- ES2020+ JavaScript (no IE11 polyfills)
- CSS Grid & Flexbox (required)
- LocalStorage (required for form persistence)
- SVG for charts & icons
- No Flash or outdated plugins

### 13.2 Performance Targets

**Metrics**:
- **Largest Contentful Paint (LCP)**: <2.5s
- **First Input Delay (FID)**: <100ms
- **Cumulative Layout Shift (CLS)**: <0.1
- **Time to Interactive (TTI)**: <3.5s

**Optimization**:
- Code splitting: lazy-load dashboard vs. survey form
- Images: optimize, use WebP with PNG fallback
- Fonts: use system fonts (no web font overhead)
- CSS: minify, tree-shake unused styles
- JavaScript: minify, vendor separately if large
- API responses: cache results with appropriate headers (e.g., 5-minute cache for dashboard)

### 13.3 Internationalization (Out of Scope V1)

**Placeholders** (for future i18n):
- Use constants for all user-visible text
- No hardcoded strings in JSX
- Support for RTL languages (structure only, not styling)
- Date/time formats: use locale-aware formatting (e.g., `Intl.DateTimeFormat`)

---

## 14. Appendix: Component Examples

### 14.1 Sample Form Markup (Semantic HTML)

```html
<form id="survey-create" class="survey-form">
  <h1>Create Survey</h1>
  
  <!-- Step Indicator -->
  <ol class="stepper" aria-label="Survey creation steps">
    <li class="step active">
      <span class="step-number">1</span>
      <span class="step-label">Details</span>
    </li>
    <li class="step">
      <span class="step-number">2</span>
      <span class="step-label">Questions</span>
    </li>
    <!-- ... -->
  </ol>

  <!-- Step 1: Details -->
  <fieldset class="form-group">
    <legend>Survey Details</legend>
    
    <div class="form-field">
      <label for="survey-name">Survey Name<span class="required">*</span></label>
      <input
        id="survey-name"
        type="text"
        name="name"
        required
        maxlength="120"
        placeholder="e.g., Q3 Team Health Check"
        aria-describedby="name-error"
      />
      <span class="char-count">0 / 120</span>
      <span id="name-error" class="error-message" role="alert"></span>
    </div>

    <div class="form-field">
      <label for="survey-description">Description (Optional)</label>
      <textarea
        id="survey-description"
        name="description"
        maxlength="500"
        rows="3"
        placeholder="Add context..."
        aria-describedby="description-error"
      ></textarea>
      <span class="char-count">0 / 500</span>
    </div>

    <fieldset class="form-field">
      <legend>Recurrence</legend>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" name="recurrence" value="weekly" required />
          Weekly
        </label>
        <label class="radio-label">
          <input type="radio" name="recurrence" value="biweekly" required />
          Bi-weekly
        </label>
      </div>
    </fieldset>

    <div class="form-field">
      <label for="start-date">Start Date<span class="required">*</span></label>
      <input
        id="start-date"
        type="date"
        name="startDate"
        required
        aria-describedby="start-error"
      />
      <span id="start-error" class="error-message" role="alert"></span>
    </div>
  </fieldset>

  <!-- Form Actions -->
  <div class="form-actions">
    <button type="button" class="btn btn-secondary" id="cancel">Cancel</button>
    <button type="button" class="btn btn-ghost" id="draft">Save as Draft</button>
    <button type="button" class="btn btn-secondary" id="previous" disabled>Previous</button>
    <button type="button" class="btn btn-primary" id="next">Next</button>
  </div>
</form>
```

### 14.2 Sample Chart (SVG Structure)

```html
<div class="chart-container">
  <h3>How satisfied are you with your current role?</h3>
  <svg
    viewBox="0 0 800 300"
    class="trend-chart"
    role="img"
    aria-label="Satisfaction score trend over 8 weeks"
  >
    <!-- Grid lines -->
    <g class="grid" stroke="#E0E0E0">
      <line x1="50" y1="30" x2="750" y2="30" />
      <!-- ... more grid lines -->
    </g>
    
    <!-- Axes -->
    <g class="axes">
      <line x1="50" y1="30" x2="50" y2="250" stroke="#333" />
      <line x1="50" y1="250" x2="750" y2="250" stroke="#333" />
    </g>
    
    <!-- Data line -->
    <polyline
      class="trend-line"
      points="100,200 200,150 300,140 400,130 500,135 600,120"
      fill="none"
      stroke="#0066CC"
      stroke-width="2"
    />
    
    <!-- Data points -->
    <circle cx="100" cy="200" r="4" fill="#0066CC" />
    <circle cx="200" cy="150" r="4" fill="#0066CC" />
    <!-- ... more circles -->
    
    <!-- Tooltip (hidden by default, shown on hover) -->
    <g class="tooltip" display="none">
      <rect x="150" y="100" width="120" height="50" fill="#333" rx="4" />
      <text x="210" y="125" fill="white" text-anchor="middle">
        Week 2
      </text>
      <text x="210" y="145" fill="white" text-anchor="middle" font-size="12">
        avg 4.2 (5 responses)
      </text>
    </g>
  </svg>
</div>
```

### 14.3 Sample Modal (Confirmation)

```html
<div class="modal-overlay" role="presentation" aria-hidden="true"></div>
<dialog open class="modal">
  <button class="modal-close" aria-label="Close dialog">×</button>
  
  <h2 id="modal-title">Close Survey?</h2>
  
  <p id="modal-description">
    This action cannot be undone. Responses will no longer be accepted.
  </p>
  
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary">Cancel</button>
    <button type="button" class="btn btn-primary btn-danger">Close Survey</button>
  </div>
</dialog>
```

---

## 15. Conclusion

This UX specification provides developers with a comprehensive guide for implementing TeamPulse. All components, layouts, interactions, and states are defined to ensure consistency, accessibility, and user satisfaction across manager and engineer workflows.

**Key Design Principles**:
- **Privacy-first**: Anonymity is paramount; no data should reveal respondent identity
- **Mobile-first**: Survey form is responsive, optimized for phone access
- **Accessible**: WCAG 2.1 AA compliance ensures usability for all users
- **Simple**: Minimal friction for engineers (take survey in <3 minutes), straightforward admin for managers
- **Trustworthy**: Clear communication of privacy, security, and data handling

---

**End of UX Specification**

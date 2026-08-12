# UX Specification: Tic-Tac-Toe with Unbeatable AI

## Overview

A web-based Tic-Tac-Toe game supporting three play modes: Player vs. Player, Easy AI, and Impossible AI (minimax-powered unbeatable opponent). The primary constraint is the move evaluation visualization: when playing against Impossible AI, each empty cell displays the minimax score so the player understands the AI's reasoning. The design prioritizes clarity over board clutter and supports both desktop and mobile play.

### Primary Users & Context

- **Learners/students:** Studying game AI, minimax algorithms, or playing casually to observe AI behavior
- **Casual players:** Testing their skill against an unbeatable opponent, playing locally without multiplayer expectations
- **Device:** Web browser on desktop or mobile; touch and keyboard input both supported

---

## User Flows

### 1. Mode Selection
**Flow:**
1. User opens the game → lands on mode selection screen
2. User selects one of three modes: "Player vs Player", "Easy AI", "Impossible AI"
3. User selects their symbol (X or O) if playing against AI; when playing Player vs Player, both players see a clear first-player designation
4. Game board initializes with X always going first
5. User confirms and enters active gameplay

**Design driver:** Fast entry into play. Mode selection is a one-time decision per game session, so a single screen with clear labeling is sufficient.

### 2. Player vs. Player
**Flow:**
1. Board displays with 9 empty cells in a 3×3 grid
2. Current player is clearly labeled ("Player X's turn" / "Player O's turn")
3. User clicks/taps a cell to place their symbol
4. After valid move, control passes to the other player
5. After win, loss, or draw, a result overlay appears with options to "Play Again" or "Change Mode"

**Design constraint:** No AI-specific UI elements (scores, move evaluation) appear in this mode to keep the interface minimal for casual play.

### 3. Easy AI
**Flow:**
1. User selects symbol (X or O); board initializes
2. If user selected X, user moves first; if user selected O, AI moves first
3. After user's move, AI waits 0.5–1.0 seconds then places a random legal move (no scores shown)
4. Result overlay appears after terminal state is reached

**Design driver:** The delay before AI moves prevents the game from feeling instant and broken; it creates the perception that the AI is "thinking." No move evaluation is shown because the Easy AI doesn't need explanation—it's random.

### 4. Impossible AI with Move Evaluation
**Flow:**
1. User selects symbol and initializes game (X always goes first)
2. If user is X, user moves first; otherwise AI moves first
3. On user's turn: user clicks/taps a cell; the board updates with their move
4. AI's turn:
   - Board dims slightly to indicate waiting
   - After 1–2 seconds, AI places its move
   - Immediately after, all empty cells display minimax scores inline on the board (see visualization section below)
   - Scores remain visible until the user makes their next move or the game ends
5. Cycle repeats until terminal state
6. Result overlay displays winner or draw; includes "Play Again" and "Change Mode"

**Design constraint:** Scores must be visible during the user's turn (when they are deciding their next move) so they can see the AI's evaluation. Scores clear when the user places a move to reduce visual noise during the AI's "thinking" phase.

---

## Screen Specifications

### 1. Mode Selection Screen

**Content:**
- Game title: "Tic-Tac-Toe" (h1)
- Three mode cards, each containing:
  - Mode name (h2, e.g., "Player vs. Player")
  - Brief description (e.g., "Two players on the same device")
  - A "Play" button

**Layout:**
- Vertically stacked cards on mobile; horizontally arranged (3-column grid) on desktop (≥1024px)
- Padding and spacing consistent throughout

**Interaction:**
- Clicking "Play" on any card advances to symbol selection (for AI modes) or directly to game initialization (for Player vs. Player)

### 2. Game Screen

#### 2.1 Header

**Content:**
- Game title or mode indicator (e.g., "vs. Impossible AI") in top-left or center
- Current player indicator (e.g., "Player X's turn" or "AI is thinking...") in top-right or below title
- Small "Menu" button (hamburger or text) in top-right to return to mode selection (confirmation required to avoid accidental exit)

**Layout:**
- Single-line header on desktop; may wrap to two lines on mobile if space is constrained
- Clear visual hierarchy: mode/player info is more prominent than navigation

#### 2.2 Game Board

**Content:**
- 3×3 grid of cells, each containing:
  - Player symbol (X or O) if occupied
  - Empty cell indicator (underline, border, or visual outline) if unoccupied
  - Minimax score (Impossible AI mode only, see section 3 below) if the cell is empty and scores are being displayed

**Layout:**
- Board is a square (equal width and height) to maintain aspect ratio
- Cells are equal size with visible borders or outlines separating them
- Responsive sizing: on mobile, the board fits within viewport height (~85% of screen height, accounting for header and footer); on desktop, a fixed size (e.g., 600×600px) or proportional scaling
- Centered on the screen

**Interaction:**
- User clicks or taps a cell to place their symbol
- Disabled state (visual feedback) for occupied cells and during AI's turn
- Hover state (on desktop) to preview which cell would be selected

#### 2.3 Footer / Game Controls

**Content:**
- Result overlay (appears when game ends; see below)
- If game is ongoing: no controls in footer (focus stays on board)

**Layout:**
- Below the board, centered
- Sufficient whitespace to avoid crowding

### 3. Game-End Overlay

**Content:**
- Result message (e.g., "You won!", "AI wins", "Draw")
- Brief explanation of outcome if desired (e.g., "You got three in a row diagonally")
- Two buttons:
  - "Play Again" (starts new game in the same mode)
  - "Change Mode" (returns to mode selection screen)

**Layout:**
- Modal overlay with semi-transparent backdrop
- Centered on screen
- White card/panel with rounded corners and shadow for depth

**Interaction:**
- Buttons are large enough to tap on mobile (≥44×44px touch target)
- Keyboard: Enter/Return to "Play Again", Escape to "Change Mode" (or explicit tabbing to buttons)

---

## Move Evaluation Visualization

### Challenge
Displaying minimax scores on the board without visual clutter or overwhelming the player.

### Design Solution

**Placement:** Scores appear as small, secondary text **inside each empty cell**, positioned below or to the side of any existing content.

**Formatting:**
- Score display: numerical value only (e.g., "5", "-3", "0"), or optionally with semantic labeling ("Win", "Draw", "Loss") if scores are translated from minimax raw values
- Font size: significantly smaller than player symbols (e.g., 10–12px vs. 32–48px symbols)
- Color:
  - Green (+) for scores favoring the current human player (moving toward victory)
  - Red (−) for scores favoring the AI (moving toward defeat for human)
  - Gray (0) for neutral outcomes (draw)
  - Contrast must meet WCAG AA (4.5:1) against the cell background
- Opacity: 0.7–0.8 to signal that scores are secondary information

**Trigger:** Scores appear immediately after the AI makes its move on the Impossible AI mode only. They remain visible while the user is deciding their next move and disappear (fade out) when the user places a move or when the board is cleared for the AI's turn.

**Why this works:**
- Scores are *readable* without dominating the visual hierarchy (player symbols are the primary focus)
- The semantic color coding (green/red/gray) allows players to quickly parse favorable vs. unfavorable moves
- The delayed appearance (only after AI moves) keeps the interface clean during play and teaching moments
- Toggling scores off during the AI's turn reduces distraction and visual noise

### Alternative Display (Optional, if space is constrained on mobile)
If the cell-based display becomes too crowded on mobile:
- Small icon/indicator next to each empty cell (e.g., ✓ for favoring AI, ✗ for favoring human, = for draw)
- Clicking/tapping the icon reveals the numeric score in a tooltip
- This trades discoverability for visual clarity on small screens

**Recommendation:** Start with inline numeric display; if testing shows clutter, add the icon variant and user testing confirms it helps.

---

## Interaction Model

### Input Methods

**Desktop (Mouse & Keyboard):**
- Click a cell to place a move
- Tab to navigate cells; Enter to select
- Escape to open menu (soft requirement—menu button in header is primary)

**Mobile (Touch):**
- Tap a cell to place a move
- No hover states (design for touch first)
- Swipe gestures not needed; all actions are single tap

**Accessibility (Keyboard only):**
- Full keyboard navigation via Tab
- All cells focusable with visible focus ring
- Arrow keys (optional): move focus between adjacent cells
- Enter to place move on focused cell

### State Feedback

**User's Turn:**
- Current player indicator visible ("Your turn" or "Player X's turn")
- Board is fully interactive (cells clickable)
- Cursor changes to pointer on hover (desktop)
- Focus ring visible on focused cell (keyboard navigation)

**AI's Turn (Easy or Impossible):**
- Board is dimmed slightly (opacity 0.6) or shows a loading indicator
- Current player indicator shows "AI is thinking..." or similar
- Cells are not clickable (disabled state)
- After 0.5–2 seconds, AI move appears and the board re-enables

**Game Over:**
- Board cells are not clickable (all disabled)
- Result overlay modal appears
- Focus automatically moves to the modal (for accessibility)

---

## Game State Detection & Flow

### Win Condition
- Three symbols in a row (horizontal, vertical, or diagonal)
- Detected after every move
- Result message: "You won!" (human) or "AI wins" / "You lost!" (AI)

### Draw Condition
- All 9 cells filled, no winner
- Result message: "Draw—it's a tie!"

### Ongoing
- Fewer than 5 moves by both players combined, OR empty cells remain with no winner
- Current player indicator updates after each move

---

## Visual & Layout Specifications

### Color Palette
- **Background:** Light gray (#f5f5f5) or white, depending on dark mode
- **Cell background (empty):** Light white/gray (#ffffff or #fafafa)
- **Cell background (on hover, desktop):** Slightly darker (#efefef)
- **Cell border:** Medium gray (#cccccc), 2px
- **Player symbols (X & O):** Dark blue (#1a1a1a) or black
- **Minimax score (positive, green):** #2ecc71 (or WCAG AA alternative if contrast insufficient)
- **Minimax score (negative, red):** #e74c3c
- **Minimax score (neutral, gray):** #7f8c8d
- **Overlay backdrop:** Black, 50% opacity

### Typography
- **Title/Header:** sans-serif, 24–32px, bold
- **Mode labels:** sans-serif, 16–18px, semibold
- **Cell content (symbols):** sans-serif, 32–48px (scaled responsively)
- **Minimax scores:** sans-serif, 10–12px, regular weight
- **Buttons:** sans-serif, 14–16px, semibold

### Spacing & Sizing
- **Board cell size:** ~90–120px on desktop; scales proportionally on mobile to fit screen
- **Margin around board:** 20–40px
- **Button padding:** 12px horizontal, 10px vertical (minimum 44×44px touch target)
- **Modal padding:** 20–30px

### Responsive Design
- **Mobile (<768px):**
  - Single-column layout for mode selection cards
  - Board scales to ~90% of screen width
  - Touch targets increased to 48×48px minimum
  - Font sizes slightly reduced if space is tight, but remain readable (≥12px)
  
- **Tablet (768–1024px):**
  - Two-column layout for mode cards (or single column if better balanced)
  - Board at fixed or slightly scaled size
  - Normal font sizing

- **Desktop (>1024px):**
  - Three-column layout for mode cards
  - Board at fixed size (600×600px) or slightly larger
  - Hover states and full interactive feedback

### Dark Mode
- Invert colors while maintaining contrast:
  - Background: Dark gray (#1a1a1a)
  - Cell background: Slightly lighter gray (#2d2d2d)
  - Cell border: Light gray (#555555)
  - Text/symbols: Light (#f5f5f5)
  - Minimax scores: Adjust to maintain WCAG AA contrast (green and red remain semantic but may shift in lightness)

---

## Accessibility

### WCAG 2.1 Level AA Compliance

#### 1. Keyboard Navigation (2.1.1 Keyboard)
- **All interactive elements are operable via keyboard:**
  - Tab to navigate mode selection cards → focus becomes visible outline
  - Tab to navigate board cells (in reading order: left-to-right, top-to-bottom, or in a 3×3 grid order)
  - Enter or Space to activate buttons and place moves on focused cells
  - Escape to open the menu (soft requirement; header button is primary)
  - Arrow keys (↑ ↓ ← →) move focus between adjacent board cells (optional but helpful)
  
- **Focus Management:**
  - Focus ring is visible at all times (≥2px solid outline, 3:1 contrast ratio with background)
  - Focus does not disappear after any interaction
  - When a modal opens (game over), focus moves to the modal and is trapped inside (Tab cycles within modal buttons only)
  - When modal closes, focus returns to game board

#### 2. Screen Reader Support (1.3.1 Info and Relationships)
- **Board Structure:**
  - Board is marked as a `<table>` or `<div role="grid">` with row and column headers
  - Each cell has an accessible name: "Row 1, Column 1" or "Cell 1" (numbered 1–9 in reading order)
  - Occupied cells announce their content: "Row 1, Column 1: X" or "Row 1, Column 1: O"
  - Empty cells announce their state: "Row 1, Column 1: empty" or just "Row 1, Column 1" if context is clear
  
- **Minimax Scores:**
  - When scores are visible, each cell announces: "Row 1, Column 1: empty, score +5" (or similar)
  - Color is NOT the only means of conveying score meaning; use text labels: "winning move" (+), "losing move" (−), "draw move" (0) or similar clear text
  - Scores are announced but not overread; if verbosity is a problem, provide a toggle to hide score announcements while keeping visual display
  
- **Game State:**
  - "Player X's turn" or "Your turn" is announced at the start and after each move
  - "AI is thinking..." is announced when the AI's turn begins
  - Result messages ("You won!", "Draw") are announced when the game ends
  
- **Mode and Symbols:**
  - On mode selection, each card is announced: "Player vs. Player mode" or "Impossible AI mode"
  - On symbol selection, the choice is confirmed: "You are X" or "You are O"

#### 3. Color Contrast (1.4.3 Contrast Minimum)
- **All text and interactive elements meet 4.5:1 contrast ratio:**
  - Button text on button background: ≥4.5:1
  - Cell borders and content on cell background: ≥4.5:1
  - Minimax score text on cell background: ≥4.5:1
  - Adjust green (#2ecc71) and red (#e74c3c) if necessary to meet 4.5:1; use WCAG AA-compliant green and red alternatives if needed
  
- **No information conveyed by color alone:**
  - Minimax scores use both color and text labels (e.g., "Win", "Loss", "Draw" or "+5", "−3", "0")
  - Disabled cell state is shown by opacity change *and* label ("occupied" or grayed text)

#### 4. Visual Indicators (2.4.7 Focus Visible)
- **Focus ring:**
  - Visible on all interactive elements (buttons, cells when navigated via keyboard)
  - Minimum 2px, solid outline, ≥3:1 contrast with background
  - Not removed or disabled in browser styles
  
- **Hover state (desktop, mouse):**
  - Cells show a background color change or outline on hover
  - Buttons show an outline or background shift
  - Hover state is visually distinct from focus state (e.g., filled background on hover, outline on focus)

#### 5. Animation & Motion (2.3.3 Animation from Interactions)
- **AI move placement:** Slides in (0.3s) or fades in (0.2s) rather than appearing instantly, but can be disabled via `prefers-reduced-motion`
- **Score fade-out:** Gradual opacity change (0.5s) when clearing scores, respects `prefers-reduced-motion`
- **All animations include a "respect prefers-reduced-motion" query:** If `prefers-reduced-motion: reduce` is set, all animations are instant (no delay) or disabled

#### 6. Semantic HTML & ARIA
- **Buttons:** Use `<button>` element with clear text labels, not `<div onclick>`
- **Board grid:** Use `<table>` with `<th>` for row/column headers (row 1, row 2, etc. and column A, B, C) or `<div role="grid">` with proper ARIA roles
- **Game state:** Use `<h2 aria-live="polite">` for "Player X's turn" so changes are announced without interrupting the reader
- **Result modal:** Use `<div role="dialog" aria-modal="true" aria-labelledby="result-title">` to indicate a modal; announce result message in title or body

---

## Stretch Goals & Future Enhancements

**Note:** These are out of scope for the MVP UX specification but are listed for future phases.

1. **Ultimate Tic-Tac-Toe:** Nine 3×3 boards arranged in a 3×3 meta-grid. Move validation constrains which board(s) the opponent can play in. UX challenge: clarity of which board is "active" without visual overload.
2. **4×4 / 5×5 Variants:** Larger boards with 4-in-a-row or 5-in-a-row win conditions. UX considerations: board scaling, move evaluation visibility at larger scales, time-to-AI-decision feedback.
3. **Teaching Mode:** After a suboptimal move, show the optimal response and an explanation. UX: a sidebar or overlay with suggested moves and reasoning.
4. **Difficulty Slider:** Allow deliberate suboptimal moves at lower levels. UX: a mode setting or in-game slider before the AI moves.

---

## Implementation Notes for Developers

### Board Representation
- Store board state as a 1D array (9 elements, indices 0–8) or 2D array (3×3). Map cell clicks to indices.
- Minimax function takes board state and returns a score; no need to return the list of moves if display is showing scores inline.

### Move Evaluation Display Timing
- After AI places its move, calculate minimax scores for all empty cells
- Store scores in a map: `{ cellIndex: score, ... }`
- Render scores immediately or with a 0.2s fade-in
- Clear scores when the user clicks a cell or when the game transitions to AI's turn

### Responsive Board Sizing
- Use CSS Grid or Flexbox to create a square grid
- Aspect ratio trick: `aspect-ratio: 1` or padding-bottom: 100% to maintain 1:1 ratio
- Scale board size using viewport-relative units (vw/vh) on mobile; fixed pixel size on desktop

### Dark Mode Detection
- Use `prefers-color-scheme: dark` media query
- Provide a manual toggle in settings if desired

### Accessibility Testing Checklist
- [ ] Keyboard navigation: Tab through all interactive elements
- [ ] Focus ring: Always visible, especially on board cells
- [ ] Screen reader: Test with NVDA (Windows), JAWS, or VoiceOver (Mac/iOS)
- [ ] Color contrast: Run contrast checker on all text/backgrounds
- [ ] Motion: Test with `prefers-reduced-motion: reduce` enabled
- [ ] Touch: Test on a real mobile device or simulator

---

## Success Criteria

1. **Move evaluation visualization is clear:** Player can understand minimax scores within 2–3 seconds of reading the board without training.
2. **Keyboard-only play is fully functional:** All gameplay modes are playable using only keyboard input, with visible focus and announcements.
3. **Board is fully responsive:** Playable on mobile (375px width) and desktop (1920px width) without horizontal scrolling or significant layout shifts.
4. **AI move timing feels natural:** 0.5–2.0s delay before AI moves creates perception of "thinking" without frustrating waits.
5. **Minimax scores persist during player's turn:** Scores remain visible until the player places a move, enabling learning.

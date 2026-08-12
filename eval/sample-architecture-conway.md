# Architecture Document: Conway's Game of Life Sandbox

## Overview

Conway's Game of Life Sandbox is a browser-based interactive simulation environment implementing John Conway's cellular automaton. The system couples a high-performance simulation engine with an optimized renderer to support real-time play, user-driven cell editing, pattern libraries, and persistent pattern storage—all within a single-page application architecture.

## Technical Environment

**Platform:** Browser (Chromium, Firefox, Safari, Edge)
**Language:** JavaScript (modern ES2020+)
**Framework:** React or Preact (proposed) for UI and state management
**Storage:** Browser localStorage (proposed) for pattern persistence
**Rendering:** HTML5 Canvas (proposed) for grid visualization

**Rationale for Canvas:** Rasterized rendering avoids the DOM bottleneck of per-cell elements. For a 100×100 grid updating every frame, Canvas reduces paint operations by orders of magnitude compared to DOM reflow. Alternative: SVG for vector-based rendering (cleaner on mobile, worse performance at 10,000+ cells).

**Rationale for React:** Familiar component model for UI controls; separates simulation state from view state. Alternative: vanilla JS for smaller bundle and zero-overhead state (trade-off: more manual DOM management).

**Rationale for localStorage:** Sufficient for pattern persistence without backend infrastructure. Capacity ~5–10 MB per origin (device-dependent). Alternative: IndexedDB if pattern metadata or compression becomes necessary; backend if sharing across devices is required.

## System Architecture

### 1. Simulation Engine

**Core Responsibilities:**
- Maintain grid state (alive/dead per cell)
- Execute generation step: count neighbors and apply birth/death rules
- Track generation counter and live cell count
- Support boundary conditions (wrap vs. edge death)

**State Representation:**
```
Grid {
  width: number,
  height: number,
  cells: Uint8Array | Set<number>,  // see decision below
  generation: number,
  liveCount: number
}
```

**Algorithm: Neighbor Counting**

For each cell (x, y), count alive neighbors in the 3×3 neighborhood (wrapping or clamping at edges). The naive O(n) approach (check all 8 neighbors per cell) is unavoidable at scale; optimization focuses on iteration order and state representation:

- **Sparse Representation** (proposed): Use a `Set<cellIndex>` to track only alive cells. Iteration is O(liveCount) instead of O(gridSize). For sparse grids (typical of emergent patterns), this is 100–1000× faster than dense arrays. Neighbor counting still touches the full grid but skips dead cells entirely.
  - Rationale: Game of Life patterns tend toward sparse density (e.g., stable patterns occupy <5% of grid). Gliders and blinkers don't fill grids uniformly.
  - Alternative: Dense `Uint8Array` with bit-packing if grid is >90% alive (rare; see decision on grid size constraints).

**Generation Step (Pseudocode):**
```
nextGen(grid, ruleset):
  nextAlive = Set()
  for each cell in grid:
    neighbors = countAliveNeighbors(cell, ruleset.boundary)
    if cell is alive AND neighbors in ruleset.survivalRules:
      nextAlive.add(cell)
    if cell is dead AND neighbors in ruleset.birthRules:
      nextAlive.add(cell)
  grid.cells = nextAlive
  grid.generation += 1
  grid.liveCount = nextAlive.size
  return grid
```

**Rulesets:**
```
Ruleset {
  name: string,
  survivalRules: Set<number>,  // e.g., {2, 3} for classic Life
  birthRules: Set<number>,     // e.g., {3} for classic Life
}
```

Standard rules (classic Life: "S23/B3") are hardcoded; alternative rulesets (HighLife, Day and Night, Seeds) are provided as presets but can be extended by the user via a rule editor on the frontend.

### 2. Grid Renderer

**Responsibility:** Display current grid state with minimal redraws; scale to window/container size.

**Technology:** HTML5 Canvas (2D context)
**Approach:** Dirty-region invalidation
- Maintain a bitmask or Set of cells that changed since last render
- Redraw only the bounding box of changed cells
- Full redraw on zoom/pan or if dirty region exceeds 20% of grid (provisional threshold)

**Rendering Pipeline:**
```
render(grid, previousGrid, canvas, cellSize):
  changed = diffCells(grid, previousGrid)
  if changed.size === 0: return  // no-op
  
  ctx = canvas.getContext('2d')
  for each cell in changed:
    x, y = cell position
    if grid[cell] is alive:
      ctx.fillStyle = '#000'
    else:
      ctx.fillStyle = '#fff'
    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
  
  drawGridLines(ctx, canvas, cellSize)  // optional overlay
```

**Cell Size & Zoom:**
- Default cell size: 8 pixels (provisional; tuned for 100×100 grid on typical desktop ~1200px viewport)
- Zoom range: 4–20 pixels per cell (provisional)
- Panning via mouse drag to navigate large grids

**Trail Mode (Stretch Goal):**
- Maintain per-cell age (number of generations alive)
- Color gradient: young cells bright (RGB 0, 255, 0), aging cells fade to gray (RGB 128, 128, 128)
- Age reset to 0 when cell dies

### 3. User Interaction Layer

**Controls:**
- **Play/Pause Button:** Toggle `isRunning` flag
- **Step Button:** Execute one generation, pause
- **Speed Slider:** Control generation rate (ms per tick; range 50–1000ms, provisional)
- **Grid Resize:** Input fields or slider to set width/height (max 200×200, provisional; see decision)
- **Clear Grid:** Wipe all cells
- **Draw Tool:** Click/drag cells to toggle alive state
  - Single click: toggle cell
  - Drag: paint line of cells

**Pattern Library UI:**
- Dropdown or grid of presets (glider, blinker, pulsar, glider gun)
- Click to paste pattern at cursor or center of grid
- Custom patterns: save/load from localStorage

**Counters:**
- Generation display (read-only)
- Live cell count (read-only)

### 4. Pattern Storage & Library

**Storage Format:**
Patterns are stored as JSON in localStorage with the following structure:
```
Pattern {
  name: string,
  width: number,
  height: number,
  cells: number[],  // array of cell indices (row-major: y*width + x)
  created: number,  // unix timestamp
  description?: string
}
```

**Why cell indices instead of coordinates:** Reduces serialized size; indices are compact and unambiguous under row-major layout.

**Built-in Patterns:**
Hardcoded in source as pattern objects; no external fetch required. Examples:
- **Glider:** 3×3, 5 cells
- **Blinker:** 1×3, 3 cells
- **Pulsar:** 13×13, 48 cells
- **Glider Gun:** 36×9, ~36 cells

**Save/Load Interaction:**
- User clicks "Save Pattern," inputs name, pattern is serialized and stored in localStorage
- User selects pattern from library; deserialized and stamped onto grid (overlaying current state at selected position or auto-centered)
- localStorage quota exceeded: show error and suggest deleting old patterns

### 5. State Management

**Architecture:** Unidirectional dataflow
- Simulation engine produces new grid state deterministically
- React component holds grid state and previous grid state
- Each tick (triggered by timer or user action) calls engine, gets new state, passes to renderer
- User input (click/drag, controls) creates state mutations (edit grid, toggle play, etc.)

**Why separate simulation from view state:** Engine logic is pure and testable; React merely orchestrates rendering and user input.

**Undo/Redo (Future Enhancement):**
Maintain a history stack of past states; not in initial scope but architecture supports it (immutable state representation).

## Performance Analysis

**Theoretical Bottlenecks:**

1. **Neighbor Counting:** O(liveCount × 8) for each generation (check 8 neighbors per alive cell + dead cells adjacent to alive cells). For 100×100 grid with ~2,000 live cells: ~20,000 operations per tick. At 20 ticks/sec, ~400k neighbor checks/sec—negligible on modern hardware.

2. **Rendering:** Canvas redraws only changed cells. For blinkers, pulsar, gliders: <50 cells change per tick. At 20 ticks/sec, ~1,000 pixel fills/sec—well within capability.

3. **JavaScript Execution:** Game loop (nextGen + render) should complete in <20ms at 50 FPS. Profiling required if stretch goals (pattern detection, trail mode) add overhead.

**Optimization Candidates (if needed):**
- Offload simulation to Web Worker (proposed only if main thread blocks); blocks on user input responsiveness.
- Memoize neighbor counts if multiple rulesets are tested in quick succession (not applicable to single ruleset).
- Tile the grid and only simulate tiles with live cells (complex; defer until profiling shows necessity).

## Boundary Conditions

**Decision:** Wrap boundaries (toroidal grid).

**Rationale:** Allows patterns like gliders to loop infinitely; standard in cellular automaton software. Simplifies math (modulo arithmetic).

**Implementation:**
```
normalize(x, y, width, height):
  return ((x % width + width) % width, (y % height + height) % height)
```

**Alternative:** Clamped boundaries (cells at edges cannot birth/survive). This is the "standard" variant used by some software; requires explicit handling but is less surprising to new users.

## Open Technical Decisions

| Decision | Options | Implications |
|----------|---------|--------------|
| **Maximum grid size** | 100×100 (provisional), 200×200, 500×500, unlimited | Memory (Uint8Array for 500×500 = 250KB), simulation time, UI complexity. 100×100 fits typical viewport; 200×200 requires zoom/pan. Unlimited risks memory exhaustion. |
| **Default simulation speed** | 10 ticks/sec (provisional, 100ms per tick), 5 ticks/sec, 20 ticks/sec, user-configurable startup default | Affects perceived responsiveness. Too fast: hard to follow. Too slow: tedious waiting. 10 ticks/sec is a middle ground. |
| **Cell size scaling on resize** | Fixed pixels (e.g., always 8px), scale to fit viewport, user-selectable zoom | Fixed is simpler; scaling is more usable on mobile. Zoom adds complexity (pan required). |
| **Web Worker for simulation** | No (simulation on main thread), Yes (offload to worker thread) | No: simpler code, blocks on render (unlikely for <2000 cells). Yes: unblocks main thread for input, adds IPC overhead (message serialization). Defer until profiling shows main thread blocking. |
| **Trail mode implementation** | Per-cell age counter, separate layer (e.g., opacity decay), hybrid (age + fading blend) | Age counter is simplest; adds 4 bytes per cell. Opacity decay is visual but complex to expire old trails. Hybrid is best but most code. Defer until stretch goal is prioritized. |
| **RLE import/export** (Stretch Goal) | Parse/emit plaintext RLE format natively, use third-party library (e.g., conwaylife.com RLE parser) | Native: ~200 LOC; fragile if spec changes. Third-party: added dependency, auditing required. Or: support only save/load in native JSON format; RLE is optional if external compatibility isn't a priority. |
| **Pattern detection for cycles** (Stretch Goal) | Hash grid states in a ring buffer, compare to history; Fourier analysis on live cell count; simple heuristic (no change for N ticks) | Hashing is reliable but O(liveCount × N) memory for buffer of size N. Fourier requires signal processing lib. Heuristic is cheap but may miss gliders/artefacts. Defer until feature is prioritized. |
| **Boundary condition** | Wrap (toroidal, proposed), Clamp (fixed, dead at edges) | Wrap allows infinite motion; Clamp is intuitive (borders are hard walls). Chosen: wrap. Rationale: richer behavior. Alternative: clamp for educational simplicity. |

## Data Integrity & Guarantees

**No explicit privacy or anonymity guarantees** stated in the PRD. Patterns are stored locally; no transmission off-device.

**Data Durability:** localStorage is subject to user clearing browser data. No redundancy; users should be encouraged to export patterns (save/load) as backups.

**Pattern Validity:** On load, validate:
- Cell indices are within 0 to (width × height - 1)
- Width and height are positive integers < max grid size
- Reject invalid patterns with user-facing error; don't corrupt grid

## Deployment

**Single-page application:** Built bundle (JS, CSS) served statically from a web server (proposed). No backend required.

**Build Tool:** Webpack or Vite (proposed; not specified in PRD) to bundle React/Preact and code-split if needed.

**Hosting:** Static file server or CDN (proposed). Can run entirely offline once loaded.

## Stretch Goals Integration

1. **Alternative Rulesets:** Core engine already supports arbitrary rulesets (survivalRules, birthRules). UI adds a rule editor or dropdown to switch presets. Minimal architectural change.

2. **Pattern Detection:** Add a separate analysis module that runs after each tick if enabled. Hashes grid state, detects cycles or stable states. May require separate thread (see decision above).

3. **Trail Mode:** Extend Grid state to include per-cell age counter. Renderer uses age to compute color. Adds storage (~4 bytes/cell); otherwise orthogonal.

4. **RLE Import/Export:** Parse/emit RLE format; add import/export buttons to pattern library UI. Defer to post-MVP if external compatibility is not urgent.

## Testing Strategy

- **Unit:** Engine logic (neighbor counting, rule application, state transitions) tested against known patterns (glider, blinker).
- **Integration:** Renderer tested against engine output; UI events (click, drag, slider) tested to verify state mutation.
- **Performance:** Profile rendering and simulation at 100×100 grid size; target <50ms per tick (provisional).
- **Manual:** Visual inspection of pattern library rendering and save/load cycle.

## Success Criteria

- Grid displays correctly and updates in real time
- Play/pause/step controls behave as specified
- Draw tool is responsive (click/drag latency <100ms, provisional)
- All four library patterns render and animate correctly
- Save/load persists patterns across browser session restarts
- Generation counter and live cell count update accurately
- Simulation runs at configurable speed without blocking UI

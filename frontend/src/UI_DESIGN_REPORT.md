# UI Design Report — Shed Configurator

**Prepared:** April 11, 2026  
**Scope:** Full UI audit of the React + Three.js shed configurator application  
**Files reviewed:** App.jsx, ControlPanel.jsx, all controls/* components, PlacementDialog.jsx, PlacementList.jsx, ShedConfigurator.jsx, Canvas3D.jsx, shedStore.js, and all new shed/* components

---

## 1. Current UI Inventory

### 1.1 Layout

The application renders a two-column layout inside a dark (`bg-gray-900`) full-screen container. The left column is a fixed 384px (`w-96`) white card containing the ControlPanel. The right column fills remaining space with the Three.js canvas via `@react-three/fiber`. There is no responsive breakpoint handling — the layout is desktop-only.

### 1.2 ControlPanel Structure

The panel is a flex column divided into three zones:

| Zone | Behaviour | Contents |
|---|---|---|
| Header | `sticky top-0` | Title "Shed Configurator", subtitle |
| Main content | `overflow-y-auto` scrollable | All configuration sections |
| Footer | `sticky bottom-0` | Save / Load / Reset buttons |

### 1.3 Controls That Exist

#### Dimensions Section (`DimensionsSection.jsx`)
- **Width slider** — native `<input type="range">`, min 12, max 16, step 2. Emits integer via `onWidthChange`.
- **Length slider** — native `<input type="range">`, min 12, max 40, no step (defaults to 1). Emits integer via `onLengthChange`.
- **Size info block** — derived read-only display: `W × L = sq ft`.

Note: The CLAUDE.md specification states width should range 8–20 ft. The slider is clamped to 12–16, which prevents valid configurations at the edges. The length slider label says "20 ft" max but the input max attribute is 40. This is a direct contradiction between the visible affordance and the actual control behaviour.

#### Style Section (`StyleSection.jsx`)
- Two radio cards: **Gable** and **Barn**. The Barn option label reads "Barn (Barn)" — a likely copy-paste artifact that should read "Barn (Gambrel)".
- Selection state communicated via blue border and light blue background. No icon or roof silhouette preview.

#### Colors Section (inline in `ControlPanel.jsx`)
- Two `ColorSection` instances: Siding Color and Roof Color.
- `ColorSection` renders a `ColorPresetsDropdown` and/or a `ColorPicker` (these components exist but were not directly requested for review).

#### Trim & Details Section (`TrimAndDetailsSection.jsx`)
- **Trim color mode** — two radio inputs: Automatic / Manual.
- **Automatic sub-mode** — `<select>` with two options: Match Roof Color / Maximum Contrast.
- **Manual trim color** — `<input type="color">` with hex readout and swatch preview.
- **Effective trim color preview** — swatch shown when automatic mode is active.
- **Siding texture** — `<select>` with T1-11 and Smooth options.
- **Roof material** — `<select>` with Metal and Shingle options.

#### Doors & Windows Section (inline in `ControlPanel.jsx`)
- Section card contains `PlacementList`.
- `PlacementList` renders a scrollable list (max-h-64) of placed items with remove buttons and a "Clear All" action.
- When empty, shows a plain text instruction to click a wall. No affordance hint is provided about how clicking on the canvas triggers the placement flow.

#### PlacementDialog (`PlacementDialog.jsx`)
- Modal overlay. Opens when wall click is detected via `Canvas3D` raycasting (though `App.jsx` does not wire `Canvas3D` — it uses a manual `<Canvas>` and `BarnShed`/`GableShed` directly, bypassing the `onPlacementInteraction` callback chain entirely).
- Type selection: two radio buttons — Door, Window only.
- Size preset `<select>` dropdown.
- Custom size toggle (checkbox) revealing width and height number inputs.
- Size preview readout.
- Validation error and warning areas.
- Cancel / Add action buttons.

#### Action Buttons (`ActionButtons.jsx`)
- **Save Design** — full-width green gradient button. Uses `alert()` to report ID on success.
- **Load Design** / **Reset** — half-width row. Load uses `prompt()` for ID entry.

#### RangeInput (`RangeInput.jsx`)
- Accessible custom range slider with filled track, white thumb with blue border, focus ring. Accepts `id`, `min`, `max`, `value`, `onChange`, `step`, `ariaLabel`.
- This component is NOT used by `DimensionsSection`. The dimensions section uses raw `<input type="range">` elements without `aria-label` or associated `<label for>` linkage.

---

## 2. Gap Analysis

The following store features have no UI controls whatsoever.

### 2.1 Porch Configuration
**Store state:** `porch: { enabled: false, wall: 'front', depth: 6 }`  
**Actions:** `setPorch(partialConfig)`  
**3D component:** `Porch.jsx` is fully implemented and conditionally rendered by both `GableShed` and `BarnShed` when `porch.enabled === true`.  
**UI gap:** No toggle, no wall selector, no depth slider. The Porch component cannot be activated by a user under any circumstances through the current UI.

### 2.2 Gambrel Roof Pitch Controls
**Store state:** `roofLowerPitch: 5`, `roofUpperPitch: 10`  
**Actions:** `setRoofLowerPitch`, `setRoofUpperPitch`  
**3D component:** `GambrelRoof` receives `roofLowerPitch` and `roofUpperPitch` props from `BarnShed`.  
**UI gap:** No sliders or inputs exist. Pitch is permanently fixed at 5:12 and 10:12. These controls are only meaningful when `style === 'Barn'` but should appear conditionally.

### 2.3 Foundation Configuration
**Store state:** `foundationHeight: 1.5`, `foundationColor: '#8B7355'`  
**Actions:** `setFoundationHeight`, `setFoundationColor`  
**3D component:** `Skids` in both shed components uses `STANDARD_FOUNDATION` constants, not the store values. The store has the setters but the geometry ignores them.  
**UI gap:** No height slider and no color picker. Additionally, the 3D layer does not consume the store values even if controls were added.

### 2.4 Garage Door Placement Type
**Store typedef comment:** `type: 'door' | 'window' | 'garage_door' | 'barn_door'`  
**3D component:** `GarageDoor.jsx` is fully implemented.  
**UI gap:** `PlacementDialog` only offers "Door" and "Window" radio options. `PRESETS_BY_TYPE` in `placementPresets.js` has no `garage_door` key, so selecting it would throw a runtime error (undefined array access). No presets exist for garage door sizes.

### 2.5 Barn Door Placement Type
**Store typedef comment:** same as above.  
**3D component:** `BarnDoor.jsx` is fully implemented.  
**UI gap:** Same as garage door — no radio option in `PlacementDialog`, no presets in `PRESETS_BY_TYPE`.

### 2.6 Width Range Mismatch
**Store/CLAUDE.md spec:** 8–20 ft width.  
**Current slider:** min 12, max 16.  
**UI gap:** Four valid width values (8, 10, 18, 20 ft) are unreachable.

### 2.7 Placement Flow Not Wired in App.jsx
**Canvas3D.jsx** handles raycasting and calls `onPlacementInteraction`. However, `App.jsx` does not import or use `Canvas3D` — it manually instantiates `<Canvas>` with `BarnShed`/`GableShed` directly. The `PlacementDialog` is also never imported or rendered in `App.jsx`. The entire placement interaction pipeline (click wall → open dialog → add placement) is architecturally complete but never connected.

### 2.8 Price Does Not Reflect Placements or Porch
The `calculateTotalPrice` function only accounts for dimensions and Barn style surcharge. Garage doors, barn doors, and porches are known to add material cost but are not priced. This is a product gap surfaced by the UI audit but is ultimately a business logic concern.

---

## 3. Component-by-Component UX Critique

### 3.1 App.jsx

**Issue — Layout is desktop-only.**  
The `w-96` fixed sidebar and `flex gap-4` layout collapses below ~500px. The 3D canvas becomes unusable on tablet. No `md:` breakpoint or responsive alternative exists.

**Issue — Canvas3D bypassed.**  
App renders its own `<Canvas>` rather than `<Canvas3D>`. This means raycasting, placement interaction, the grid helper, and the `onShedMeshReady` callback are all absent. The working placement infrastructure in Canvas3D.jsx is dead code from App.jsx's perspective.

**Issue — Disconnected component tree.**  
`PlacementDialog` is defined but never rendered. `RangeInput` is defined but never used in the dimension controls. `Canvas3D` exists but is not used. The project appears to have two parallel implementation tracks that were never merged.

### 3.2 ControlPanel.jsx

**Issue — Prop drilling for colour handlers is unnecessary.**  
`ControlPanel` manually extracts state and creates handler wrappers (e.g. `handleWidthChange`) that do nothing beyond calling the store setter directly. The child components could call store setters themselves, as `TrimAndDetailsSection` already does.

**Issue — Save/Load use browser-native alert() and prompt().**  
`alert()` and `prompt()` are synchronous, block the page thread, cannot be styled, and are inaccessible to screen readers in many contexts. They also produce jarring UX ("Design saved! ID: abc123..."). These must be replaced with in-panel status feedback.

**Issue — No visual section separators.**  
The sections inside the scrollable area are visually distinct (white card backgrounds), but the "Colors" section heading and the "Doors & Windows" section heading are inline in `ControlPanel.jsx` rather than inside their respective components. This makes the layout brittle and harder to extend.

### 3.3 DimensionsSection.jsx

**Issue — Width range contradicts specification.**  
`min="12" max="16" step="2"` limits the user to three values: 12, 14, 16. The CLAUDE.md spec states 8–20 ft. Step of 2 is appropriate for lumber framing on-center (even-foot increments) but the range must be corrected.

**Issue — Length label says "20 ft" but input max is 40.**  
The hint text at the bottom of the length slider reads `<span>20 ft</span>` but `max="40"`. The user sees a false ceiling.

**Issue — Labels are not associated with inputs.**  
The `<label>` elements for Width and Length contain no `htmlFor` attribute, and the `<input>` elements have no `id`. Screen readers cannot associate the label text with the control.

**Issue — RangeInput is not used.**  
A polished, accessible `RangeInput` component with filled-track visuals and proper ARIA wiring exists in the project. `DimensionsSection` uses a raw `<input type="range">` instead.

**Issue — No keyboard step hint.**  
Users navigating by keyboard have no indication of the step increment.

### 3.4 StyleSection.jsx

**Issue — "Barn (Barn)" label.**  
The Barn option reads "Barn (Barn)". This should be "Barn (Gambrel)" to distinguish the roof geometry style from the building type.

**Issue — No visual differentiation between styles.**  
The two radio cards are text-only. Adding a simple SVG silhouette of each roof profile (triangular gable vs. hexagonal gambrel curve) would dramatically improve choice clarity without additional cognitive load.

**Issue — No pitch controls shown for Barn.**  
When "Barn" is selected, the gambrel pitch parameters become relevant. The controls to tune them do not appear.

**Issue — Inconsistent border style.**  
The selected state uses an inline `style` prop for borderColor and backgroundColor (`#2563eb`, `#eff6ff`). Tailwind classes like `border-blue-600` and `bg-blue-50` should be used instead to stay in the design system and enable dark mode later.

### 3.5 TrimAndDetailsSection.jsx

**Issue — Redundant description text is noise.**  
Below each `<select>`, a `<p>` repeats the selected option in different wording (e.g. "Selected: T1-11 (Vertical Ribbed)"). This is redundant — the select already displays the chosen option. Remove or replace with contextual help text.

**Issue — Effective trim color preview only visible in automatic mode.**  
When manual mode is active, the user sets an arbitrary hex value but there is no preview of how it looks against the current wall and roof combination.

**Issue — Trim section mixes unrelated concerns.**  
Trim color logic and material/texture selection are in the same section. Trim color is a color decision; siding texture and roof material are structural decisions. These should be in separate sections or clearly sub-headed.

**Issue — No visual texture preview.**  
Selecting "T1-11" vs. "Smooth" or "Metal" vs. "Shingle" has no visual hint in the panel. Small texture swatch thumbnails (even 32×32px SVG representations) would help users understand the choice without relying solely on the 3D view.

### 3.6 ActionButtons.jsx

**Issue — Visual hierarchy is wrong.**  
"Save Design" is styled as the primary action (full-width green gradient). "Reset" is secondary gray — appropriate. But "Load Design" is styled identically to a primary action (solid blue) despite being less frequently used than Save. Save and Load should not compete visually.

**Issue — No loading state for individual buttons.**  
`isLoading` disables all three buttons simultaneously. If only save is in progress, reset and load should remain available.

**Issue — Reset has no confirmation.**  
Clicking Reset immediately clears all configuration including placements. A destructive action of this magnitude requires a confirmation step (inline confirmation text or a small popover, not another `confirm()` dialog).

**Issue — Buttons lack accessible labels.**  
The disabled state uses `disabled:opacity-50` but provides no `aria-disabled` or `aria-busy` for screen readers. The loading state changes button text to "Saving..." which is acceptable, but the disabled siblings do not communicate their state change.

### 3.7 RangeInput.jsx

This is the best-implemented control in the panel. Observations:

**Strength:** Custom styled track with fill, accessible `aria-label` prop, focus ring with offset, cross-browser thumb styling via Tailwind JIT pseudo-element classes.

**Issue — parseInt hardcoded in handleChange.**  
`parseInt(e.target.value, 10)` means this component can only be used for integer values. Roof pitch sliders would need fractional steps (e.g. 0.5:12 increments). The `onChange` should pass the raw float and let consumers parse.

**Issue — No value tooltip on drag.**  
Users moving the slider have no real-time readout of the current value during drag. The label above shows the bound value but only updates on commit in React's event model.

**Issue — Track fill z-index conflict.**  
The visual fill layer uses `absolute` positioning with `top-3` and `pointer-events-none`. On some browsers the absolute layers can appear behind the native input. The `z-5` class is not a standard Tailwind utility (Tailwind has z-0 through z-50, but not z-5 in v3; v4 may include it). This should be verified.

### 3.8 PlacementDialog.jsx

**Issue — Not rendered anywhere.**  
As noted in Section 2.7, the dialog is never imported in `App.jsx`. The placement workflow is entirely broken from the user's perspective.

**Issue — Only Door and Window types offered.**  
Radio group has two options: "door" and "window". `garage_door` and `barn_door` types are supported by the store and have full 3D components but are absent from the dialog.

**Issue — Header title hardcodes type.**  
The `<h2>` reads "Add Door" or "Add Window" based on `placementType`. With four placement types this logic needs updating. Currently it would show "Add Window" for garage_door and barn_door if they were added to the radio group without updating the header.

**Issue — `usePreset` state is inverted and confusing.**  
The checkbox is "Custom Size" and is `checked={!usePreset}`. The state variable is named `usePreset` (true = use a preset, false = custom). When the user checks "Custom Size", `setUsePreset(!e.target.checked)` sets `usePreset = false`. This double negation is fragile. Rename to `isCustomSize` and use `checked={isCustomSize}`.

**Issue — Preset selection via `onChange` partially disconnected from state.**  
`handlePresetChange` updates `width` and `height` local state but does not update `selectedPreset` index state. On re-render, the select still shows the old index. The `useEffect` that syncs preset to state uses `selectedPreset` index, but `handlePresetChange` only updates dimensions, not the index. These are misaligned.

**Issue — Position display is technical, not human-readable.**  
The position readout "Position: 54% × 72%" is meaningless to most users. A translation like "54% from left, 72% from floor" would be more helpful, or a small 2D wall diagram showing a dot at the click position.

**Issue — Wall name relies on raw string formatting.**  
`wall.charAt(0).toUpperCase() + wall.slice(1)` is repeated in both `PlacementDialog` and `PlacementList`. This should be a shared utility.

**Issue — No way to adjust position after clicking.**  
Once the wall click determines `normalizedX` and `normalizedY`, the dialog offers no way to nudge the position. If the user clicked slightly off-center, they must cancel, click again, and hope for a better hit.

**Issue — Validation errors use alert().**  
`handleAddPlacement` calls `alert()` for errors and `confirm()` for overlap warnings. These break the design language and accessibility model.

**Issue — Dialog is not focus-trapped.**  
A modal overlay requires focus to be trapped within it. Tabbing while the dialog is open will move focus to controls behind the overlay.

**Issue — No close button in header.**  
The only way to close without adding is the "Cancel" button at the bottom, which requires scrolling the dialog if content is tall. A close "×" icon in the top-right is the expected affordance.

### 3.9 PlacementList.jsx

**Issue — Emoji used for type icons.**  
Type icons use emoji (door: 🚪, window: 🪟). Emoji rendering is inconsistent across platforms and screen readers announce emoji names in full, polluting list item narration. Use SVG icons or CSS-based representations.

**Issue — `garage_door` and `barn_door` types not handled.**  
`placement.type.charAt(0).toUpperCase() + placement.type.slice(1)` would display "Garage_door" with an underscore. The type display needs a lookup map.

**Issue — "Clear All" is destructive without confirmation.**  
Same concern as the Reset button — no confirmation before deleting all placements.

**Issue — List items are read-only.**  
Users can only remove placements. There is no edit action to change the type, size, or position of an existing placement. For complex designs this forces delete-and-recreate workflows.

**Issue — Scrollable list height is fixed at max-h-64.**  
With many placements this creates a nested scroll within the already-scrollable ControlPanel. This double-scroll UX is disorienting and should be avoided.

---

## 4. Wireframe Specifications for Missing Controls

All new controls should be inserted into the ControlPanel scrollable content area. The order should be: Dimensions → Style → [Gambrel Pitch, conditional] → Colors → Trim & Details → [Porch, new section] → Doors & Windows → Price.

### 4.1 Porch Toggle Section

Insert as a new card between Trim & Details and Doors & Windows.

```
┌─────────────────────────────────────────┐
│  PORCH                                  │
│                                         │
│  ┌──────────────────┐  ┌─────────────┐  │
│  │ [toggle switch]  │  │  Enabled    │  │
│  └──────────────────┘  └─────────────┘  │
│                                         │
│  [visible only when toggle is ON]       │
│                                         │
│  Wall                                   │
│  ┌──────┐ ┌─────┐ ┌──────┐ ┌───────┐   │
│  │Front │ │Back │ │ Left │ │ Right │   │
│  └──────┘ └─────┘ └──────┘ └───────┘   │
│  (segmented button group, single select) │
│                                         │
│  Depth                          6.0 ft  │
│  ├──────────────────────●───────────┤   │
│  2 ft                           12 ft   │
└─────────────────────────────────────────┘
```

**Interaction model:**
- Toggle switch fires `setPorch({ enabled: true/false })`.
- Wall selector fires `setPorch({ wall: 'front' | 'back' | 'left' | 'right' })`.
- Depth slider (`RangeInput`, min 2, max 12, step 0.5) fires `setPorch({ depth: value })`.
- Wall selector and depth slider are hidden when `porch.enabled === false` using conditional rendering.

**Tailwind classes for toggle switch:**
```
<button
  role="switch"
  aria-checked={porch.enabled}
  className={`relative w-11 h-6 rounded-full transition-colors ${
    porch.enabled ? 'bg-blue-600' : 'bg-gray-300'
  }`}
>
  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
    porch.enabled ? 'translate-x-5' : 'translate-x-1'
  }`} />
</button>
```

**Wall selector segmented button group:**
```
<div role="radiogroup" aria-label="Porch wall" className="flex gap-1">
  {['front','back','left','right'].map(wall => (
    <button
      key={wall}
      role="radio"
      aria-checked={porch.wall === wall}
      onClick={() => setPorch({ wall })}
      className={`px-3 py-2 text-sm rounded-md capitalize font-medium
        ${porch.wall === wall
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
    >
      {wall}
    </button>
  ))}
</div>
```

### 4.2 Gambrel Roof Pitch Sliders

Insert as a conditional sub-section inside the Style card, rendered only when `style === 'Barn'`.

```
┌─────────────────────────────────────────┐
│  ROOF STYLE                             │
│                                         │
│  ┌────────────┐  ┌────────────────────┐ │
│  │  [▲] Gable │  │  [∧∧] Barn/Gambrel│ │
│  └────────────┘  └────────────────────┘ │
│                                         │
│  [visible only when Barn is selected]   │
│                                         │
│  Lower Slope Pitch            5:12      │
│  ├─────●────────────────────────────┤   │
│  3:12                             9:12  │
│                                         │
│  Upper Slope Pitch            10:12     │
│  ├────────────────────●────────────┤    │
│  5:12                            15:12  │
│                                         │
│  [i] Lower pitch is the steeper bottom  │
│      section. Higher values = steeper.  │
└─────────────────────────────────────────┘
```

**Constraints:**
- `roofLowerPitch` range: 3–9, step 1 (measured in X:12 notation).
- `roofUpperPitch` range: 5–15, step 1.
- A validation rule must ensure `roofUpperPitch > roofLowerPitch` to prevent geometrically invalid roof profiles. Display an inline warning if the constraint is violated.
- Use `RangeInput` with `ariaLabel="Lower slope pitch in X colon 12 notation"`.
- Display value as `{value}:12` not as a raw number.

### 4.3 Foundation Controls

Insert as a new sub-section in the Trim & Details card, below roof material, or as a separate "Foundation" card.

```
┌─────────────────────────────────────────┐
│  FOUNDATION                             │
│                                         │
│  Skid Height                   1.5 ft   │
│  ├──────●──────────────────────────┤    │
│  0.5 ft                          3 ft   │
│                                         │
│  Skid Color                             │
│  ┌────────────────────────────────────┐ │
│  │ [swatch] #8B7355  Brown/Tan        │ │
│  └────────────────────────────────────┘ │
│  (click swatch to open color picker)    │
└─────────────────────────────────────────┘
```

**Note:** Before implementing the UI, the GableShed and BarnShed components must be updated to pass `foundationHeight` and `foundationColor` from the store to the `Skids` component instead of using `STANDARD_FOUNDATION` constants. The UI control alone will have no effect until that wiring is done.

### 4.4 Placement Type Expansion in PlacementDialog

The type selection area must expand from 2 options to 4. Recommended layout is a 2×2 grid of card-style radio buttons (matching the StyleSection pattern) rather than inline radio inputs.

```
┌─────────────────────────────────────────┐
│  Add Opening                            │
│  Front wall  ·  Position 54% from left  │
│                                         │
│  ┌──────────────┐   ┌──────────────┐    │
│  │  [door icon] │   │ [window icon]│    │
│  │   Door       │   │   Window     │    │
│  └──────────────┘   └──────────────┘    │
│  ┌──────────────┐   ┌──────────────┐    │
│  │ [garage icon]│   │ [barn icon]  │    │
│  │ Garage Door  │   │  Barn Door   │    │
│  └──────────────┘   └──────────────┘    │
│                                         │
│  [Size Preset dropdown]                 │
│  [Custom size fields, if checked]       │
│  [Size preview]                         │
│  [Validation messages]                  │
│                                         │
│  [Cancel]           [Add Opening]       │
└─────────────────────────────────────────┘
```

Typical size presets to add to `placementPresets.js`:

**garage_door presets:**
- Standard Single (9ft × 7ft)
- Standard Double (16ft × 7ft)
- Tall Single (9ft × 8ft)

**barn_door presets:**
- Small Barn Door (4ft × 7ft) — renders two 2ft leaves
- Standard Barn Door (6ft × 7ft) — renders two 3ft leaves
- Wide Barn Door (8ft × 8ft) — renders two 4ft leaves

---

## 5. Interaction Design for the Placement Workflow

### 5.1 Current State Assessment

The placement interaction pipeline exists in code but is not connected end-to-end:

1. `Canvas3D.jsx` handles raycasting and calls `onPlacementInteraction(placementData)` ✓
2. `Canvas3D` is not used in `App.jsx` — a manual `<Canvas>` is used instead ✗
3. `PlacementDialog` is never rendered in `App.jsx` ✗
4. `PlacementList` is rendered in `ControlPanel` and does display placements ✓

### 5.2 Recommended Placement Workflow

The workflow should support all four placement types with contextual guidance at each step.

**Step 1 — Entry: Selecting a wall**

Two entry methods should both be supported:

*Method A (spatial — current approach):* User clicks directly on a shed wall in the 3D canvas. The click position determines the initial placement coordinates. The PlacementDialog opens pre-populated with that wall and position.

*Method B (panel-driven — new):* Add an "Add Opening" button inside the Doors & Windows section of the ControlPanel. Clicking it opens PlacementDialog with `wall = 'front'` and `normalizedX = 0.5`, `normalizedY = 0.5` as defaults. The user then selects the wall and adjusts position manually inside the dialog. This method works without the 3D click infrastructure.

Both methods should coexist. Method B unblocks the feature until Method A's click wiring is repaired.

**Step 2 — Choosing the opening type**

The 2×2 type grid (see Section 4.4) is shown prominently at the top. The selected type updates the preset dropdown below it immediately. The dialog title updates: "Add Door", "Add Window", "Add Garage Door", "Add Barn Door".

**Step 3 — Selecting a size preset**

The preset dropdown is filtered to the selected type. Preset names should include both the human name and the dimensions: "Standard Single (9ft × 7ft)". The size preview updates immediately on selection.

For garage doors, an additional width validation should fire: the garage door width should not exceed the wall width minus 2 ft (clearance for framing).

For barn doors, the width validation must account for the sliding panels that extend beyond the opening — the panel leaves park outside the opening, so the effective wall space consumed is approximately 2× the door width. An inline warning should note "Barn door leaves will extend Xft beyond opening on each side."

**Step 4 — Adjusting position (enhanced from current)**

The current dialog displays position as a percentage pair with no ability to adjust. The enhanced dialog should include:

- A small 2D wall diagram (approximately 120×80px, rendered in SVG) showing the wall as a rectangle with:
  - A dot or rectangle representing the current opening position
  - Crosshairs or edge guides
  - The shed outline for context
- Optional: two nudge sliders (Horizontal position, Vertical position) beneath the diagram, using `RangeInput`, mapping 0–100% of the wall dimension.

This gives users visual confirmation of placement and a way to correct a misclick without cancelling.

**Step 5 — Validation feedback**

Validation errors and warnings (already implemented in `validatePlacement` and `checkPlacementConflicts`) should be displayed inline in the dialog — not via `alert()` and `confirm()`. The placement type card, preset dropdown, and size fields should all show red borders when their values contribute to a validation error. The "Add Opening" button should be disabled (not just visually dimmed — use `aria-disabled` correctly) when errors exist.

**Step 6 — Confirmation**

After clicking "Add Opening":
- The dialog closes with a smooth fade-out (200ms ease-out).
- A transient success toast appears in the top-right corner of the application for 3 seconds: "Single Door added to Front wall".
- The Doors & Windows section in the ControlPanel auto-scrolls to reveal the new placement in the list.
- The 3D view immediately reflects the new opening (existing behaviour via CSG).

**Step 7 — Editing an existing placement**

The PlacementList should provide an "Edit" button alongside each item's "Remove" button. Clicking Edit reopens PlacementDialog pre-populated with the existing placement's values. On confirm, `updatePlacement(id, changes)` is called instead of `addPlacement`.

### 5.3 Type-Specific Interaction Notes

**Door (standard swing door):**
- `normalizedY` default should place the bottom of the door at floor level. Currently the dialog places the center at the clicked Y, which may put the door floating or cut into the floor slab. The Y coordinate should be clamped so that `normalizedY - (height / wallHeight / 2) >= 0`.

**Window:**
- Default height placement at approximately 60% up the wall (typical sill height) is more natural than center-Y. Preset `normalizedY` should be `0.6` when opened from the panel.

**Garage Door:**
- Should only be placed on walls wide enough for the opening. The validation should also warn if the selected wall is a gable end (front/back on a gable shed), where the triangular portion above wall height would not frame cleanly.
- A garage door on the left or right wall of a short shed may be physically impossible (wall too narrow). Enforce this in validation.

**Barn Door:**
- The `BarnDoor` component renders sliding panels that park outside the opening. This means clear wall space is needed on both sides. The validation should check that `normalizedX - (width * 2 / wallSpan) >= 0` and `normalizedX + (width * 2 / wallSpan) <= 1` approximately — i.e. the parked leaves fit on the wall.
- Barn doors are visually associated with barn-style structures. Consider surfacing a contextual hint when this type is chosen with `style === 'Gable'`: "Barn doors are typically used on Barn-style sheds."

---

## 6. Accessibility Findings

### 6.1 Keyboard Navigation

**Critical — PlacementDialog has no focus trap.**  
When the modal overlay is open, keyboard focus is not trapped inside it. Pressing Tab will reach controls behind the overlay, which are invisible due to the dark backdrop. Implementation: use `focus-trap-react` or a manual `keydown` handler to keep focus within the dialog's focusable elements. On open, focus should move to the dialog's first interactive element (the type selection). On close, focus should return to the trigger element.

**Critical — Canvas interaction is mouse-only.**  
Clicking on a 3D wall to place openings requires mouse or touch input. Keyboard users have no equivalent path. The "Add Opening" panel button (Method B from Section 5.2) is the keyboard-accessible alternative and must be implemented.

**High — DimensionsSection inputs have no associated labels.**  
`<label>` elements lack `htmlFor` and `<input>` elements lack `id`. A screen reader user navigating by form control will hear the input type but not its name. Fix: add matching `htmlFor`/`id` pairs, or wrap each input in its label element.

**High — StyleSection radio inputs have no `id`.**  
Radio inputs lack `id` attributes, so the wrapping `<label>` elements cannot be reliably announced as labels by all screen reader/browser combinations. Add `id="style-gable"` and `id="style-barn"` with matching `htmlFor`.

**Medium — ActionButtons disabled state is not communicated.**  
`disabled={isLoading}` sets the HTML `disabled` attribute, which screen readers do announce. However `aria-busy` is not set on the parent container during loading, and no live region announces completion.

**Medium — PlacementList "Remove" buttons lack context.**  
Each "Remove" button has only the text "Remove" with no reference to which item it removes. A screen reader user navigating a list of 5 placements cannot distinguish them. Fix: `aria-label="Remove Front wall door 3ft by 6.5ft"`.

**Medium — "Clear All" has no confirmation.**  
A destructive action triggered by a keyboard-accessible button with no confirmation is particularly dangerous for keyboard users who may activate it accidentally.

**Low — Toggle switch (proposed) requires ARIA role.**  
The proposed toggle switch for the porch must use `role="switch"` and `aria-checked`. A `<button>` element with visual toggle styling but no ARIA semantics would not be understood by screen readers.

### 6.2 Color Contrast

The following combinations require verification against WCAG 2.1 AA minimums (4.5:1 for normal text, 3:1 for large text and UI components):

| Element | Foreground | Background | Notes |
|---|---|---|---|
| Section headings | `text-gray-900` (#111827) | `bg-white` (#FFFFFF) | Passes (21:1) |
| Label text | `text-gray-700` (#374151) | `bg-white` (#FFFFFF) | Passes (~10:1) |
| Hint/description text | `text-gray-500` (#6B7280) | `bg-white` (#FFFFFF) | **Needs check** — gray-500 on white is approximately 3.9:1, which passes AA for normal text but is close to the boundary |
| Value display (blue) | `text-blue-600` (#2563EB) | `bg-white` (#FFFFFF) | Passes (~5.9:1) |
| Validation errors | `text-red-600` | `bg-red-50` | **Needs check** — red-600 on red-50 background requires measurement |
| Validation warnings | `text-yellow-700` (#B45309 approx) | `bg-yellow-50` | Passes if yellow-700 is used; yellow-600 on yellow-50 may fail |
| Empty state text | `text-gray-500` | `bg-white` | Same concern as hint text above |
| "Clear All" button | `text-red-600` | `bg-red-100` | **Likely fails** — red-600 on red-100 is approximately 3.1:1, below 4.5:1 threshold |
| Save button text | `text-white` | gradient from-green-500 | Green-500 (#22C55E) on white does not meet 3:1 — but text is white on green, which passes |
| Disabled button text | `text-white opacity-50` | `bg-gray-400 opacity-50` | **Fails** — opacity reduces effective contrast below acceptable levels |

**Recommendation:** Audit all color combinations using a contrast ratio tool. Replace transparent/opacity-reduced disabled states with explicit low-contrast palette values (e.g. `text-gray-400` on `bg-gray-100`) that still technically communicate "disabled" while meeting minimum ratios.

### 6.3 Touch Targets

WCAG 2.5.5 (Level AAA) specifies 44×44px; WCAG 2.5.8 (Level AA in 2.2) specifies 24×24px minimum with adequate spacing. Apple HIG recommends 44×44pt.

| Control | Estimated height | Issue |
|---|---|---|
| Radio inputs (StyleSection) | ~16px clickable area | Falls short — label `<p3>` padding increases effective area to ~44px if the label wraps the input ✓ |
| Radio inputs (TrimSection) | ~16px input, label not wrapped | **Too small** — the `<label>` wraps the input but uses `gap-2` not padding, so the clickable region is only the text + input |
| "Remove" buttons (PlacementList) | `py-1 px-3` ≈ 28px height | Below 44px target |
| "Clear All" button | `py-1 px-2` ≈ 26px height | Below 44px target |
| Color input swatch | `w-12 h-10` = 40px height | Just below 44px |
| RangeInput thumb | 20×20px (`w-5 h-5`) | **Fails** — thumb is 20px. Consider 24px minimum |
| Action buttons | `py-3` = ~44px total | Passes ✓ |
| Save/Load/Reset | `py-2` on Load/Reset ≈ 36px | Slightly short |

### 6.4 Screen Reader Considerations

**Missing landmark regions.**  
The ControlPanel has no `<nav>`, `<main>`, `<aside>`, or `<section>` elements with `aria-label`. Screen reader users cannot navigate by landmark. At minimum, the control panel column should be a `<aside aria-label="Shed configuration">` and the canvas should have `role="img" aria-label="3D shed preview"` or `role="application"` with descriptive labelling.

**3D canvas is inaccessible.**  
The Three.js canvas has no accessible description of the current shed configuration. A screen reader user gets no information from the visual. An `aria-live` region that summarises the current configuration (e.g. "12 by 16 foot Gable shed with cedar siding, black metal roof") should be maintained outside the canvas and updated when store state changes.

**PlacementList emojis.**  
Emojis 🚪 and 🪟 in list items will be read aloud as "door" and "window" by most screen readers, which is tolerable but not ideal. In the context "1. 🚪 Door, Front wall, 3.0ft × 6.5ft", the word "door" appears twice. Use `aria-hidden="true"` on the emoji span to suppress the duplicate.

**Alert/confirm dialogs.**  
`window.alert()` and `window.confirm()` are announced by screen readers but outside the application's DOM. Replacing with in-DOM feedback maintains context and does not interrupt the virtual cursor position.

---

## 7. Priority-Ordered Recommendations

### Priority 1 — Critical (Blocks core user journeys)

**P1-A: Wire the placement pipeline.**  
Replace the manual `<Canvas>` in `App.jsx` with `<Canvas3D>`, and render `<PlacementDialog>` in `App.jsx` connected to the `onPlacementInteraction` callback. Without this, users cannot place any doors or windows. This is the single highest-impact fix.

**P1-B: Add "Add Opening" button as panel-driven fallback.**  
Simultaneously add an "Add Opening" button in the Doors & Windows ControlPanel section that opens PlacementDialog with a default wall and center position. This provides keyboard-accessible entry and unblocks users who cannot or prefer not to click the 3D canvas.

**P1-C: Replace alert() and confirm() with in-DOM feedback.**  
Every use of `window.alert()`, `window.confirm()`, and `window.prompt()` must be replaced. Use toast notifications for success messages, inline error states for validation, a confirmation popover for destructive actions (Reset, Clear All), and a text input within the ControlPanel for Load Design (not `prompt()`).

**P1-D: Fix DimensionsSection label association and correct the range bounds.**  
Add `htmlFor`/`id` pairs to all label+input relationships in DimensionsSection. Correct width range to 8–20, step 2. Correct the length end-label to match the actual max attribute. Replace raw `<input type="range">` with the existing `RangeInput` component.

### Priority 2 — High (Significant gaps in feature coverage)

**P2-A: Add Porch controls.**  
Implement the PorchSection component described in Section 4.1. This activates a fully implemented 3D feature. Estimated implementation effort: one new component (~80 lines), no store changes required.

**P2-B: Add garage_door and barn_door to PlacementDialog.**  
Expand the type selection to a 2×2 grid, add presets to `placementPresets.js`, and update the dialog header. Both 3D components are complete. Estimated effort: modify two files, add presets data.

**P2-C: Add Gambrel pitch sliders.**  
Add conditional pitch controls inside StyleSection when Barn is selected (Section 4.2). Wire to `setRoofLowerPitch` and `setRoofUpperPitch`. Add inter-field validation that lower pitch < upper pitch.

**P2-D: Fix the Barn label typo.**  
"Barn (Barn)" → "Barn (Gambrel)". One-line change with zero effort.

**P2-E: Trap focus in PlacementDialog.**  
Implement focus trapping when the modal is open and focus restoration on close.

### Priority 3 — Medium (UX quality and consistency)

**P3-A: Add position adjustment to PlacementDialog.**  
Implement the 2D wall diagram and horizontal/vertical position sliders described in Section 5.2 Step 4. This significantly reduces user frustration from misclicks.

**P3-B: Add "Edit" to PlacementList items.**  
Add an Edit button that reopens PlacementDialog pre-populated, enabling modification without delete-and-recreate.

**P3-C: Add icons/silhouettes to StyleSection cards.**  
SVG roof profile silhouettes (triangle for Gable, hexagonal curve for Gambrel) make the choice immediately clear.

**P3-D: Unify `useRangeInput` usage.**  
All range inputs (dimensions, future pitch, future foundation height, future porch depth) should use the `RangeInput` component for consistent behaviour and accessible wiring. Remove raw `<input type="range">` from DimensionsSection.

**P3-E: Remove redundant description text from TrimAndDetailsSection.**  
Delete the `<p>Selected: ...</p>` paragraphs that repeat the selected value. Replace with contextual help text that adds information not already visible.

**P3-F: Confirm before Reset and Clear All.**  
Add inline confirmation for both destructive actions.

**P3-G: Replace PlacementList emojis with SVG icons.**  
Implement a small icon set for door, window, garage_door, barn_door with `aria-hidden="true"` and accessible text labels.

**P3-H: Foundation controls (after wiring Skids to store).**  
Implement the FoundationSection component (Section 4.3). This requires the 3D layer fix (passing store values to Skids) as a prerequisite.

### Priority 4 — Low (Polish and accessibility hardening)

**P4-A: Add aria-live region summarising current configuration.**  
Provide screen reader users with a text description of the current shed state that updates when significant changes are made.

**P4-B: Implement responsive layout.**  
Add breakpoints so the panel stacks above the canvas on narrow viewports (`flex-col` at `<md:`). Consider a drawer/sheet pattern for the control panel on mobile.

**P4-C: Audit and fix color contrast.**  
Specifically: red-600 on red-100 (Clear All button), gray-500 on white (description text), yellow-600 on yellow-50 (warnings). Update to passing alternatives.

**P4-D: Increase touch target sizes.**  
Raise Remove buttons, Clear All, and radio inputs to 44×44px minimum. Increase RangeInput thumb to 24px.

**P4-E: Add aria-label to landmark regions.**  
Wrap ControlPanel in `<aside>`, add `role="img"` or `role="application"` to the canvas container.

**P4-F: Add keyboard navigation hint to canvas interaction.**  
A small tooltip or persistent label on the canvas area: "Click any wall to place an opening. Use the panel controls if you prefer not to interact with the 3D view."

**P4-G: Add `aria-label` to all "Remove" buttons with item context.**  
See Section 6.1 recommendation.

---

## Summary Table

| ID | Description | Effort | Impact |
|---|---|---|---|
| P1-A | Wire placement pipeline (Canvas3D + PlacementDialog in App) | Medium | Critical |
| P1-B | Panel-driven "Add Opening" button | Small | Critical |
| P1-C | Replace alert/confirm/prompt with DOM feedback | Medium | Critical |
| P1-D | Fix DimensionsSection labels + range bounds + use RangeInput | Small | High |
| P2-A | Porch section UI | Small | High |
| P2-B | Garage and barn door in PlacementDialog | Small | High |
| P2-C | Gambrel pitch sliders | Small | Medium |
| P2-D | Fix "Barn (Barn)" label | Trivial | Low |
| P2-E | Focus trap in PlacementDialog | Small | High |
| P3-A | Position adjustment in PlacementDialog | Medium | Medium |
| P3-B | Edit action in PlacementList | Medium | Medium |
| P3-C | SVG roof icons in StyleSection | Small | Medium |
| P3-D | Unify RangeInput usage | Small | Medium |
| P3-E | Remove redundant description text | Small | Low |
| P3-F | Confirm before destructive actions | Small | Medium |
| P3-G | Replace emoji icons with SVG | Small | Medium |
| P3-H | Foundation controls (requires 3D layer fix) | Medium | Low |
| P4-A | Aria-live region for configuration summary | Small | Medium |
| P4-B | Responsive layout | Large | Medium |
| P4-C | Color contrast audit and fixes | Small | High |
| P4-D | Touch target sizing | Small | Medium |
| P4-E | Landmark ARIA regions | Small | Low |
| P4-F | Canvas keyboard hint | Trivial | Low |
| P4-G | Contextual aria-label on Remove buttons | Small | Medium |

# Shed Configurator - Visual Design Guide

## Control Panel Layout Diagram

```
┌────────────────────────────────────────────────┐
│           HEADER (Sticky, White)               │ 80px height
│  Shed Configurator                             │
│  Customize your design in real time            │
└────────────────────────────────────────────────┘
│ ┌──────────────────────────────────────────┐   │
│ │ DIMENSIONS (Card, White)                 │   │
│ │ ──────────────────────────────────────────│   │
│ │ Width                          10 ft      │   │ 16px padding
│ │ ════════════════════════════════════════  │   │
│ │ 8 - 20 feet                               │   │
│ │                                           │   │
│ │ Length                         12 ft      │   │
│ │ ══════════════════════════════════════════│   │
│ │ 8 - 24 feet                               │   │
│ │ ──────────────────────────────────────────│   │
│ │ Size: 10W x 12L    Square feet: 120      │   │
│ └──────────────────────────────────────────┘   │ 24px gap
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ ROOF STYLE (Card, White)                 │   │
│ │ ──────────────────────────────────────────│   │
│ │ ◌ Gable Roof                             │   │
│ │   Classic peaked roof design              │   │
│ │                                           │   │
│ │ ◉ Barn Roof          [Selected/Blue]     │   │
│ │   Traditional barn-style roof             │   │
│ └──────────────────────────────────────────┘   │ 24px gap
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ COLORS (Card, White)                     │   │
│ │ ──────────────────────────────────────────│   │
│ │ Siding Color                              │   │
│ │ [Presets] [Custom]                        │   │
│ │                                           │   │
│ │ ┌──────┐ Classic Red                     │   │
│ │ │  ██  │ #C41E3A                         │   │
│ │ └──────┘                                  │   │
│ │                                           │   │
│ │ ┌────────────────────────────────────┐   │   │
│ │ │ ▼ Classic Red                      │   │   │
│ │ │ [Dropdown open]                    │   │   │
│ │ └────────────────────────────────────┘   │   │
│ │                                           │   │
│ │ Roof Color                                │   │
│ │ [Presets] [Custom]                        │   │
│ │ ┌──────┐ Black Asphalt                   │   │
│ │ │  ██  │ #1a1a1a                         │   │
│ │ └──────┘                                  │   │
│ │ ┌────────────────────────────────────┐   │   │
│ │ │ ▼ Black Asphalt                    │   │   │
│ │ └────────────────────────────────────┘   │   │
│ └──────────────────────────────────────────┘   │ 24px gap
│                                                 │
│ ┌──────────────────────────────────────────┐   │
│ │ PRICE DISPLAY (Card, Blue Gradient)      │   │
│ │ ──────────────────────────────────────────│   │
│ │ $1,280.00                                 │   │ 30px bold
│ │                                           │   │
│ │ Base: $800           (breakdown)          │   │
│ │ +Barn: $500                               │   │
│ │ Total: $1,280                             │   │
│ │                                           │   │
│ │ Prices are estimates...                   │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │ (Footer)
│ │ [SAVE DESIGN] (Green, Full Width)        │   │ Sticky
│ │ [LOAD]  [RESET] (Blue & Gray, 50/50)     │   │
│ └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

## Color Preset Dropdown (Opened)

```
┌──────────────────────────────────────┐
│ ▲ Classic Red                        │ Closed state
└──────────────────────────────────────┘
              ↓ (click/expand)
┌──────────────────────────────────────┐
│ TRADITIONAL                          │ Category header
├──────────────────────────────────────│
│ ┌────┐ Classic Red         ✓         │ Selected
│ │ ██ │ #C41E3A             │         │
│ │    │ WCAG 5.2:1          │         │
│ └────┘                               │
│ ┌────┐ Barn Red                      │ Not selected
│ │ ██ │ #8B3A3A             │         │
│ │    │ WCAG 7.5:1          │         │
│ └────┘                               │
│                                      │
│ NATURAL                              │ Category header
├──────────────────────────────────────│
│ ┌────┐ Forest Green                  │
│ │ ██ │ #2D5016             │         │
│ │    │ WCAG 10.8:1         │         │
│ └────┘                               │
│ ┌────┐ Sage Green                    │
│ │ ██ │ #6B8E71             │         │
│ │    │ WCAG 5.1:1          │         │
│ └────┘                               │
│                                      │
│ CLASSIC                              │ Category header
├──────────────────────────────────────│
│ ┌────┐ White                         │
│ │ ██ │ #FFFFFF             │         │
│ │    │ WCAG 18.5:1         │         │
│ └────┘                               │
│ ┌────┐ Tan Beige                     │
│ │ ██ │ #C9B8A3             │         │
│ │    │ WCAG 3.1:1          │         │
│ └────┘                               │
│                                      │
│ MODERN                               │ Category header
├──────────────────────────────────────│
│ ┌────┐ Charcoal Gray                 │
│ │ ██ │ #3F4F58             │         │
│ │    │ WCAG 10.2:1         │         │
│ └────┘                               │
│ ┌────┐ Navy Blue                     │
│ │ ██ │ #1B3A57             │         │
│ │    │ WCAG 11.2:1         │         │
│ └────┘                               │
│ ┌────┐ Deep Black                    │
│ │ ██ │ #1a1a1a             │         │
│ │    │ WCAG 19.5:1         │         │
│ └────┘                               │
└──────────────────────────────────────┘
```

## Color Palette Visual Reference

### Siding Colors (10 Total)

```
Traditional Colors:
┌─────────────────────────────────┐
│ [█ #C41E3A] Classic Red         │ 5.2:1 contrast
│ [█ #8B3A3A] Barn Red            │ 7.5:1 contrast
└─────────────────────────────────┘

Natural Colors:
┌─────────────────────────────────┐
│ [█ #2D5016] Forest Green        │ 10.8:1 contrast
│ [█ #6B8E71] Sage Green          │ 5.1:1 contrast
│ [█ #8B7355] Weathered Wood      │ 6.4:1 contrast
└─────────────────────────────────┘

Classic Colors:
┌─────────────────────────────────┐
│ [█ #FFFFFF] White               │ 18.5:1 contrast
│ [█ #C9B8A3] Tan Beige           │ 3.1:1 contrast
└─────────────────────────────────┘

Modern Colors:
┌─────────────────────────────────┐
│ [█ #3F4F58] Charcoal Gray       │ 10.2:1 contrast
│ [█ #1B3A57] Navy Blue           │ 11.2:1 contrast
│ [█ #1a1a1a] Deep Black          │ 19.5:1 contrast
└─────────────────────────────────┘
```

### Roof Colors (8 Total)

```
Asphalt/Dark Grays:
┌─────────────────────────────────┐
│ [█ #1a1a1a] Black Asphalt       │ 19.5:1 contrast
│ [█ #4A4A4A] Charcoal Gray       │ 11.8:1 contrast
│ [█ #7A8A9A] Weathered Gray      │ 5.2:1 contrast
└─────────────────────────────────┘

Browns & Naturals:
┌─────────────────────────────────┐
│ [█ #4A3728] Dark Brown          │ 13.2:1 contrast
│ [█ #2D5016] Dark Green          │ 10.8:1 contrast
│ [█ #704214] Bronze              │ 10.5:1 contrast
└─────────────────────────────────┘

Cool Tones:
┌─────────────────────────────────┐
│ [█ #5A6B7A] Slate Gray          │ 8.5:1 contrast
│ [█ #A83232] Red Tile            │ 6.8:1 contrast
└─────────────────────────────────┘
```

## Typography Scale

```
Header (H1)
████████████████████████████████
████████ Shed Configurator ████████
████████████████████████████████
(24px, bold, gray-900)

Section Header (H2)
█████████████████████████████
████ DIMENSIONS ████
█████████████████████████████
(14px, semibold, uppercase, gray-900)

Label (Medium)
████████████████
██ Width ██
████████████████
(14px, medium, gray-700)

Value (Large Bold)
██████
█ 10 ft █
██████
(18px, bold, gray-900)

Body Text
█████████████████████████████
██ 8 - 20 feet ██
█████████████████████████████
(14px, normal, gray-600)

Help Text (Small)
███████████████████████
█ Range: 8-20 feet █
███████████████████████
(12px, gray-500)
```

## Component States

### Button States

```
Default:
┌─────────────────────────┐
│  SAVE DESIGN            │ bg-green-600
└─────────────────────────┘

Hover:
┌─────────────────────────┐
│  SAVE DESIGN            │ bg-green-700 (darker)
└─────────────────────────┘

Focus:
┌──────────────────────────────┐
│┌─────────────────────────────┐│
││ SAVE DESIGN                 ││ Ring-2 ring-green-500
│└─────────────────────────────┘│
└──────────────────────────────┘

Active/Pressed:
┌─────────────────────────┐
│  SAVE DESIGN            │ bg-green-800
└─────────────────────────┘
```

### Range Slider States

```
Default:
█────────────────────────● (thumb)
  Gray track    Blue fill

Hover (on thumb):
█────────────────────────◉ (larger, shadow)
  Gray track    Blue fill

Focus:
█────────────────────────● ◯◯ (ring)
  Gray track    Blue fill

Dragging:
█────────────────────────◉ (active)
  Gray track    Blue fill extended
```

### Dropdown Button States

```
Closed, Default:
┌──────────────────────────┐
│ ◇ Classic Red         ▼  │
└──────────────────────────┘

Closed, Hover:
┌──────────────────────────┐
│ ◇ Classic Red         ▼  │ (subtle shade shift)
└──────────────────────────┘

Open (Expanded):
┌──────────────────────────┐
│ ◇ Classic Red         ▲  │ (chevron rotates)
└──────────────────────────┘
┌──────────────────────────┐
│ TRADITIONAL              │
│ ┌─────────────────────┐  │
│ │ ◇ Classic Red   ✓   │  │ (selected)
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │ ◇ Barn Red          │  │
│ └─────────────────────┘  │
│ NATURAL                  │
│ ┌─────────────────────┐  │
│ │ ◇ Forest Green      │  │
│ └─────────────────────┘  │
│ ...                      │
└──────────────────────────┘

Focus:
┌────────────────────────────┐
│◯ ◇ Classic Red         ▼  ◯│ (ring around)
└────────────────────────────┘
```

### Radio Card States

```
Unselected:
┌──────────────────────────┐
│ ◯ Gable Roof             │ Gray border
│   Classic peaked design   │ White/gray bg
└──────────────────────────┘

Hover (Unselected):
┌──────────────────────────┐
│ ◯ Gable Roof             │ Slightly darker border
│   Classic peaked design   │ White bg
└──────────────────────────┘

Selected:
┌──────────────────────────┐
│ ◉ Barn Roof              │ Blue-600 border
│   Barn-style roof        │ Blue-50 bg
└──────────────────────────┘

Focus:
┌────────────────────────────┐
│◯ ◉ Barn Roof              ◯│ Ring around
│   Barn-style roof          │
└────────────────────────────┘
```

## Spacing Reference Grid

```
4px spacing grid visualization:

Header (80px):
┌─────────────────────────────────┐ 20px top
│ Shed Configurator               │
│ Customize your design...        │ 8px between
└─────────────────────────────────┘ 20px bottom

Main content padding: 24px (6 units)
Section gap: 24px (6 units)
Card padding: 16px (4 units)

Component internal:
┌──────────────────────┐
│ Label        8px     │
│ [Control]           │
│             8px      │
│ Help text           │
└──────────────────────┘
```

## Focus Management Flow

```
Keyboard Navigation (Tab order):
1. Header (not interactive)
   ↓ Tab
2. DimensionsSection
   - Width slider ← Focus here, use Arrow keys
     ↓ Tab
   - Length slider ← Focus here, use Arrow keys
     ↓ Tab
3. StyleSection
   - Gable radio ← Focus here, use Arrow keys
   - Barn radio ← Or here
     ↓ Tab
4. ColorSection (Siding)
   - Mode toggle (Presets) ← Focus here
     ↓ Tab
   - Dropdown/Picker ← Focus here
     ↓ Tab
5. ColorSection (Roof)
   - Same as siding
     ↓ Tab
6. PriceDisplay (no interaction)
     ↓ Tab
7. ActionButtons
   - Save button ← Focus here, press Enter
     ↓ Tab
   - Load button ← Focus here, press Enter
     ↓ Tab
   - Reset button ← Focus here, press Enter
```

## Responsive Behavior

### Desktop (1024px+)
```
┌──────────────────────────┐
│  384px Fixed Width Panel │
│  Sticky Header           │
│  Scrollable Content      │
│  Sticky Footer           │
└──────────────────────────┘
```

### Tablet (768px - 1024px)
```
┌─────────────────────────────────┐
│  Adjusted Width (may be wider)   │
│  Same layout structure            │
└─────────────────────────────────┘
```

### Mobile (< 768px)
```
┌────────────────────┐
│ Full Width         │
│ Portrait or        │
│ Landscape mode     │
│ All features work  │
└────────────────────┘
```

## Accessibility Visual Indicators

### Focus Indicators (Blue Ring)
```
Normal button:        Focused button:
┌─────────────────┐  ┌──────────────────────┐
│ Save Design     │  │◯ Save Design        ◯│ 2px ring
└─────────────────┘  └──────────────────────┘
                      2px offset

```

### Color Contrast Examples

```
Highest Contrast (21:1):
█████████████████████
█ Dark text on white █  Very readable
█████████████████████

High Contrast (8.6:1):
░░░░░░░░░░░░░░░░░░░░░
░ White text on blue  ░  Easy to read
░░░░░░░░░░░░░░░░░░░░░

Minimum AA (4.5:1):
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓ Gray text on white ▓  Acceptable
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

Below AA (3.1:1):
░░░░░░░░░░░░░░░░░░
░ May fail for text  ░  Not compliant
░░░░░░░░░░░░░░░░░░
```

## Touch Target Sizes

```
Minimum Size (44x44px):
┌─────────────────────┐
│                     │
│   Button (44px)    │
│                     │
└─────────────────────┘

Spacing Between Targets (8px):
┌──────────────┐
│   Button 1   │ 8px
└──────────────┘
┌──────────────┐
│   Button 2   │
└──────────────┘
```

---

This visual guide helps understand the layout, spacing, colors, and states at a glance.

For detailed specifications, see LAYOUT_SPECIFICATION.md and DESIGN_SYSTEM.md.

# Shed Configurator - Visual Layout Specification

## Layout Overview

The redesigned control panel uses a clear vertical layout with three distinct zones:

```
┌─────────────────────────────────┐
│         HEADER (STICKY)         │  Height: 80px
│    Shed Configurator            │  Padding: 20px vertical, 24px horizontal
│    Customize your design...     │  Border-bottom: 1px gray-200
├─────────────────────────────────┤
│                                 │
│     MAIN CONTENT (SCROLLABLE)   │  Padding: 24px all
│                                 │  Section gap: 24px (space-y-6)
│  ┌──────────────────────────┐   │
│  │ DIMENSIONS SECTION       │   │  384px max-width (w-96)
│  ├──────────────────────────┤   │  Card: white, 1px gray border
│  │ Width:          [slider] │   │  Padding: 16px
│  │ Length:         [slider] │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ STYLE SECTION            │   │
│  ├──────────────────────────┤   │
│  │ [Gable Card] [Barn Card] │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ COLORS SECTION           │   │
│  ├──────────────────────────┤   │
│  │ Siding Color:            │   │
│  │ [Swatch] [Dropdown/Picker]   │
│  │                          │   │
│  │ Roof Color:              │   │
│  │ [Swatch] [Dropdown/Picker]   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ PRICE DISPLAY            │   │
│  │ $1,280.00                │   │  Blue gradient bg
│  │ (with breakdown)         │   │
│  └──────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│      ACTIONS (STICKY FOOTER)    │  Height: 140px (approx)
│                                 │  Padding: 16px vertical, 24px horizontal
│  ┌──────────────────────────┐   │  Border-top: 1px gray-200
│  │   [SAVE DESIGN BTN] FullW│   │
│  ├────────────┬─────────────┤   │
│  │ [LOAD] 50% │ [RESET] 50% │   │
│  └────────────┴─────────────┘   │
└─────────────────────────────────┘
```

## Detailed Measurements

### Container
- **Width**: 384px (Tailwind: w-96)
- **Height**: 100% (fills parent)
- **Background**: Gradient gray-50 to gray-100
- **Overflow**: Auto (content scrolls)

### Header (Sticky)
- **Position**: `sticky top-0`
- **Z-index**: 10
- **Width**: 384px
- **Height**: Auto (80px typical)
- **Padding**: 20px top/bottom, 24px left/right
- **Border-bottom**: 1px solid #e5e7eb (gray-200)
- **Shadow**: shadow-sm
- **Background**: white

#### Header Content
```
H1: Shed Configurator (24px bold, gray-900)
P:  Customize your design in real time (14px normal, gray-500)
```

**Spacing**: 8px between title and subtitle

### Main Content
- **Padding**: 24px (px-6 py-6)
- **Spacing Between Sections**: 24px (space-y-6)
- **Flex**: flex-1 (grows to fill available space)
- **Overflow**: auto (scrollable)

#### Section Card (DimensionsSection, StyleSection, etc.)
- **Background**: white (bg-white)
- **Border**: 1px solid #e5e7eb (border-gray-200)
- **Border-radius**: 8px (rounded-lg)
- **Padding**: 16px (p-4)
- **Shadow**: None (minimal)

##### Section Header
```
h2: "DIMENSIONS" (14px semibold, gray-900, uppercase, tracking-wide)
Margin-bottom: 16px (mb-4)
```

##### Section Content
- **Spacing**: Varies by component (mb-5 between controls)
- **Last item**: No bottom margin

#### DimensionsSection Layout
```
┌─ Section Container (card) ─┐
│                            │
│ DIMENSIONS (heading)       │
│                            │
│ Width              10 ft    │  Label-value pair
│ [=================]        │  Gap between label and slider: 8px
│ 8 - 20 feet (hint)         │  Margin below: 20px (mb-5)
│                            │
│ Length             12 ft    │
│ [===================]      │
│ 8 - 24 feet (hint)         │
│                            │
├─ Divider (border-t) ─┤
│ Size: 10W x 12L    │
│ Square feet: 120 sqft      │  Info box
└────────────────────────────┘
```

**Measurements**:
- Label (14px medium): Width full, margin-bottom 8px
- Value (18px bold): Right-aligned
- Slider height: 8px
- Thumb radius: 10px (5px * 2)
- Range hint (12px): Margin-top 8px
- Divider: margin-top 16px (pt-4), margin-bottom 0
- Info text (12px): Single line per item

#### StyleSection Layout
```
┌─ Section Container (card) ─┐
│                            │
│ ROOF STYLE (heading)       │
│                            │
│ ┌─ Radio Card ──┐         │  Card state:
│ │ ○ Gable Roof │         │  Unselected: border gray-200
│ │   Classic... │         │    Selected: border blue-600
│ └────────────────┘         │  Padding: 12px (p-3)
│ Margin: 12px               │
│ ┌─ Radio Card ──┐         │
│ │ ● Barn Roof  │         │
│ │   Traditional│         │
│ └────────────────┘         │
│                            │
└────────────────────────────┘
```

**Measurements**:
- Card padding: 12px (p-3)
- Card border: 2px
- Gap between cards: 12px (space-y-3)
- Input: 16px (w-4 h-4)
- Input margin: 12px right (ml-3)
- Text: 14px medium (label), 12px gray-500 (description)

#### ColorSection Layout
```
┌─ Section Container ──────┐
│                          │
│ Siding Color (label)     │
│                          │
│ [Presets] [Custom]       │  Toggle buttons
│ Presets margin: 16px (mb-4)
│                          │
│ ┌─ Color Preview ─┐      │
│ │ [Swatch] Color Name  │  Swatch: 56px (w-14 h-14)
│ │ #C41E3A          │  Flex gap: 12px (gap-3)
│ └──────────────────┘      │  Margin-bottom: 12px (mb-3)
│                          │
│ ┌─ Preset Dropdown ─┐    │
│ │ [Swatch] Classic Red   │
│ │ ▼                      │  Or custom color picker
│ └──────────────────┘      │  Margin: 12px (space-y-3)
│                          │
└──────────────────────────┘
```

**Measurements**:
- Label: 14px medium
- Toggle buttons: Full width, 2-column split
- Button padding: 8px horizontal, 8px vertical
- Swatch: 56px square (w-14 h-14), border 2px, rounded
- Color name: 14px gray-900
- Hex code: 12px monospace, gray-500
- Dropdown button: Full width, padding 12px (px-4 py-3)
- Dropdown options: Padding 12px, gap 12px

#### PriceDisplay Layout
```
┌─ Section (Blue Gradient) ─┐
│                           │
│ ESTIMATED PRICE (label)   │  12px, bold, uppercase
│ Margin-bottom: 8px        │
│                           │
│ $1,280.00                 │  30px bold, blue-900
│ Margin-bottom: 12px       │  text-3xl
│                           │
│ ┌─ Breakdown Card ─┐      │  Background: white 60% opacity
│ │ Base: $800       │      │  Padding: 12px (p-3)
│ │ +Barn: $500      │      │  Border-radius: 8px
│ │ Total: $1,280    │      │
│ └──────────────────┘      │
│                           │
│ Prices are estimates...   │  12px gray, margin-top 12px
│                           │
└───────────────────────────┘
```

**Measurements**:
- Section padding: 16px (p-4)
- Section border: 1px blue-200
- Background: Gradient blue-50 to blue-100
- Label: 12px bold, uppercase
- Price: 30px bold (text-3xl)
- Breakdown: 12px text, line height normal
- Disclaimer: 12px gray, margin-top 12px

### Footer Actions (Sticky)
- **Position**: `sticky bottom-0`
- **Width**: 384px
- **Padding**: 16px vertical, 24px horizontal
- **Border-top**: 1px solid #e5e7eb (gray-200)
- **Background**: white (bg-white)
- **Z-index**: Default (below header)

#### ActionButtons Layout
```
Full Width
┌──────────────────────────────┐
│   [SAVE DESIGN] (green)      │  Height: 44px (py-3, px-4)
└──────────────────────────────┘  Font: semibold (600)
 Margin-bottom: 8px (mb-2)

50% Width Each
┌──────────────────┬──────────────────┐
│   [LOAD] (blue)  │ [RESET] (gray)   │  Height: 44px
└──────────────────┴──────────────────┘  Gap: 8px (gap-2)
```

**Measurements**:
- Primary button: Full width, padding 12px (py-3 px-4)
- Secondary buttons: 50% width each, same padding
- Gap between button rows: 8px (mb-2, space-y-2)
- Gap between secondary buttons: 8px (gap-2)
- Button height: 44px minimum (accessibility)
- Font: 14px semibold

## Responsive Behavior

### Desktop (1024px+)
- Panel width: 384px (w-96)
- All spacing as specified
- 2-column action button layout maintained

### Tablet (768px - 1024px)
- Panel width: Might adjust to 100% or remain 384px
- Maintain same spacing scale

### Mobile (< 768px)
- Panel width: 100% (full screen width)
- Padding: Reduce to 16px (px-4) or 12px (px-3) if needed
- Typography: May need slight reduction
- Actions: 2-column layout maintained but tighter

## Color Spacing in Dropdowns

When dropdown opens, color presets are shown:

```
┌─ Dropdown Container ─────────────────┐
│                                      │
│ TRADITIONAL (category header)        │ 12px gray-600 uppercase
│                                      │
│ ┌─ Color Item ──────────────────┐   │
│ │ [Swatch] Classic Red           │   │
│ │          #C41E3A WCAG 5.2:1    │   │
│ └────────────────────────────────┘   │
│ Padding item: 12px horizontal        │
│ Margin-bottom item: 12px             │
│                                      │
│ [More color items...]                │
│                                      │
│ NATURAL (category header)            │
│ [Color items...]                     │
│                                      │
│ [More categories...]                 │
│                                      │
└──────────────────────────────────────┘
```

**Measurements**:
- Dropdown max-height: None (scrolls as needed)
- Category padding: 12px horizontal (px-4)
- Category label: 12px uppercase, gray-600
- Color items container: Padding 8px (p-2)
- Color item padding: 12px (px-3 py-2)
- Swatch size: 24px (w-6 h-6)
- Swatch margin: 12px right (gap-3)
- Text column: 14px medium (name), 12px gray-500 (hex + ratio)

## Interaction States

### Hover Effects
- **Cards**: Subtle gray-300 border shift, no shadow
- **Buttons**: Darker color shade
- **Dropdown items**: Gray-50 background
- **Radio options**: Border and background change

### Focus States
- **All interactive elements**: 2px ring (ring-2) + 2px offset (ring-offset-2)
- **Ring color**: Blue-500 (ring-blue-500) for primary, Gray-500 for secondary
- **Background**: Maintained (ring adds on top)

### Active/Pressed States
- **Buttons**: +100 in Tailwind shade darkening
- **Radio/Checkboxes**: Checked state with checkmark
- **Dropdown items**: Blue-50 background, blue-600 border

## Typography Hierarchy

### Layout Hierarchy
```
Header Title: 24px bold (text-2xl font-bold)
Header Subtitle: 14px normal (text-sm)

Section Title: 14px semibold uppercase (text-sm font-semibold uppercase)

Control Label: 14px medium (text-sm font-medium)
Control Value: 18px bold (text-lg font-bold)

Help Text: 12px gray (text-xs text-gray-500)

Button Text: 14px semibold (text-sm font-semibold)

Monospace: 14px for hex codes (font-mono)
```

## Spacing System

Based on 4px unit for consistency:

```
xs = 4px   (1 unit)
sm = 8px   (2 units)
md = 12px  (3 units)
lg = 16px  (4 units)
xl = 20px  (5 units)
2xl = 24px (6 units)
```

### Applied Spacing
- **Header**: 20px vertical, 24px horizontal
- **Main padding**: 24px
- **Section gap**: 24px
- **Section padding**: 16px
- **Control gap**: 12px
- **Label-input gap**: 8px
- **Button gap**: 8px

## Visual Balance

### Vertical Rhythm
Every measurement aligns to 4px grid:
- 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, etc.

### Horizontal Alignment
- Cards: Full width of container minus padding
- Controls: Full width of card
- Buttons: Full width or 50% width (for grid)

### Visual Weight Distribution
1. **Header**: Light (white background, minimal shadow)
2. **Main Content**: Medium (white cards with subtle borders)
3. **Footer**: Light (white background, top border only)
4. **Text**: Darker text for hierarchy (gray-900 > gray-700 > gray-500)

## Print Specifications (Future)

If printing is needed:
- Remove sticky positioning
- Remove shadows/gradients
- Increase contrast for print readability
- Optimize for A4/Letter page width

## Dark Mode (Future)

If implemented:
- Invert background gradient
- Adjust all grays to 900-series
- Maintain color contrast
- Adjust shadows to be lighter
- Maintain blue/green accent colors (adjust if needed)

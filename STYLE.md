# Styling Guide for @particle-academy/react-fancy

This guide is for AI agents and developers creating custom color themes or styling overrides for apps that use `@particle-academy/react-fancy` components.

## Setup

**1. Add `@source` to your CSS** so Tailwind v4 scans the library for class names (required for colors, variants, and dark mode to work):

```css
@import "tailwindcss";
@source "../node_modules/@particle-academy/react-fancy/dist/**/*.js";
```

Without this, Tailwind won't generate CSS for classes used inside the library (e.g., Badge colors will be invisible, dark mode backgrounds won't apply).

**2. Import the base styles** in your app entry point:

```tsx
import "@particle-academy/react-fancy/styles.css";
```

## Dark Mode

Components use Tailwind's `dark:` variant. Ensure `<html>` has `class="dark"` when dark mode is active:

```html
<html class="dark">
```

If using system preference detection:

```js
const mq = window.matchMedia("(prefers-color-scheme: dark)");
document.documentElement.classList.toggle("dark", mq.matches);
mq.addEventListener("change", (e) => {
  document.documentElement.classList.toggle("dark", e.matches);
});
```

## Data Attributes

Every component renders a `data-react-fancy-*=""` attribute on its root element. Sub-components follow the pattern `data-react-fancy-{parent}-{sub}`. Use these for CSS targeting.

### Complete Attribute Reference

#### Layout & Navigation

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-navbar]` | Navbar |
| `[data-react-fancy-navbar-brand]` | Navbar.Brand |
| `[data-react-fancy-navbar-items]` | Navbar.Items |
| `[data-react-fancy-navbar-item]` | Navbar.Item |
| `[data-react-fancy-navbar-toggle]` | Navbar.Toggle |
| `[data-react-fancy-sidebar]` | Sidebar |
| `[data-react-fancy-sidebar-group]` | Sidebar.Group |
| `[data-react-fancy-sidebar-item]` | Sidebar.Item |
| `[data-react-fancy-sidebar-submenu]` | Sidebar.Submenu |
| `[data-react-fancy-sidebar-toggle]` | Sidebar.Toggle |
| `[data-react-fancy-tabs]` | Tabs |
| `[data-react-fancy-tabs-list]` | Tabs.List |
| `[data-react-fancy-tabs-tab]` | Tabs.Tab |
| `[data-react-fancy-tabs-panels]` | Tabs.Panels |
| `[data-react-fancy-tabs-panel]` | Tabs.Panel |
| `[data-react-fancy-breadcrumbs]` | Breadcrumbs |
| `[data-react-fancy-breadcrumbs-item]` | Breadcrumbs.Item |
| `[data-react-fancy-pagination]` | Pagination |

#### Content & Display

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-card]` | Card |
| `[data-react-fancy-card-header]` | Card.Header |
| `[data-react-fancy-card-body]` | Card.Body |
| `[data-react-fancy-card-footer]` | Card.Footer |
| `[data-react-fancy-heading]` | Heading |
| `[data-react-fancy-text]` | Text |
| `[data-react-fancy-separator]` | Separator |
| `[data-react-fancy-badge]` | Badge |
| `[data-react-fancy-icon]` | Icon |
| `[data-react-fancy-avatar]` | Avatar |
| `[data-react-fancy-brand]` | Brand |
| `[data-react-fancy-profile]` | Profile |
| `[data-react-fancy-skeleton]` | Skeleton |
| `[data-react-fancy-progress]` | Progress |
| `[data-react-fancy-callout]` | Callout |
| `[data-react-fancy-timeline]` | Timeline |
| `[data-react-fancy-timeline-item]` | Timeline.Item |
| `[data-react-fancy-timeline-block]` | Timeline.Block |

#### Actions & Inputs

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-action]` | Action (button) |
| `[data-react-fancy-action-group]` | Action.Group |
| `[data-react-fancy-field]` | Field (form field wrapper) |
| `[data-react-fancy-input]` | Input |
| `[data-react-fancy-input-wrapper]` | Input wrapper div |
| `[data-react-fancy-textarea]` | Textarea |
| `[data-react-fancy-select]` | Select |
| `[data-react-fancy-checkbox]` | Checkbox |
| `[data-react-fancy-checkbox-group]` | CheckboxGroup |
| `[data-react-fancy-radio-group]` | RadioGroup |
| `[data-react-fancy-switch]` | Switch |
| `[data-react-fancy-slider]` | Slider |
| `[data-react-fancy-multi-switch]` | MultiSwitch |
| `[data-react-fancy-date-picker]` | DatePicker |
| `[data-react-fancy-time-picker]` | TimePicker |
| `[data-react-fancy-color-picker]` | ColorPicker |
| `[data-react-fancy-otp-input]` | OtpInput |
| `[data-react-fancy-pillbox]` | Pillbox |
| `[data-react-fancy-file-upload]` | FileUpload |
| `[data-react-fancy-file-upload-dropzone]` | FileUpload.Dropzone |
| `[data-react-fancy-file-upload-list]` | FileUpload.List |
| `[data-react-fancy-autocomplete]` | Autocomplete |

#### Overlay & Floating

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-modal]` | Modal |
| `[data-react-fancy-modal-header]` | Modal.Header |
| `[data-react-fancy-modal-body]` | Modal.Body |
| `[data-react-fancy-modal-footer]` | Modal.Footer |
| `[data-react-fancy-dropdown]` | Dropdown.Items |
| `[data-react-fancy-dropdown-item]` | Dropdown.Item |
| `[data-react-fancy-dropdown-separator]` | Dropdown.Separator |
| `[data-react-fancy-popover]` | Popover.Content |
| `[data-react-fancy-tooltip]` | Tooltip |
| `[data-react-fancy-context-menu]` | ContextMenu.Content |
| `[data-react-fancy-context-menu-item]` | ContextMenu.Item |
| `[data-react-fancy-context-menu-separator]` | ContextMenu.Separator |
| `[data-react-fancy-toast]` | Toast.Provider |
| `[data-react-fancy-toast-item]` | Toast item |
| `[data-react-fancy-command]` | Command |
| `[data-react-fancy-command-input]` | Command.Input |
| `[data-react-fancy-command-list]` | Command.List |
| `[data-react-fancy-command-group]` | Command.Group |
| `[data-react-fancy-command-item]` | Command.Item |
| `[data-react-fancy-command-empty]` | Command.Empty |

#### Rich Content

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-composer]` | Composer |
| `[data-react-fancy-editor]` | Editor |
| `[data-react-fancy-editor-toolbar]` | Editor.Toolbar |
| `[data-react-fancy-editor-content]` | Editor.Content |
| `[data-react-fancy-emoji]` | Emoji |
| `[data-react-fancy-emoji-select]` | EmojiSelect |
| `[data-react-fancy-content-renderer]` | ContentRenderer |

#### Data Visualization

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-chart-bar]` | Chart.Bar |
| `[data-react-fancy-chart-bar-column]` | Bar chart column |
| `[data-react-fancy-chart-bar-item]` | Individual bar |
| `[data-react-fancy-chart-horizontal-bar]` | Chart.HorizontalBar |
| `[data-react-fancy-chart-stacked-bar]` | Chart.StackedBar |
| `[data-react-fancy-chart-line]` | Chart.Line |
| `[data-react-fancy-chart-area]` | Chart.Area |
| `[data-react-fancy-chart-pie]` | Chart.Pie |
| `[data-react-fancy-chart-donut]` | Chart.Donut |
| `[data-react-fancy-chart-sparkline]` | Chart.Sparkline |
| `[data-react-fancy-table]` | Table |
| `[data-react-fancy-table-head]` | Table head |
| `[data-react-fancy-table-body]` | Table body |
| `[data-react-fancy-table-row]` | Table row |
| `[data-react-fancy-table-cell]` | Table cell |
| `[data-react-fancy-table-column]` | Table column header |
| `[data-react-fancy-table-search]` | Table search |
| `[data-react-fancy-table-pagination]` | Table pagination |
| `[data-react-fancy-table-tray]` | Table row tray |
| `[data-react-fancy-table-row-tray]` | Table row tray (expanded) |
| `[data-react-fancy-calendar]` | Calendar |

#### Interactive Canvas

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-canvas]` | Canvas |
| `[data-react-fancy-canvas-node]` | Canvas.Node |
| `[data-react-fancy-canvas-edge]` | Canvas.Edge |
| `[data-react-fancy-canvas-controls]` | Canvas.Controls |
| `[data-react-fancy-canvas-minimap]` | Canvas.Minimap |
| `[data-react-fancy-diagram]` | Diagram |
| `[data-react-fancy-diagram-entity]` | Diagram entity |
| `[data-react-fancy-diagram-field]` | Diagram field |
| `[data-react-fancy-diagram-relation]` | Diagram relation |
| `[data-react-fancy-diagram-toolbar]` | Diagram.Toolbar |
| `[data-react-fancy-kanban]` | Kanban |
| `[data-react-fancy-kanban-column]` | Kanban.Column |
| `[data-react-fancy-kanban-card]` | Kanban.Card |

#### Carousel

| Selector | Component |
|----------|-----------|
| `[data-react-fancy-carousel]` | Carousel |
| `[data-react-fancy-carousel-slide]` | Carousel.Slide |
| `[data-react-fancy-carousel-controls]` | Carousel controls |
| `[data-react-fancy-carousel-panels]` | Carousel panels |
| `[data-react-fancy-carousel-steps]` | Carousel step indicators |

---

## Theming Patterns

### Global Theme Override

Apply a color scheme to all react-fancy components at once:

```css
/* Brand primary color on all action buttons */
[data-react-fancy-action] {
  --tw-ring-color: #7c3aed;
}

/* Custom card appearance */
[data-react-fancy-card] {
  background-color: #1e1b4b;
  border-color: #312e81;
}
.dark [data-react-fancy-card] {
  background-color: #0f0d2e;
  border-color: #1e1b4b;
}
```

### Scoped Theming

Theme components only within a specific section:

```css
/* Purple theme for the sidebar */
.sidebar-area [data-react-fancy-action] {
  background-color: #7c3aed;
  color: white;
}

.sidebar-area [data-react-fancy-card] {
  border-color: #6d28d9;
}
```

### Surface Colors

The most common overrides for theming are surface/background colors:

```css
/* Warm dark theme */
.dark [data-react-fancy-card] {
  background-color: #1c1917;
  border-color: #292524;
}

.dark [data-react-fancy-modal] {
  background-color: #1c1917;
  border-color: #292524;
}

.dark [data-react-fancy-dropdown] {
  background-color: #1c1917;
  border-color: #292524;
}

.dark [data-react-fancy-popover] {
  background-color: #1c1917;
  border-color: #292524;
}

.dark [data-react-fancy-tooltip] {
  background-color: #292524;
}

.dark [data-react-fancy-command] {
  background-color: #1c1917;
  border-color: #292524;
}
```

### Input Theming

```css
/* Custom input focus ring */
[data-react-fancy-input]:focus,
[data-react-fancy-textarea]:focus,
[data-react-fancy-select]:focus {
  border-color: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

/* Custom switch active color */
[data-react-fancy-switch][data-state="checked"] {
  background-color: #7c3aed;
}
```

### Table Theming

```css
/* Striped rows */
[data-react-fancy-table-row]:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.02);
}
.dark [data-react-fancy-table-row]:nth-child(even) {
  background-color: rgba(255, 255, 255, 0.02);
}

/* Hover highlight */
[data-react-fancy-table-row]:hover {
  background-color: rgba(59, 130, 246, 0.05);
}
```

### Chart Theming

```css
/* Custom bar chart colors */
[data-react-fancy-chart-bar-item] {
  border-radius: 4px 4px 0 0;
}

/* Chart container padding */
[data-react-fancy-chart-bar],
[data-react-fancy-chart-line],
[data-react-fancy-chart-donut] {
  padding: 8px;
}
```

### Navigation Theming

```css
/* Custom navbar */
[data-react-fancy-navbar] {
  background-color: #1e1b4b;
  border-bottom-color: #312e81;
}

[data-react-fancy-navbar-item] {
  color: #c4b5fd;
}
[data-react-fancy-navbar-item]:hover {
  color: white;
}

/* Active tab indicator color */
[data-react-fancy-tabs-tab][data-active="true"] {
  border-bottom-color: #7c3aed;
  color: #7c3aed;
}
```

---

## Complete Theme Example

A full "Indigo" dark theme:

```css
:root {
  --fancy-surface: #1e1b4b;
  --fancy-surface-raised: #312e81;
  --fancy-border: #3730a3;
  --fancy-text: #e0e7ff;
  --fancy-text-muted: #a5b4fc;
  --fancy-primary: #818cf8;
}

/* Surfaces */
.dark [data-react-fancy-card],
.dark [data-react-fancy-modal],
.dark [data-react-fancy-dropdown],
.dark [data-react-fancy-popover],
.dark [data-react-fancy-command] {
  background-color: var(--fancy-surface);
  border-color: var(--fancy-border);
  color: var(--fancy-text);
}

/* Raised surfaces */
.dark [data-react-fancy-tooltip],
.dark [data-react-fancy-callout],
.dark [data-react-fancy-timeline-block] {
  background-color: var(--fancy-surface-raised);
  border-color: var(--fancy-border);
}

/* Navigation */
.dark [data-react-fancy-navbar] {
  background-color: var(--fancy-surface);
  border-color: var(--fancy-border);
}
.dark [data-react-fancy-sidebar] {
  background-color: var(--fancy-surface);
  border-color: var(--fancy-border);
}

/* Inputs */
.dark [data-react-fancy-input],
.dark [data-react-fancy-textarea],
.dark [data-react-fancy-select] {
  background-color: var(--fancy-surface-raised);
  border-color: var(--fancy-border);
  color: var(--fancy-text);
}

/* Buttons */
.dark [data-react-fancy-action] {
  --action-primary: var(--fancy-primary);
}

/* Text */
.dark [data-react-fancy-text] {
  color: var(--fancy-text);
}
.dark [data-react-fancy-heading] {
  color: var(--fancy-text);
}

/* Tables */
.dark [data-react-fancy-table] {
  color: var(--fancy-text);
}
.dark [data-react-fancy-table-head] {
  background-color: var(--fancy-surface-raised);
}
.dark [data-react-fancy-table-row]:hover {
  background-color: rgba(129, 140, 248, 0.05);
}

/* Separators */
.dark [data-react-fancy-separator] {
  border-color: var(--fancy-border);
}
```

---

## Tips

- Always provide both light and dark variants when theming (use `.dark` parent selector)
- Use CSS custom properties (`--fancy-*`) for consistent color tokens across components
- The `data-react-fancy-portal` attribute is on the Portal wrapper — use it to theme all portaled content (modals, dropdowns, tooltips) at once
- Components inside portals inherit the `dark` class automatically via the Portal component
- Avoid `!important` — the data attribute selectors have sufficient specificity to override component defaults
- For ECharts integration, use `@particle-academy/react-echarts` which handles dark mode automatically via `prefers-color-scheme` detection

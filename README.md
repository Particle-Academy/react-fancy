# @particle-academy/react-fancy

React UI component library — the React port of the `fancy-flux` Blade/Livewire component library. The goal is **visual and behavioral parity** with fancy-flux.

## Installation

```bash
# npm
npm install @particle-academy/react-fancy

# pnpm
pnpm add @particle-academy/react-fancy

# yarn
yarn add @particle-academy/react-fancy
```

**Peer dependencies:** `react >= 18`, `react-dom >= 18`, `tailwindcss >= 4`

**Bundled dependencies:** `clsx`, `tailwind-merge`, `marked`

**External dependency:** `lucide-react` (default icon library)

## Usage

Add the `@source` directive to your main CSS file so Tailwind v4 scans the component library for class names:

```css
@import "tailwindcss";
@source "../node_modules/@particle-academy/react-fancy/dist/**/*.js";
```

Then import and use components:

```tsx
import { Action, Input, Modal, Dropdown } from "@particle-academy/react-fancy";
import "@particle-academy/react-fancy/styles.css";
```

## Commands

```bash
pnpm --filter @particle-academy/react-fancy build    # Build with tsup (ESM + CJS + DTS)
pnpm --filter @particle-academy/react-fancy dev      # Watch mode
pnpm --filter @particle-academy/react-fancy lint     # Type-check (tsc --noEmit)
pnpm --filter @particle-academy/react-fancy clean    # Remove dist/
```

The demo app consuming this package builds with Vite from the monorepo root:

```bash
npx vite build                      # Build demo app (verifies imports work)
```

## Components

### Core

| Component | Description |
|-----------|-------------|
| Action | Button with colors, states, icons, emoji, avatar, badge, sort control |
| Carousel | Slide carousel with directional/wizard variants, autoplay, loop |
| ColorPicker | Native color input with swatch preview, hex display, presets |
| Emoji | Emoji renderer from slugs |
| EmojiSelect | Emoji search and selection dropdown |
| Table | Data table with sorting, pagination, search, and tray |

### Form Inputs

| Component | Description |
|-----------|-------------|
| Field | Form field wrapper with label and error display |
| Input | Text input |
| Textarea | Multi-line text input |
| Select | Dropdown select |
| Checkbox / CheckboxGroup | Checkbox inputs |
| RadioGroup | Radio button group |
| Switch | Toggle switch |
| Slider | Range slider (single and range modes) |
| DatePicker | Date selection (single and range modes) |
| Autocomplete | Input with filtered dropdown suggestions, async search, keyboard nav |
| Pillbox | Tag/pill input with add/remove, backspace delete |
| OtpInput | Single-digit OTP code input with auto-advance and paste support |
| FileUpload | Drag-and-drop file upload with dropzone and file list |
| TimePicker | Hour/minute/AM-PM time selection |
| Calendar | Month grid with single, range, and multi-select modes |

### Display

| Component | Description |
|-----------|-------------|
| Heading | Semantic heading (`h1`–`h6`) with size and weight props |
| Text | Paragraph/span with size, color, weight, and `as` prop |
| Separator | Horizontal/vertical divider with optional label |
| Badge | Inline label with color, variant, size, and dot indicator |
| Icon | Size wrapper around icon ReactNode |
| Avatar | Image with fallback initials, size variants, status indicator |
| Skeleton | Animated placeholder (rect, circle, text), pulse animation |
| Progress | Bar and circular variants, indeterminate mode |
| Brand | Logo + text lockup |
| Profile | Avatar + name + subtitle layout |
| Card | Container with Header, Body, Footer compound slots |
| Callout | Alert/info box with icon, color, and dismissible support |
| Timeline | Vertical event list with Item and Block sub-components |

### Overlay & Floating

| Component | Description |
|-----------|-------------|
| Tooltip | Hover/focus tooltip with arrow and placement control |
| Popover | Click-triggered floating panel |
| Dropdown | Popover with keyboard-navigable menu items |
| ContextMenu | Right-click triggered dropdown |
| Modal | Full-screen backdrop dialog with focus trap and scroll lock |
| Toast | Notification stack with auto-dismiss, variants, and position options |
| Command | `Cmd+K` command palette with search and keyboard navigation |

### Navigation & Layout

| Component | Description |
|-----------|-------------|
| Tabs | Tabbed content with underline, pills, and boxed variants |
| Accordion | Collapsible content sections (single/multiple mode) |
| Breadcrumbs | Navigation breadcrumb trail with separator |
| Navbar | Responsive navigation bar with hamburger collapse |
| Pagination | Page navigation with prev/next and ellipsis |

### Rich Content

| Component | Description |
|-----------|-------------|
| Composer | Chat-style message input composing textarea + actions |
| Chart | SVG-based Bar and Donut charts |
| Editor | Toolbar chrome wrapper for contentEditable |
| Kanban | Drag-and-drop board with columns and cards (experimental) |

### Utilities & Hooks

| Export | Description |
|--------|-------------|
| Portal | `createPortal` wrapper with automatic dark mode propagation |
| `cn()` | `clsx` + `tailwind-merge` for conditional class composition |
| `useControllableState` | Controlled/uncontrolled state management |
| `useFloatingPosition` | Anchor-relative positioning for floating elements |
| `useOutsideClick` | Close on click outside handler |
| `useEscapeKey` | Close on Escape key handler |
| `useFocusTrap` | Tab-cycle focus within container |
| `useAnimation` | Enter/exit CSS transitions with unmount |
| `useId` | Stable ID generation |

## Customization

All components render a `data-react-fancy-*` attribute on their root element (e.g., `data-react-fancy-modal`, `data-react-fancy-dropdown-item`). Use these for external CSS targeting or JavaScript integration:

```css
[data-react-fancy-modal] {
  --custom-border-radius: 1rem;
}
```

```js
document.querySelectorAll("[data-react-fancy-dropdown-item]");
```

## Dark Mode

Dark mode works via Tailwind's `dark:` class strategy. The library's `Portal` component automatically detects the `dark` class (or `data-theme="dark"`) on `<html>` and propagates it into portaled content (modals, dropdowns, tooltips, toasts, etc.).

## Architecture

### Directory Layout

```
src/
├── components/           # One directory per component
│   ├── Action/
│   │   ├── Action.tsx           # Component implementation
│   │   ├── Action.types.ts      # Props interface
│   │   └── index.ts             # Re-exports
│   ├── Modal/
│   │   ├── Modal.tsx            # Root + Object.assign compound
│   │   ├── Modal.context.ts     # React context (compound components)
│   │   ├── Modal.types.ts       # Props interfaces
│   │   ├── ModalHeader.tsx      # Sub-component
│   │   ├── ModalBody.tsx
│   │   ├── ModalFooter.tsx
│   │   └── index.ts
│   ├── inputs/           # Form input components (Field, Input, Select, etc.)
│   └── ...
├── data/                 # Static data (emoji entries, etc.)
├── hooks/                # Shared React hooks
├── utils/                # Shared utilities (cn, types)
├── styles.css            # Keyframe animations
└── index.ts              # Public API — all exports
```

### Shared Types (`utils/types.ts`)

- `Size` — `"xs" | "sm" | "md" | "lg" | "xl"`
- `Color` — Full Tailwind color palette (17 colors)
- `ActionColor` — Subset of 10 standalone colors matching fancy-flux
- `Variant` — `"solid" | "outline" | "ghost" | "soft"`
- `Placement` — `"top" | "bottom" | "left" | "right"` + start/end variants

## Demo Pages

Component demos live in the monorepo at `resources/js/react-demos/pages/`. Each component has a `ComponentNameDemo.tsx` that exercises all props and states using the `DemoSection` wrapper component.

---

## Agent Guidelines

Guidelines for AI agents (Claude Code, Copilot, etc.) working on this package.

### Component Pattern

Every component follows this structure:

1. **`ComponentName.types.ts`** — Props interface extending native HTML element attributes. Import shared types from `../../utils/types`.
2. **`ComponentName.tsx`** — Implementation using `forwardRef`. Always set `displayName`. Use `cn()` for class merging. Add `data-react-fancy-{name}=""` to the root element.
3. **Compound components** — Use `Object.assign(Root, { Sub1, Sub2 })` pattern. Add a `.context.ts` with React context. Each sub-component gets its own `data-react-fancy-{parent}-{sub}` attribute.
4. **`index.ts`** — Re-exports both the component and its types.
5. **`src/index.ts`** — Must export the component and its prop types. Update this file when adding new components.

### Icons

Use `lucide-react` as the default icon library. It is a dependency of this package and marked as external in tsup. Components should import icons directly (e.g., `import { X, ChevronDown } from "lucide-react"`).

### Parity with fancy-flux

- **Always reference the corresponding Blade component** in `packages/fancy-flux/stubs/resources/views/flux/` when implementing or updating a component. Match the Tailwind classes, color values, state logic, and dark mode support exactly.
- React-specific additions (e.g., `loading` spinner, `href` anchor rendering) are fine — they don't exist in Blade but are idiomatic in React.
- Icons are passed as `ReactNode` (not string names like Blade's `<flux:icon>`). This is the correct React pattern.

### Styling

- **Tailwind v4** — CSS-first config. Use `@import "tailwindcss"` not `@tailwind` directives.
- **Dark mode** — Every color variant must include `dark:` equivalents. Check fancy-flux for the exact classes. Portal components get dark mode automatically via the Portal wrapper.
- **No component library deps** — Only `clsx`, `tailwind-merge`, and `lucide-react`. Don't add Radix, Headless UI, or similar.
- Class maps should be `Record<Size, string>` (or similar) constants outside the component function, not inline.

### TypeScript

- Explicit types on all exports. Use `interface` for props (not `type`).
- Extend native HTML attributes (`ButtonHTMLAttributes`, `InputHTMLAttributes`, etc.) and `Omit` conflicting props (e.g., `Omit<..., "color">`).
- Export prop interfaces from the component's `index.ts` and from `src/index.ts`.

### Build

- tsup handles the build — ESM, CJS, and `.d.ts` generation.
- `react`, `react-dom`, and `lucide-react` are external dependencies, never bundled.
- After any change, verify with `pnpm --filter @particle-academy/react-fancy build` before considering the work done.
- When updating a component, update its demo page in `resources/js/react-demos/pages/` to cover all new features.

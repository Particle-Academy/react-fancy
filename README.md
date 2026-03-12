# @fancy/react

React UI component library — the React port of the `fancy-flux` Blade/Livewire component library. The goal is **visual and behavioral parity** with fancy-flux.

## Installation

```bash
pnpm add @fancy/react
```

Peer dependencies: `react >= 18`, `react-dom >= 18`.

## Usage

```tsx
import { Action, Input, Select, Carousel } from "@fancy/react";
import "@fancy/react/styles.css";
```

## Commands

```bash
pnpm --filter @fancy/react build    # Build with tsup (ESM + CJS + DTS)
pnpm --filter @fancy/react dev      # Watch mode
pnpm --filter @fancy/react lint     # Type-check (tsc --noEmit)
pnpm --filter @fancy/react clean    # Remove dist/
```

The demo app consuming this package builds with Vite from the monorepo root:

```bash
npx vite build                      # Build demo app (verifies imports work)
```

## Components

| Component | Description |
|-----------|-------------|
| Action | Button with colors, states, icons, emoji, avatar, badge, sort control |
| Carousel | Slide carousel with controls, steps, and panels |
| ColorPicker | Color selection widget |
| Emoji | Emoji renderer from slugs |
| EmojiSelect | Emoji search and selection dropdown |
| Table | Data table with sorting, pagination, search, and tray |
| Field | Form field wrapper with label and error display |
| Input | Text input |
| Textarea | Multi-line text input |
| Select | Dropdown select |
| Checkbox / CheckboxGroup | Checkbox inputs |
| RadioGroup | Radio button group |
| Switch | Toggle switch |
| Slider | Range slider (single and range modes) |
| DatePicker | Date selection (single and range modes) |

## Architecture

### Directory Layout

```
src/
├── components/           # One directory per component
│   ├── Action/
│   │   ├── Action.tsx           # Component implementation
│   │   ├── Action.types.ts      # Props interface
│   │   └── index.ts             # Re-exports
│   ├── Carousel/
│   ├── inputs/           # Form input components (Field, Input, Select, etc.)
│   └── ...
├── data/                 # Static data (emoji entries, etc.)
├── hooks/                # Shared React hooks
├── utils/                # Shared utilities (cn, types)
└── index.ts              # Public API — all exports
```

### Key Utilities

- **`cn()`** (`utils/cn.ts`) — `clsx` + `tailwind-merge` for conditional class composition.
- **`resolve(slug)`** (`data/emoji-utils.ts`) — Resolves emoji slugs (e.g., `"rocket"`) to Unicode characters.
- **`useControllableState`** (`hooks/`) — For components supporting both controlled and uncontrolled modes.

### Shared Types (`utils/types.ts`)

- `Size` — `"xs" | "sm" | "md" | "lg" | "xl"`
- `Color` — Full Tailwind color palette (17 colors)
- `ActionColor` — Subset of 10 standalone colors matching fancy-flux
- `Variant` — `"solid" | "outline" | "ghost" | "soft"`

## Demo Pages

Component demos live in the monorepo at `resources/js/react-demos/pages/`. Each component has a `ComponentNameDemo.tsx` that exercises all props and states using the `DemoSection` wrapper component.

---

## Agent Guidelines

Guidelines for AI agents (Claude Code, Copilot, etc.) working on this package.

### Component Pattern

Every component follows this structure:

1. **`ComponentName.types.ts`** — Props interface extending native HTML element attributes. Import shared types from `../../utils/types`.
2. **`ComponentName.tsx`** — Implementation using `forwardRef`. Always set `displayName`. Use `cn()` for class merging.
3. **`index.ts`** — Re-exports both the component and its types.
4. **`src/index.ts`** — Must export the component and its prop types. Update this file when adding new components.

### Parity with fancy-flux

- **Always reference the corresponding Blade component** in `packages/fancy-flux/stubs/resources/views/flux/` when implementing or updating a component. Match the Tailwind classes, color values, state logic, and dark mode support exactly.
- React-specific additions (e.g., `loading` spinner, `href` anchor rendering) are fine — they don't exist in Blade but are idiomatic in React.
- Icons are passed as `ReactNode` (not string names like Blade's `<flux:icon>`). This is the correct React pattern.

### Styling

- **Tailwind v4** — CSS-first config. Use `@import "tailwindcss"` not `@tailwind` directives.
- **Dark mode** — Every color variant must include `dark:` equivalents. Check fancy-flux for the exact classes.
- **No component library deps** — Only `clsx` and `tailwind-merge`. Don't add Radix, Headless UI, or similar.
- Class maps should be `Record<Size, string>` (or similar) constants outside the component function, not inline.

### TypeScript

- Explicit types on all exports. Use `interface` for props (not `type`).
- Extend native HTML attributes (`ButtonHTMLAttributes`, `InputHTMLAttributes`, etc.) and `Omit` conflicting props (e.g., `Omit<..., "color">`).
- Export prop interfaces from the component's `index.ts` and from `src/index.ts`.

### Build

- tsup handles the build — ESM, CJS, and `.d.ts` generation.
- `react` and `react-dom` are external peer dependencies, never bundled.
- After any change, verify with `pnpm --filter @fancy/react build` before considering the work done.
- When updating a component, update its demo page in `resources/js/react-demos/pages/` to cover all new features.

# Contributing to @particle-academy/react-fancy

Notes for anyone, human or agent, working ON this package's code. How to USE the
package is in [AGENTS.md](./AGENTS.md); what it is, is in [README.md](./README.md).
`CLAUDE.md` is a symlink to this file, so Claude Code reads these notes when it
works in this repo.

## Component pattern

Every component follows this structure:

1. **`ComponentName.types.ts`** — Props interface extending native HTML element attributes. Import shared types from `../../utils/types`.
2. **`ComponentName.tsx`** — Implementation using `forwardRef`. Always set `displayName`. Use `cn()` for class merging. Add `data-react-fancy-{name}=""` to the root element.
3. **Compound components** — Use `Object.assign(Root, { Sub1, Sub2 })` pattern. Add a `.context.ts` with React context. Each sub-component gets its own `data-react-fancy-{parent}-{sub}` attribute.
4. **`index.ts`** — Re-exports both the component and its types.
5. **`src/index.ts`** — Must export the component and its prop types. Update this file when adding new components.

## Icons

Use `lucide-react` as the default icon library. It is a dependency of this package and marked as external in tsup. Components should import icons directly (e.g., `import { X, ChevronDown } from "lucide-react"`).

## Human+ UX contract

Every interactive component must:

- Expose **`value` + `onChange`** so an agent can read and write state. No internal-only state for anything an agent might want to inspect or change.
- Carry **stable handles** — `id`, `data-react-fancy-*` attributes, or a selector prop — so MCP bridges can address elements without guessing DOM structure.
- Accept **JSON-friendly props** — arrays of objects, primitives, simple discriminated unions. Avoid forcing React children for things the agent needs to populate.
- Support a **bridgeable surface**: a `register<Surface>Bridge(server, { adapter })` (in `agent-integrations`) should be sketchable in one sitting.
- Broadcast **`AgentActivity`** events for mutations so presence, undo, and coaching layers can compose.
- Provide **trust-but-verify** hooks for destructive actions — agents propose, humans confirm via `pendingMode` / staged-write affordances.

Purely visual primitives (labels, dividers, layout shells) only owe the first bullet.

## Styling

- **Tailwind v4** — CSS-first config. Use `@import "tailwindcss"` not `@tailwind` directives.
- **Dark mode** — Every color variant must include `dark:` equivalents. Portal components get dark mode automatically via the Portal wrapper.
- **No component library deps** — Only `clsx`, `tailwind-merge`, and `lucide-react`. Don't add Radix, Headless UI, or similar.
- Class maps should be `Record<Size, string>` (or similar) constants outside the component function, not inline.

## TypeScript

- Explicit types on all exports. Use `interface` for props (not `type`).
- Extend native HTML attributes (`ButtonHTMLAttributes`, `InputHTMLAttributes`, etc.) and `Omit` conflicting props (e.g., `Omit<..., "color">`).
- Export prop interfaces from the component's `index.ts` and from `src/index.ts`.

## Build

- tsup handles the build — ESM, CJS, and `.d.ts` generation.
- `react`, `react-dom`, and `lucide-react` are external dependencies, never bundled.
- After any change, verify with `pnpm --filter @particle-academy/react-fancy build` before considering the work done.
- When updating a component, update its demo page in the showcase repo — `resources/js/Pages/Packages/ComponentDocs/<ComponentName>.tsx` in [`Particle-Academy/pa-ux-sandbox`](https://github.com/Particle-Academy/pa-ux-sandbox) — to cover all new features. That page is what `/packages/react-fancy/<component>` renders.

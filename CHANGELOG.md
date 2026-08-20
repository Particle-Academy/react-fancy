# Changelog

All notable changes to `@particle-academy/react-fancy` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **History before 4.16.0 is not yet recorded here.** This file starts at the
> release that introduced it; earlier versions are described by their git tags
> and GitHub releases. Backfilling is tracked separately.

## [Unreleased]

## [5.23.1] - 2026-08-20

### Fixed

- **`<Grid>` now applies its own gutter, because 5.23.0's column cap could be
  wrong by exactly one column.** That release drew the gutter with a Tailwind
  `gap-*` class and hard-coded the matching length beside it for the cap
  arithmetic. Those are two values for one thing, and in the showcase they
  disagreed by 2px — the class resolved to 14px in context while the arithmetic
  assumed 12px. That was enough: N tracks plus N-1 gaps overflowed the row, and
  `auto-fit` responded by fitting N-1. A grid asked for 3 rendered 2, with both
  numbers individually defensible and nothing to see in the markup.

  The gutter now comes from `--fancy-grid-gap`, the same property the cap
  divides by, so the spacing in effect and the spacing in the maths cannot
  disagree.

  **If you override a `<Grid>`'s gutter with a `gap-*` class, that stops
  working** — the grid sets `gap` itself now, and an inline style beats a class.
  Set `--fancy-grid-gap` instead, which moves the gutter AND keeps the column
  cap correct:

  ```tsx
  <Grid cols={3} style={{ "--fancy-grid-gap": "2rem" } as CSSProperties}>
  ```

  The `gap` prop (`"sm" | "md" | "lg"`) is unchanged and is still the normal way
  to ask for a gutter.

  Found by the browser, not the suite: jsdom cannot compute grid layout, so the
  tests could confirm the template referenced the property but never that the
  resulting column count was right.


## [5.23.0] - 2026-08-20

All three of these were found by one consumer — the showcase's `/packages`
rebuild — and filed as #23, #24 and #25.

### Fixed

- **`<Grid cols>` now does something while `responsive` is on.** It did not.
  The responsive track template was a fixed
  `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` with no reference to the
  column count, so a grid asked for 2 and a grid asked for 5 laid out
  identically, and the only way to get a real count was `responsive={false}` —
  which then had no breakpoints at all. `cols` is now a CEILING: at most that
  many, fewer as the grid narrows.

  **This will change how existing grids look, so check the ones you have.** Any
  `<Grid>` wider than `cols × 16rem` was rendering MORE columns than it asked
  for and will now cap correctly — that is the fix, but it is a visible change
  and it is the reason this entry leads. Grids at or below that width are
  unaffected. If you actually wanted "as many as fit", say so explicitly with a
  high `cols`.

  `--fancy-grid-cols` is now genuinely load-bearing. The doc comment has always
  advertised it as the single place to override column behaviour in CSS; it was
  set by the component and read by nothing, so overriding it did nothing. A
  companion `--fancy-grid-gap` is published for the same reason — the cap has to
  know the gutter, or N tracks plus N-1 gaps overflow the row and `auto-fit`
  quietly drops to N-1.

  The existing test named *"lays out the requested columns"* passed throughout,
  because it asserted only that the property was **set**. Two tests now pin that
  the template **reads** it.

- **`MultiSwitch` accepts the DOM attributes it already forwards.** It spreads
  its rest props onto the container, so `style`, `data-*` and `aria-*` all
  worked at runtime — while `MultiSwitchProps` extended `InputBaseProps` alone
  and the compiler rejected every one of them. Implemented and unreachable.
  `MultiSwitchProps` now also extends `HTMLAttributes<HTMLDivElement>` (minus
  `onChange`, which would offer a handler that never fires — this control
  reports through `onValueChange`).

  **Nothing to do on upgrade.** Purely a widening: props you could already pass
  still typecheck.

- **A labelled `MultiSwitch` or `RadioGroup` is now actually named.** `<Field>`
  renders `<label for=…>`, and a `<label>` only names *labelable* elements —
  input, select, textarea, button. Both of these controls are
  `div[role="radiogroup"]`, which is not one, so the label sat beside an unnamed
  group and looked like it had done its job. (`RadioGroup` passed no `htmlFor`
  at all, so its label named nothing whatsoever.) Both now point
  `aria-labelledby` at the rendered label.

  **Nothing to do on upgrade** — unless you added your own `aria-label` to work
  around this, in which case yours still wins and you can now drop it.

### Added

- **`labelHidden` on every `Field`-wrapped input** — `Input`, `Textarea`,
  `Select`, `DatePicker`, `Slider`, `CheckboxGroup`, `RadioGroup`,
  `MultiSwitch`. Keeps the label in the accessibility tree and out of the
  layout.

  For a control whose options already say what it does — a filter toolbar's
  segmented switches — where a visible label is noise but an unnamed control is
  a bug. Before this the choices were an unnamed control or a label the design
  does not have, and the silent one is the one that ships.

  It is `labelHidden` and not `hideLabel` because `Input` has used `hideLabel`
  since the reveal toggle shipped, for that toggle's accessible label ("Hide
  password"). Different concept, and renaming a 5.x prop to free the name would
  be breaking for the sake of a nicer word.


## [5.22.0] - 2026-08-19

### Changed

- **`clsx` is no longer a dependency.** It was a *runtime* dependency, so it
  shipped to every consumer of this package, and its last commit was **801 days**
  old. Under the suite's rule that third-party code must be both approved and
  actively maintained, it fails — and it is roughly twenty lines of logic that
  owning costs less than carrying.

  `cn()` behaves identically. Its contract was pinned by tests written against
  `clsx` *before* the swap, and those same tests pass unchanged after it:
  falsy values dropped (including `0` and `""`), truthy numbers kept, arrays
  flattened recursively, object keys taken when truthy.

  `tailwind-merge` deliberately stays. Deciding which of two conflicting
  Tailwind utilities wins requires modelling the whole utility space, which is
  emphatically not twenty lines, and it is actively maintained.

  **Nothing to do on upgrade.** `ClassValue` is now exported from this package
  rather than re-exported from `clsx`; if you imported the type from `clsx`
  yourself, that is still your own dependency and unaffected.


## [5.21.0] - 2026-08-18

### Added

- **Light / dark / system theming, in the kit rather than in every app.** This
  package already owned the dark contract -- `styles.css` redefines the whole
  `--color-secondary-*` scale under `:where(.dark)` -- but nothing here decided
  when `.dark` was on, so every consumer hand-rolled that half. Every hand-rolled
  copy we have looked at had the same two holes:

  - **No live listener.** The OS preference was read once at boot, so changing
    the system theme with the page open did nothing. That is a default, not a
    system mode.
  - **No way back.** Choosing light or dark wrote to storage forever, leaving
    "follow my system" unreachable after a single click.

  Both come from storing `"system"` as a third value. Here it is instead the
  *absence* of a stored choice, which makes following the OS the natural
  resting state.

  ```ts
  import { initTheme, useTheme } from "@particle-academy/react-fancy";

  initTheme();                                   // once, as early as possible

  const { preference, resolved, setPreference } = useTheme();
  ```

  `initTheme()` applies the theme and starts following the OS, returning a
  disposer. `useTheme()` re-renders on change -- including when the OS flips
  underneath a `system` preference. Also exported: `getThemePreference`,
  `setThemePreference`, `resolveTheme`, `subscribeTheme`, `THEME_STORAGE_KEY`.

  **Nothing to do on upgrade** -- this is additive, and nothing here applies a
  theme unless you call `initTheme()`. If you already hand-roll this, the
  storage key defaults to `fancy-ui.theme`, which is the one the showcase used,
  so adopting it keeps a returning visitor's saved choice rather than resetting
  it. Pass `initTheme({ storageKey })` if yours differs.

  Every export is SSR-safe, and `useTheme` renders `system` / `light` on the
  server and syncs in an effect -- reading the real theme during render is the
  hydration mismatch this project has already chased down more than once.

## [5.20.0] - 2026-08-11

### Added

- **`preload` on `AudioViewer` and `VideoViewer`**, defaulting to `"metadata"`.

  Both wrapped a media element and forwarded `controls`, `autoPlay` and `loop`
  but not `preload`, so the browser decided — and Chrome decides `"auto"` for
  `<audio>`. Rendering the component downloaded the entire file. Measured on the
  Fancy showcase: one audio tile on the package grid transferred **995 KB**
  before anyone pressed play.

  `"metadata"` is enough for duration and the scrubber, which is all a viewer
  needs before someone decides to listen. Pass `"none"` for a thumbnail that
  should cost nothing, or `"auto"` to restore the eager behaviour.

  **What to do:** nothing, unless you were relying on the file being fully
  buffered by the time a user pressed play — in that case pass `preload="auto"`
  explicitly. The expensive option is now the one you opt into.


## [5.19.0] - 2026-08-11

### Added

- **`Sidebar` takes an `embedded` prop** — no right border, no background, and
  full width instead of the fixed `w-60`, for a sidebar living inside a
  container that already owns its surface.

  The defaults are right for the standalone app rail and actively wrong inside
  a card: a 240px rail in a 300px panel draws its right border 240px in, which
  reads as a stray vertical line slicing the panel rather than an edge, and the
  opaque background sits as a lighter block over the card behind it. Both were
  visible on the Fancy UI Curriculum's lesson list.

  Chrome only — collapsing still works, and a collapsed rail keeps its fixed
  narrow width.

  Not a `className` fix: neutralising `border-r`, `bg-white`,
  `dark:bg-zinc-900` and `w-60` from outside takes four `!important` utilities
  that every embedding host has to rediscover, and that rot the moment the base
  classes change.


## [5.18.0] - 2026-08-11

### Added

- **`FileBrowser` can create folders, if the app opts in.** Supply
  `onCreateFolder` and the toolbar grows a "New folder" button; leave it off and
  nothing renders. The handler IS the opt-in — a separate `showNewFolder` flag
  would let the two disagree, and a visible button wired to nothing is the
  failure this shape rules out.

  ```tsx
  <FileBrowser
      provider={{ loadChildren }}
      onCreateFolder={async ({ parentPath, name }) => {
          await api.mkdir(`${parentPath}/${name}`);
      }}
  />
  ```

  An inline input, not `window.prompt`: a prompt blocks the event loop, cannot
  be themed, is unusable on mobile, and has no handle an agent could target.

  The browser validates before your handler is called — empty names, a name
  already taken in that directory (files count), path separators, `.` and `..`.
  It knows what is in the folder and you would have to round-trip to find out.
  It does NOT guess at case-sensitivity, reserved device names or length limits;
  those depend on a filesystem it cannot see, so **rejecting the promise is a
  supported outcome** and the message lands on the form.

  In provider mode a resolved promise reloads that directory so the folder
  appears. A rejected one does not — reloading after a failure hides it behind
  an unchanged listing.

  Handles for agents and tests: `data-react-fancy-file-browser-new-folder`,
  `-new-folder-input`, `-new-folder-submit`, `-new-folder-cancel`,
  `-new-folder-error`.

- **`FileBrowser.NewFolder`** is exported separately, for hosts composing their
  own toolbar out of the parts.

- **`validateFolderName(name, siblings)`** — the same rule the component uses,
  exported so a host can pre-flight a name it is about to submit programmatically.


## [5.17.1] — 2026-08-11

### Fixed

- **A `Modal` could grow taller than the screen, and its content became
  unreachable.** Only `size="full"` carried a max-height. `sm`, `md`, `lg` and
  `xl` — including the `md` default — were width-constrained and vertically
  unbounded, so a long modal simply extended past the bottom of the viewport.

  No scrollbar appeared, because there was nothing to scroll: the box got
  taller instead of overflowing. `ModalBody` has always had
  `flex-1 overflow-y-auto` and the panel has always had `overflow-hidden` — the
  entire scrolling mechanism was present and inert, waiting on the one
  constraint that makes it engage.

  Every size is now capped at `calc(100dvh - 2rem)`, with a `100vh` fallback
  listed first for engines that do not know `dvh`. `dvh` rather than `vh`
  deliberately: on mobile `100vh` is the tallest the viewport ever gets, so a
  `vh` cap still runs under the browser chrome on exactly the devices with the
  least room.

  `ModalBody` also gains **`min-h-0`**, which is load-bearing rather than
  tidying. A flex child defaults to `min-height: auto` and refuses to shrink
  below its content, so without it the body would push the panel through its
  own new max-height and the scrollbar still would not appear.

  **What you must do:** nothing. A modal that fit before is unchanged; one that
  did not now scrolls internally. If you had worked around this with your own
  `max-h-*` and `overflow` on `Modal` or `Modal.Body`, those still win — they
  are on the same elements and later in the class string — so nothing breaks,
  but you can now delete them.


## [5.17.0] — 2026-08-10

### Changed

- **BREAKING — `Field` no longer spaces itself. Its container does.** The
  stylesheet shipped an adjacent-sibling rule:

  ```css
  [data-react-fancy-field] + [data-react-fancy-field] { margin-top: 1rem; }
  ```

  A sibling selector has no idea which way its parent lays children out.
  Stacked vertically that read as spacing; inside a `grid-cols-2` row it pushed
  the right-hand cell 16px down — and `items-start` could not fix it, because a
  margin is not alignment:

  ```jsx
  <div className="grid grid-cols-2 gap-4 items-start">
    <Field label="Class">…</Field>
    <Field label="Type">…</Field>   {/* ← sat 16px lower */}
  </div>
  ```

  The only escape was wrapping every `Field` in a plain `<div>` so each became
  an only-child. Needing a wrapper per field to put a component in a grid is
  the tell that the spacing was in the wrong place.

  **What you must do:** add spacing to the containers that stack fields —
  `space-y-4` on the wrapper, or `gap-4` if it is already flex or grid. One
  class per form, not per field:

  ```diff
  - <div>
  + <div className="space-y-4">
      <Field label="Name">…</Field>
      <Field label="Email">…</Field>
    </div>
  ```

  **How to find them:** anywhere two or more `Field`s share a parent that sets
  no `gap` or `space-y-*`. If your form already sat inside a flex/grid parent
  with a `gap`, or holds a single `Field`, nothing changes. Grid and flex-row
  layouts are *fixed* by this — they need no edit and stop being misaligned.

  Why a breaking change rather than an opt-out attribute: an opt-out leaves the
  default wrong and makes every future grid layout pay for it, and the amount
  of consumer code silently relying on a component to space its own siblings
  only grows. `gap` exists for this.

  Reported by a consuming app, with the correct diagnosis and the correct root
  fix. Reproduced in a real browser against the shipped CSS before changing
  anything, and the showcase's own 54 stacked call sites were migrated in the
  same change.

## [5.16.0] — 2026-08-10

### Added

- **`JsonEditor`** — a key/value editor for arbitrary JSON, nested to any depth,
  where a `keyMap` imposes a data type on chosen paths and that type drives both
  how a value is displayed and which input edits it.

  ```tsx
  <JsonEditor
    value={config}
    onChange={setConfig}
    keyMap='{"user.age":"number","tags.*":"string","role":{"type":"enum","options":["admin","member"]}}'
  />
  ```

  **`keyMap` is a JSON string, not an object**, and an already-parsed object is
  deliberately not accepted. A string survives an MCP tool call, a config
  column, a `data-*` attribute or a form field intact; a live object does not.
  It is parsed once per distinct string, which a test asserts with a
  call-counting spy rather than by inspection.

  Paths are **dotted patterns with `*` as a single-segment wildcard** —
  `orders.*.total` — chosen over a nested mirror because a mirror is ambiguous
  the moment a key needs both a type and typed children, and needs a magic
  `$type` escape to disambiguate. Specificity is literal-segment count, ties
  broken by last-declared. A literal dot escapes as `\.`.

  Types: `string`, `text`, `number`, `integer`, `boolean`, `date`, `datetime`,
  `enum`, `secret`, `url`, `email`, `color`, `json`, `object`, `array`. With no
  rule the type is inferred from the value.

  **A value that contradicts its declared type is never coerced and never
  dropped.** It keeps its real value, renders through the raw text editor — the
  only control that can both hold and repair `"thirty-six"` in a `number` field
  — and the row reports `data-conflict="true"`. Typing reaches the same state:
  numeric fields commit on blur rather than per keystroke (a controlled number
  input eats the `.` in `1.5`), and unparseable text is stored verbatim as a
  string so the conflict is visible instead of silently becoming `0`.

  Two failure modes are kept distinct, because collapsing them is how a typing
  feature quietly stops typing things. An unusable `keyMap` **string** yields no
  rules, sets `data-keymap-error`, and says plainly that values are untyped — it
  never throws and never silently renders an untyped editor. A single malformed
  **rule** is dropped and reported while the rest of the map stays in force, so
  one typo cannot disable forty rules.

  Human+: controlled `value` + `onChange(next, edit)` with no private copy;
  stable `data-react-fancy-json-editor-*` handles carrying `data-path`, plus a
  `role="tree"` DOM so an agent addresses `[data-path="orders.2.total"]` in one
  selector; `pendingMode` for staged accept/reject; `onActivity` on every
  commit. `applyJsonEdit`, `parseKeyMap` and `findJsonConflicts` are exported
  pure and non-mutating — the surface a bridge needs.

  62 tests. Built from the kit's own `Input`, `Textarea`, `Select`, `Switch`,
  `DatePicker`, `ColorPicker`, `Button`, `Badge`, `Callout` and `useInlineEdit`
  — which is what gives `mode="view"` click-to-edit for free.

### Fixed

- **`data-*`, `aria-*` and `id` now reach the DOM on `ColorPicker`.** It had no
  `...rest`, so a handle put on it was dropped — the same defect swept out of
  `Switch`, `Checkbox` and friends in 5.8.0 (#22), which this component was not
  part of. Found by building `JsonEditor` on top of it: a `color`-typed field
  could not carry the handle its own row needed.

  Both roots are covered. The component renders a different element in `view`
  mode than in `edit` mode, so a spread on only one of them would make the
  handle appear and disappear with an unrelated prop.

- **`Table.Column` now announces its sort state with `aria-sort`.** The column
  already computed whether it was the sort key and in which direction, and spent
  both entirely on rendering a ▲/▼ glyph. Nothing reached assistive technology,
  so a sortable table sounded exactly like a static one and activating a header
  produced no feedback at all.

  ```html
  <!-- before -->  <th class="…">Name ▲</th>
  <!-- after  -->  <th class="…" aria-sort="ascending">Name ▲</th>
  ```

  A sortable column that is not the current key is now `aria-sort="none"`, which
  is deliberately not the same as omitting the attribute — it says "this sorts,
  but is not sorted right now". A **non**-sortable header still gets nothing,
  because claiming otherwise invites someone to activate an inert control. The
  arrow glyph is now `aria-hidden`, so it is no longer read out as stray text
  next to the real state.

  **What you must do:** nothing, unless you have CSS or tests keyed on the
  absence of the attribute — a selector like `th:not([aria-sort])` will stop
  matching sortable headers. Passing `aria-sort` yourself overrides the computed
  value, which is what a server-sorted table needs.

- **`data-*` and `aria-*` props now reach the DOM on `Table`, `Table.Head`,
  `Table.Body` and `Table.Column`.** They named every prop they used and had no
  `...rest`, so anything unrecognised was dropped — the same defect fixed for
  `Table.Row` in 5.8.0 and `Table.Cell` in #5. (#19)

  Those two were fixed because they were the two reported. Auditing the rest of
  the family in one pass — which is what the 5.8.0 entry said it had done for
  the *form* controls — found the four above still carrying it. `Table.Column`
  was the one that mattered: it is a `<th>`, so it is where `scope` and
  `aria-sort` belong.

  As elsewhere, the spread comes **before** the component's own attributes, so a
  passed prop cannot clobber the internal `data-react-fancy-*` marker,
  `className`, or the sort handler.

- **`Table.Column` no longer discards a caller's `onClick`** on a sortable
  column. It set its own handler unconditionally, so passing one was accepted
  and silently ignored. Both now run, the caller's first.

## [5.15.0] — 2026-08-09

### Added

- **`Container`, `Section` and `Grid`** — the layout primitives the kit did not
  have. Story #170, task 228, which the report calls "the highest-leverage gap
  found so far".

  ```tsx
  <Container as="main">
    <Section divider><Grid cols={3}>…</Grid></Section>
  </Container>
  ```

  All twenty Swiss-family gallery styles hand-rolled the same three things: a
  page container with a max width, section rhythm, and a modular grid.

  The obvious objection is that Tailwind already has `max-w-*`, `py-*` and
  `grid-cols-*`. What got repeated twenty times was not the utilities though —
  it was the **decisions**: how wide the page reads, how much air between
  sections, when the grid collapses. Twenty copies of a decision drift. These own
  the decision and leave the styling replaceable, the same split `Eyebrow` makes.

  Three details worth knowing:

  - `Container` and `Section` take `as`, because a container is often a `<main>`
    and forcing a `<div>` makes you wrap it.
  - `Grid` sets its column count through a **custom property and inline
    `grid-template-columns`**, not a `grid-cols-N` class. N is a prop, and
    Tailwind cannot generate a class it never sees in source — that is precisely
    what each hand-rolled copy worked around differently.
  - `Grid` collapses responsively by default, with `responsive={false}` for grids
    that are genuinely fixed and look broken when they collapse.

## [5.14.0] — 2026-08-09

### Added

- **`StatList`** — the mono figure stack (`70 packages / 261 components / MIT
  licensed`). Story #170, task 224.

  ```tsx
  <StatList items={[{ value: 70, label: "packages" }]} />
  ```

  The Inspiration index and `/packages` each hand-rolled this from tokens. That
  is the gallery working as intended — it stress-tests the kit and what it
  hand-rolls is the gap list — but the list only pays off when the gap comes
  back here, otherwise every surface keeps a copy and they drift.

  Takes `items` as **data rather than children**, because what those surfaces
  repeat is a shape, not a layout — and a data prop is what an agent can emit,
  which children are not. Each row carries a `data-stat` handle so a figure can
  be addressed rather than counted.

## [5.13.1] — 2026-08-09

### Fixed

- **5.13.0 never reached npm.** Its publish died with
  `ERR_WORKER_OUT_OF_MEMORY`: 5.13.0 raised the heap in `scripts.build`, but
  `prepublishOnly` invoked `tsup` directly and went straight past it, so the
  release path OOMed while CI was green.

  Every script now builds one way, through `npm run build`. Two routes to the
  same build is the actual defect — fixing only the one I happened to be looking
  at is what shipped a tag that could not publish.

## [5.13.0] — 2026-08-09

### Added

- **Per-component subpath exports.** (#21)

  ```tsx
  import { Badge } from "@particle-academy/react-fancy/badge";
  ```

  84 subpaths, one per component. **`.` stays the barrel**, so every existing
  import keeps working unchanged — this adds entry points, it does not move any.

### Fixed

- **A consumer importing one component no longer pays for all of them.**

  `dist/index.js` was ~660 kB exporting ~140 names, and tree-shaking could not
  rescue it from outside: the bundle carried hundreds of top-level initialiser
  calls, which a bundler must keep and which transitively retain most of the
  graph. The reporter's smallest route shipped ~931 kB of kit to render a form
  with four inputs.

  Measured by bundling a consumer that imports **only `Badge`**, minified,
  React external:

  | | bytes |
  |---|---|
  | published 5.12.0 | **1,133,438** |
  | 5.13.0 | **33,255** |

  The build now emits one entry per component with `splitting: true`, so shared
  code lands in chunks instead of being copied into each entry — without that,
  per-component entries would trade one large download for many duplicated ones,
  which is worse for anyone importing several.

  Note the **barrel itself got the same benefit**: the measurement above is
  identical whether you import from `.` or from `/badge`. Splitting is what made
  the graph reachable to a bundler; the subpaths make it explicit and guaranteed
  rather than dependent on your bundler's tree-shaking.

  **What you must do:** nothing. Switch to subpaths if you like the explicitness,
  but the barrel is no longer the reason your bundle is large.

### Changed

- `npm run build` runs tsup under `--max-old-space-size=8192`. Generating types
  for 84 entries exceeds Node's default heap and the build OOMs without it.

## [5.12.0] — 2026-08-09

### Added

- **`Toast` takes an `action`, so undo can be a button instead of a countdown.** (#18)

  ```tsx
  toast({
    title: "Moved to Claimed",
    action: { label: "Undo", onClick: () => move(id, previousStage) },
  })
  ```

  A timeout-based undo makes the safety of an action depend on how fast someone
  reads, which is worst for exactly the people who need undo most. Without a slot
  a consumer either dropped undo or rebuilt the toast — and a rebuilt one does not
  join the provider's stack, so it overlaps the real ones.

  Three behaviours are baked in rather than left to callers:

  - **A toast with an action does not auto-dismiss.** Expiring the offer is the
    same bug as making undo a timeout. Pass an explicit `duration` to opt back in.
  - Clicking the action runs it and then dismisses — leaving it up invites undoing
    an already-undone action.
  - **`Escape` dismisses**, scoped to the toast rather than the document, so it
    does not fight whatever modal or drawer is already listening.

  The action renders as a real `<button>`, so it is reachable by Tab from wherever
  focus already is. `ToastAction` is exported.

  **What you must do:** nothing. Toasts without an action keep the 5000ms default,
  and there is a test asserting it.

## [5.11.0] — 2026-08-09

### Added

- **`Progress` circular accepts a pixel `size` and an explicit `strokeWidth`.** (#17)

  ```tsx
  <Progress variant="circular" value={62} size={152} strokeWidth={11} />
  ```

  `size` topped out at `lg` (64px) and was written as an **inline style**, with
  the radius, circumference and dash maths computed in JS from that number. So a
  larger ring was impossible rather than awkward: inline styles beat any
  stylesheet rule short of `!important`, and winning that fight would still have
  left the geometry wrong. The reporter built a local ring instead, duplicating
  the circumference maths.

  When no `strokeWidth` is given, a pixel size derives one from the diameter — a
  5px stroke on a 152px ring reads as a hairline. The named scale keeps its exact
  previous values.

### Changed

- The circular SVG now uses a `viewBox` with `width="100%" height="100%"`, so the
  ring follows whatever sizes its box instead of having its dimensions baked in.

- **Named diameters moved from inline styles to shipped CSS**, keyed off
  `[data-react-fancy-progress][data-size="…"]`, so `className` can override them.

  Deliberately not Tailwind classes on the element: a consumer who has not
  `@source`d this package gets no generated utilities, and the ring would render
  with **no size at all**. Shipping them as real CSS works regardless — and
  because 5.9.0 put the stylesheet in `@layer base`, a utility still wins.

  **What you must do:** nothing, unless you were relying on the inline style to
  beat your own CSS. Named sizes render at the same diameters as before, and
  there is a test asserting that.

## [5.10.0] — 2026-08-09

### Fixed

- **`PromptInput` discarded the `File` on drop, so attachments could not be
  uploaded.** (#16) Only `{ id, name, bytes }` survived, so a host could render
  the chip and do nothing else with it — no POST, no `FormData`, no
  send-to-model.

  `PromptAttachment` now also carries:

  ```ts
  file?: File;   // what the user actually attached
  type?: string; // MIME, for hosts that branch on it
  ```

  Additive — existing code reading `name`/`bytes` is unaffected. They are
  optional because an attachment restored from a server has no `File`, but
  anything the user dropped or picked always has one.

  This is the expensive shape of bug: the UI looked finished — chips rendered,
  sizes correct — so it was only discovered when someone wired the upload up and
  found nothing to send. There was no escape hatch either, since attachments are
  internal state with no `value`/`onChange` and no ref.

- **The `📎 attach` button did nothing.** It shipped with a no-op `onClick` and a
  tooltip reading "Drop files here, or click" — an affordance that lied. It now
  opens a real file picker, which also means **keyboard and touch users can
  attach at all**, where before drop was the only route.

### Changed

- Attachment ids now use `crypto.randomUUID()` instead of
  `` `${name}-${Date.now()}-${Math.random()}` ``. Tidier, not a bug fix — the old
  scheme did produce distinct ids, and there is a test asserting it still does.

## [5.9.0] — 2026-08-09

### Fixed

- **Base styles are now in `@layer base`, so a Tailwind utility passed through
  `className` finally wins.** (#20)

  ```tsx
  <Badge className="bg-[#4338CA] text-white">Epic</Badge>  // was silently ignored
  ```

  In the CSS cascade an **unlayered** normal declaration outranks every layered
  one, whatever the specificity — and Tailwind v4 puts utilities in
  `@layer utilities`. The kit shipped its base looks unlayered, so `className`
  utilities could never win. It failed silently and backwards: the class is in
  the DOM, DevTools shows it, nothing warns, and the consumer doing the
  documented thing got a worse result than one reaching for `!important`.

  Note this was **not** solved by the existing `:where()` wrappers. Those drop
  specificity to zero, and a comment in `styles.css` claimed a generated utility
  would therefore win. It would not — specificity is only compared *within* a
  layer. Measured in a browser before and after: the overlay dark-mode rule beat
  a `@layer utilities` background before this change and loses to it now.

  **`base`, not a private layer name.** A `@layer fancy-base` orders by first
  declaration, so whether utilities won would depend on whether you imported this
  file before or after Tailwind. `base` always precedes `components` and
  `utilities`, so it is order-independent and needs nothing from you.

  `@theme` stays unlayered — wrapping it stops Tailwind registering the tokens at
  all, which would turn `bg-brand` and `text-primary-600` back into classes that
  resolve to nothing.

  **What you must do:** check any place you worked around this. Overrides that
  were previously ignored now apply, so a `className` you left in believing it
  did nothing will start taking effect. If you moved tones into your own
  unlayered stylesheet (the documented workaround), that still wins — unlayered
  beats layered — so nothing breaks until you choose to move it back.

## [5.8.0] — 2026-08-09

### Fixed

- **`data-*` and `aria-*` props now reach the DOM** on `Switch`, `Checkbox`,
  `CheckboxGroup`, `RadioGroup`, `MultiSwitch`, `Field` and `Table.Row`. They
  named every prop they used and had no `...rest`, so anything unrecognised was
  silently dropped. (#22, #19)

  ```tsx
  <Switch data-pw-set="digits" … />
  document.querySelectorAll('[data-pw-set]')  // was [] — nothing, anywhere
  ```

  Nothing reported it: React discards unknown props on a component silently,
  TypeScript does not check hyphenated prop names at all, and the component
  renders perfectly. It only shows up when something tries to **address** the
  control — the agent-driving case the component contract exists to protect:

  > Each interactive element has a stable identity (`id`, `data-*`, or a
  > selector prop). Agents never guess DOM.

  The two reported were `Switch` and `Table.Row`; auditing the family in one pass
  found three more, so all of them are fixed and asserted together.

  **Where the handle lands:** the component's own outermost element, which exists
  in every mode. `Switch` renders a `<span>` instead of its `<button>` in view
  mode, and the group components are only wrapped in `<Field>` when a label is
  present — so attaching to the control or the wrapper would have moved the
  handle around depending on unrelated props.

  The spread comes **before** the component's own attributes, so a passed prop
  cannot clobber the internal marker, `className` or the handlers.

  **What you must do:** nothing. This only adds props that previously vanished.
  If you worked around it with `id`, that still works — `id` was always honoured.

## [5.7.0] — 2026-08-09

### Added

- **`<PullQuote>`** — the oversized line lifted out of body copy, with optional
  attribution and a rule-bracketed treatment.

  Twelve gallery styles build one, but the reason this is a component rather
  than a class is the same reason `<Kbd>` renders a real `<kbd>`: of the eight
  quote elements in those styles, **one** was a `<blockquote>` — five were `<p>`
  and two were `<div>` — and **none** used `<cite>`. They all look right and
  none of them says what it is.

  `citeUrl` maps to `<blockquote cite>`, which is the attribute's actual job
  (the source URL) and is routinely confused with the visible `<cite>` element
  (the speaker or work). Separate props so the two cannot collapse into one
  another.

  **What you must do:** nothing. Additive.


## [5.6.1] — 2026-08-09

### Fixed

- **`<Stat>` and `<IndexList>` now carry a stable handle on each PART** —
  `data-react-fancy-stat-value` / `-stat-label`, and `-index-num` / `-index-title`
  / `-index-meta` / `-index-value`.

  Shipped in 5.6.0 with a handle on the root only, which made them unrestylable
  in practice: a consumer styling `.swiss-figure__num` had no selector for the
  figure inside the component, so adopting it meant losing the design. Being
  unrestylable is how twenty-seven separate copies of a figure band happened in
  the first place, so a primitive that cannot be restyled does not solve the
  problem it was built for.

  **What you must do:** nothing. Attributes only.


## [5.6.0] — 2026-08-09

### Added

- **`<Stat>` / `<Stat.Band>`** — a big display figure with a caption, and the
  row it sits in.

  Twenty-seven gallery styles build this, and **five of seventeen forgot
  `tabular-nums`**. That is not cosmetic: in a proportional face a `1` is
  narrower than a `0`, so a row meant to read as a band comes out visibly
  ragged — from one property nobody thinks to look for. It is the default here,
  at every size.

- **`<IndexList>`** — the flush-left numbered index: `num · title · meta ·
  trailing value`, each row optionally a single click target. Thirteen styles
  build it; the sandbox uses a stretched-link treatment in twenty-four places.

  **Exactly one anchor per row, by construction.** The row is `relative` and the
  title's `<a>` carries `after:inset-0`, so the anchor's own pseudo-element
  covers the row. Wrapping the row in an `<a>` instead produces nested anchors
  — issue #418 — which the browser silently restructures, so the server HTML and
  the client tree disagree and hydration fails. A test asserts the invariant.

  The link text stays the title rather than becoming an `aria-label` on an
  invisible overlay, so the accessible name is what you would say out loud.
  `linkAs` takes your router's link component (Inertia, `next/link`) to keep
  client-side navigation.

  **What you must do:** nothing. Both additive.


## [5.5.0] — 2026-08-09

### Added

- **`<Kbd>`** — a keyboard key cap. `<Kbd>K</Kbd>`, or a chord with
  `<Kbd keys={["Cmd", "K"]} />`.

  Twenty `<kbd>` elements across this suite's own showcase carried **six**
  different className recipes for the same thing: rounded, bordered, mono,
  small, with a dark-mode counterpart. None disagreed on intent — they
  disagreed on which greys.

  Two details it puts in one place. `min-w`, because without it a `K` cap is
  visibly narrower than an `Esc` beside it and a row of single letters reads as
  ragged rather than as keys. And `not-italic`, because several UA stylesheets
  italicise `<kbd>` — every hand-rolled copy that happened to set a mono font
  hid that by accident, and the one that did not, did not.

  A chord renders as one `<kbd>` containing per-key caps, with the separator
  `aria-hidden`, so a screen reader announces "Cmd + K" as the single shortcut
  it is rather than as two unrelated keys.

  **What you must do:** nothing. Additive.


## [5.4.0] — 2026-08-09

### Added

- **`<Brand.Mark>`** — the square logo tile: a glyph centred in a rounded
  coloured square, at `sm`/`md`/`lg` or an exact pixel size.

  `Brand` has always taken its mark as a caller-supplied `logo` node, which is
  exactly why four surfaces each rebuilt the same square inline — fixed size,
  rounded, grid-centred, bold, and `shrink-0` so a flex row never squashes it.
  That last one is the detail every hand-rolled copy had to remember.

  **It ships no brand colour, deliberately.** The default is a neutral zinc
  tile and the fill is `className`'s job. A component library inventing your
  brand gradient would be wrong and would be the first thing every consumer
  overrode — and each duplicated copy already pulled its gradient from a token
  class and hand-rolled only the box, so the box is all this owns.

  Decorative by default (`aria-hidden`), which lifts when you pass an
  `aria-label`: a mark beside the brand name is redundant to a screen reader, a
  mark standing alone is not.

- **`<Eyebrow>`** — the mono running head that opens a section:
  `<Eyebrow num="01" label="Selected work" aside="…" rule />`.

  Thirty-six gallery surfaces carry a version of this. What they share is the
  arrangement — a numbered marker, a label, an optional trailing aside, an
  optional hairline — while every one restyles the type, so this owns the
  structure and the uppercase-mono default and gets out of `className`'s way.

  The aside uses `ml-auto` rather than the row using `justify-between`: with
  `justify-between` a single-item eyebrow drifts, and half of them have only
  one item.

  **What you must do:** nothing. Both are additive; `Brand` and every existing
  component render unchanged.


## [5.3.0] — 2026-08-09

### Added

- **`<Card.Media>`** — the fixed-ratio thumbnail region at the top of a card,
  with slots pinned to its corners (`topLeft` / `topRight` / `bottomLeft` /
  `bottomRight`), an `src`, a `ratio` or fixed `height`, and a `background`.

  ```tsx
  <Card interactive>
    <Card.Media src={thumb} background={swatch} height={122}
                topLeft={<Chip>{num}</Chip>} topRight={<Chip>{mode}</Chip>} />
    <Card.Body>…</Card.Body>
  </Card>
  ```

  Four surfaces had each rebuilt exactly this from tokens, and one of them was
  already wrapping `Card` and hand-rolling only this region — which is why it is
  `Card.Media` and not a separate `<MediaCard>`. What was being asked for was
  never a different card; it was a card with a picture in it.

  `background` is not decoration. It shows through while the image loads and
  stays visible if the image never arrives, so a missing thumbnail degrades to
  the intended colour rather than to a hole.

- **`<Card interactive>`** — the hover lift, border/shadow response, and corner
  clipping a grid tile or link card wants. Clipping is part of `interactive`
  rather than always-on, because clipping unconditionally would cut off
  popovers and dropdowns that legitimately overflow a static card.

  **What you must do:** nothing. Both are additive, and a `Card` written before
  this release renders identically — pinned by a test.


## [5.2.0] — 2026-08-09

### Added

- **`<Heading>` reaches display scale.** The `size` scale gains `3xl`–`7xl`,
  mapping to `text-5xl` through `text-9xl`, with tighter tracking at those steps
  (`tracking-tight` at 3xl–4xl, `tracking-tighter` above).

  It stopped at `2xl` before, which is why a hero wanting "typography at maximum
  volume" had to hand-roll its own `<h1>` — a primitive that exists but cannot
  reach the size a design needs is a primitive that gets bypassed.

  **What you must do:** nothing. Purely additive; every existing size renders
  exactly as before, pinned by a test.

  **Note the ramp is semantic, not literal.** These names are steps on a scale,
  not Tailwind class names: `xl` has meant `text-2xl` and `2xl` has meant
  `text-4xl` since this component shipped, and the new steps continue that
  offset. Re-basing so `4xl` meant `text-4xl` would have silently shrunk every
  heading already using `2xl`, so the offset stays and is now documented on the
  prop.

  Tracking is applied to the display steps ONLY — spacing tuned for
  body-adjacent headings reads loose once type is big, and that difference was
  most of why a hand-rolled `<h1>` looked better than the component did.


## 5.1.0 — 2026-08-07

### Added

- **`reveal` on `Input`** — a show/hide toggle for `type="password"`, which the
  component did not have. Consumers were hand-rolling an eye-icon button beside
  the field to get it.

  ```tsx
  <Input type="password" reveal />
  ```

  Optional `revealed` / `onRevealedChange` make the state controllable, and
  `revealLabel` / `hideLabel` replace the default accessible labels.

  Details that are easy to get wrong when hand-rolling it, and are handled here:

  - The toggle is `type="button"`. The HTML default is `submit`, so a reveal
    inside a login form submits the form on every click.
  - It is `tabIndex={-1}`. The path through a login form is field → submit, and
    a reveal in between is a stop most people do not want. It stays reachable by
    click and to screen readers, which carry `aria-pressed` and `aria-controls`.
  - Only the RENDERED type changes. The declared `type` stays `"password"`, so
    `mode="view"` still masks the value rather than printing it.
  - `reveal` on a non-password input is ignored — a reveal on a visible field is
    a button that does nothing.
  - It replaces `trailing` rather than stacking on it; both occupy the same
    corner, and rendering both looks like a bug.

  The icons are inline SVG rather than `<Icon>`, so a password field does not
  depend on an icon set being registered.


## 5.0.0 — 2026-08-04

The kit 0.5 platform floors. **This release changes only what the package
requires — no component API changed, nothing was removed, and nothing was
renamed.** If you are already on React 19 and Node 22, upgrading is a version
bump and nothing else.

### Changed

- **BREAKING — React 18 is no longer supported.** `peerDependencies.react` and
  `react-dom` move from `^18.0.0 || ^19.0.0` to `^19.0.0`.

  **What you must do:** if you are on React 19, nothing. If you are on React 18,
  stay on `react-fancy@4` — it continues to receive fixes on the 0.4 kit line —
  or upgrade your app to React 19 first, then take this release.

  React 18 support was a claim nothing tested. Every build and every test in
  this package has always run against 19 (`devDependencies.react` was `^19.0.0`),
  so the 18 half of that range was never executed. An untested compatibility
  claim is worse than an absent one, because it reads as support.

- **BREAKING — Node 22 is now declared as the floor.** `engines.node` is
  `>=22`, where the package previously declared nothing at all.

  **What you must do:** on Node 22 or newer, nothing. Note that npm only
  *warns* on an `engines` mismatch, but **pnpm fails the install**, so this
  surfaces differently depending on your package manager. Node 18 is
  end-of-life and 20 is maintenance-only.

  Declaring nothing was not the same as supporting old Node — it meant a
  consumer on 18 installed cleanly and discovered the problem at runtime.

- `devDependencies` for `react`, `react-dom`, `@types/react` and
  `@types/react-dom` pinned to `^19.2.0`, so the tested version is stated
  rather than inherited.

### Why this is a major

This package is past 1.0, so a breaking change takes a major. Most of the suite
is pre-1.0 and lands the same floors in a minor — that difference is semver, not
a difference in how much changed.

**Peer ranges in consuming packages:** most first-party packages declare
`@particle-academy/react-fancy` as an open range (`>=3`, `>=4`) and resolve 5.x
without any change. A few pinned an upper bound and need widening before they
can take this; those are released alongside.

## 4.19.1 — 2026-08-02

### Fixed

- **`Sidebar.Item` labels were clipped mid-word instead of ellipsing.** Two
  causes stacked. A `<button>` sizes to FIT-CONTENT rather than to its parent,
  so a label longer than the sidebar made the item wider than the sidebar and an
  ancestor clipped the overflow. And the label span carried `truncate` without
  `min-w-0`, so even under width pressure a flex item defaults to
  `min-width: auto` — its min-content width — and refuses to shrink. Fixed with
  `w-full` on the item and `min-w-0` on the label; either alone is insufficient.

  Only visible with labels longer than the sidebar is wide, which is why short
  nav labels never surfaced it.

## 4.19.0 — 2026-08-02

### Added

- **A brand colour scheme — `brand`, `primary-*` and `secondary-*`.** Packages
  across the suite were already writing `bg-brand`, `text-primary-600` and
  `border-secondary-200` against tokens **nothing defined**. Tailwind generated
  no such utility, the class resolved to nothing, and the component rendered
  with correct markup and no colour — and no error anywhere. This turns those
  class names into a contract instead of a hope.

  - `brand` — one accent; the thing a consumer rebrands first.
  - `primary-50…950` — the accent as a full scale.
  - `secondary-50…950` — the **neutral** scale for surfaces, borders and text.

  **`secondary-*` inverts with the theme.** `text-secondary-900` means
  "strongest foreground", not "nearly black", so it stays readable on a dark
  surface. That distinction is the defect it was written to prevent: mixing a
  literal background (`bg-white`) with a semantic foreground
  (`text-secondary-900`) is what rendered white-on-white in a dark host and made
  `@particle-academy/classroom` unusable on the showcase.

  **What you must DO: nothing.** Purely additive — no existing utility changes
  meaning. Override any token in your own `@theme` and yours wins, because the
  utilities read the variable rather than baking a value in:

  ```css
  @theme { --color-brand: var(--color-emerald-600); }
  ```

  Requires `@import "@particle-academy/react-fancy/styles.css"` in your Tailwind
  entry, which is already the documented setup.

### Changed

- **README: component demos now point at the showcase package pages.** The
  "Demo Pages" section still sent readers (and agents) to
  `resources/js/react-demos/pages/`, a tree that was removed from the showcase.
  Every component's live demo is a page at
  `https://ui.particle.academy/packages/react-fancy/<component>`, sourced from
  one file per component in `Particle-Academy/pa-ux-sandbox` under
  `resources/js/Pages/Packages/ComponentDocs/`. Docs only — no code change.

## [4.18.0] - 2026-07-31

### Added

- **Navigation primitives accept `as`, so a router `<Link>` can render in their
  place.** `Navbar.Item`, `Sidebar.Item`, `Menu.Item`, `MobileMenu.Item` and
  `Breadcrumbs.Item` all hardcoded a plain `<a href>` — a **full page load** in
  every client-routed app, from the app's own nav chrome. The only workaround
  was nesting a router `<Link>` inside the item, which is an anchor inside an
  anchor: invalid HTML, and the same nested-anchor shape behind a past SSR
  hydration bug.

  `as` is the seam `Button` already had, and it is router-agnostic on purpose —
  one prop covers Inertia, TanStack Router, React Router and Next rather than a
  package per router. **No action needed:** the default is still `"a"`, so an
  item given only `href` renders exactly what it rendered before.

  ```tsx
  // href-based routers (Inertia, Next)
  <Navbar.Item as={Link} href="/dashboard">Dashboard</Navbar.Item>

  // to-based routers (TanStack Router, React Router) — router props pass through
  <Navbar.Item as={Link} to="/dashboard">Dashboard</Navbar.Item>
  ```

  Link mode engages on `href` **or** `as`, because a `to`-based router passes no
  `href` and would otherwise fall through to the non-interactive branch — an item
  that renders correctly and navigates nowhere. `href` is only forwarded when
  actually set, so it cannot overwrite the one a router derives for itself.

  Unrecognized props now reach the rendered element, which is what carries `to`,
  `params`, `preload` and `search` through to a router's Link.

### Fixed

- **`onClick` was silently dropped on any item with an `href`.** `Sidebar.Item`,
  `Menu.Item` and `MobileMenu.Item` swapped the whole prop set in link mode, so
  an item that navigates *and* closes a drawer — the common mobile case — never
  ran its handler, with no error to notice. It now fires alongside navigation.

## [4.17.1] — 2026-07-28

### Fixed

- **`TimePicker` crashed the first time you clicked "Click to edit".** Four
  `useCallback`s sat below the `mode="view"` early return, so view mode ran three
  hooks and edit mode ran seven. React compares hook counts between renders, so
  the transition threw `Rendered more hooks than during the previous render` from
  inside React — an error naming none of this component, with the field gone from
  the page.

  **If you use `<TimePicker mode="view">`, this was reproducible on every first
  click.** `mode="edit"` (the default) was never affected, which is why it
  survived: the whole existing suite rendered one mode and stopped, and the bug
  lives exclusively in the transition.

  A regression test now mounts in view mode and clicks. It fails against the
  previous release, which is the only reason to trust it.

### Changed

- Widened the `@particle-academy/fancy-file-commons` requirement from `^0.2.0` to
  `>=0.2 <2.0`, so a sibling minor release is an upgrade and not a resolver
  conflict. **No action needed** — widening a range only adds candidates; the
  version you have today still resolves.

  A caret on a `0.x` range locks the MINOR, so this pinned a sibling at
  whatever it happened to be on the day it was written, and each sibling
  release then read as a conflict to the resolver rather than an upgrade.
  Nothing here was using an API the newer minors removed — the range was the
  whole problem.

## [4.17.0] - 2026-07-27

### Added

- **`<Breadcrumbs.Item onClick>`** — a crumb that navigates by callback instead
  of by URL.

  The item only ever supported `href`, so a **controlled** component that owns
  its own navigation had no address to link to: a repository browser walking
  directories, a wizard stepping back, any surface whose "location" lives in
  React state rather than the URL bar. The only way to make such a crumb
  clickable was to nest a `<button>` inside the rendered `<span>`, which puts
  interactive content inside a non-interactive element.

  Renders the crumb as a `<button>`. `href` still wins if both are given — a
  link is right-clickable, middle-clickable and copyable and a button is none of
  those, so silently downgrading one to the other would be the wrong way to
  resolve the ambiguity. Ignored on the `active` crumb, which is where you
  already are.

  **Nothing to do.** Purely additive; every existing crumb renders exactly as
  before.

## [4.16.0] - 2026-07-20

### Added

- **`Drawer`** — a panel that slides in from any edge. `side` takes
  `left` / `right` / `top` / `bottom`, with compound `Drawer.Header` /
  `Drawer.Body` / `Drawer.Footer` slots matching `Modal`'s shape.

  `size` addresses the drawer's **own axis** — width on the horizontal edges,
  height on the vertical ones — so `size="lg"` does not need re-learning when a
  drawer moves from the side to the bottom.

  Two anchoring modes via `attach`:

  - `viewport` (default) — portalled, `fixed`, locks body scroll, traps focus
    and sets `aria-modal`. The classic app-level drawer.
  - `container` — `absolute` within the nearest positioned ancestor, with no
    portal, no scroll lock and no focus trap. Attach a drawer to a `Card`, a
    layout pane, or the shell around a prompt input and it stays in that box.
    A container-attached drawer is a panel, not a dialog, so trapping focus in
    it would strand keyboard users inside the card.

  `Drawer.Container` supplies the `relative overflow-hidden` anchor that
  `attach="container"` needs. Without a positioned ancestor an absolute drawer
  silently escapes to the viewport, which reads as `attach` being ignored.

  Dismissal is à la carte: `backdrop`, `dismissOnBackdrop`, `dismissOnEscape`.
  With `backdrop={false}` the frame turns off pointer events so the drawer
  cannot swallow clicks meant for the page behind it.

- Vertical slide keyframes `fancy-slide-in-top` / `-out-top` /
  `-in-bottom` / `-out-bottom`. The horizontal pair already existed but was
  built for `MobileMenu.Flyout`, which only ever opened left or right.

### Changed

- Slide animations now collapse to a ~0 duration under
  `prefers-reduced-motion: reduce` rather than being disabled. `useAnimation`
  unmounts on `animationend`, so `animation: none` would remove the event and
  leave a closed drawer in the DOM permanently.

[Unreleased]: https://github.com/particle-academy/react-fancy/compare/v4.16.0...HEAD
[4.16.0]: https://github.com/particle-academy/react-fancy/releases/tag/v4.16.0

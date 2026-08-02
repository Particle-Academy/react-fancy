# Changelog

All notable changes to `@particle-academy/react-fancy` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **History before 4.16.0 is not yet recorded here.** This file starts at the
> release that introduced it; earlier versions are described by their git tags
> and GitHub releases. Backfilling is tracked separately.

## [Unreleased]

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

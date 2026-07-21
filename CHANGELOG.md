# Changelog

All notable changes to `@particle-academy/react-fancy` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **History before 4.16.0 is not yet recorded here.** This file starts at the
> release that introduced it; earlier versions are described by their git tags
> and GitHub releases. Backfilling is tracked separately.

## [Unreleased]

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

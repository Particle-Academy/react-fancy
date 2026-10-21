# Changelog

All notable changes to `@particle-academy/react-fancy` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **History before 4.16.0 is not yet recorded here.** This file starts at the
> release that introduced it; earlier versions are described by their git tags
> and GitHub releases. Backfilling is tracked separately.

## [Unreleased]

## [5.54.1] - 2026-10-21

### Fixed

- **A `Button` narrower than its label now wraps the label inside itself.**
  The showcase's own "Constrained width" example (104px columns, captioned
  "multi-word labels stack left-aligned, icon stays put") had its labels
  spilling past the buttons and over each other: the label carried
  `whitespace-nowrap`, so text 92-116px wide had nowhere to go in a 54px slot.
  It now wraps, left-aligned, with the icon staying put beside it; words are
  never split. An unconstrained button is unchanged -- measured in Chrome, every
  width and height in the probe row is identical to 5.54.0.
  - **Want one line with an ellipsis instead?** `labelClassName="truncate"`.
    The label has `min-w-0` and no white-space class of its own, so `truncate`
    wins uncontested inside a button whose width you set (`w-full` in a narrow
    column, `w-24`, `max-w-[120px]`, ...).
  - **What to DO:** nothing, unless you relied on a squeezed button keeping its
    label on one line (a flex row narrower than its buttons, a "send →" label
    whose arrow is part of the text). 4.4.1 made that the default; it is now
    opt-in: add `labelClassName="whitespace-nowrap"` to that button, or
    `shrink-0` so the row cannot squeeze it.
- **`Switch` honours `labelHidden`.** It was ignored, so the label was always
  drawn. It is now visually hidden (`sr-only`) and still names the control, as
  on Input, Field, DatePicker and CheckboxGroup.
- **`aria-*` on a `Switch` now names the switch, not its wrapper.** Rest props
  were spread on the wrapping `<div>`, so `aria-label` / `aria-labelledby`
  labelled a div and left the `role="switch"` button unnamed. The split: every
  `aria-*` prop goes on the button; everything else -- `className`, `style`,
  `data-*`, event handlers -- stays on the wrapper exactly as before. (In
  `mode="view"`, where there is no button, `aria-*` stays on the wrapper.)
- **`Switch`'s unchecked track reads the `border` token** (`--fancy-border` /
  `--fancy-border-dark`) instead of hard-coded zinc. Set nothing and nothing
  changes: the fallbacks are today's `zinc-200` / `zinc-600` (the dark one is
  one step lighter than the role's `zinc-700` default, so a track still reads
  against a dark surface; listed as a deliberate exception in the token test).
- **A `MultiSwitch` directly inside a `Tooltip` lost its selected thumb.**
  Two halves, both fixed. `Tooltip` cloned its child with its own `ref` and
  `onMouseEnter` / `onMouseLeave` / `onFocus` / `onBlur`, REPLACING the child's;
  they are now composed, so a child's own ref and handlers keep working. And in
  React 19 a ref reaches a function component as a plain prop, so the
  Tooltip's ref arrived in `MultiSwitch`'s rest props and replaced the ref its
  thumb is measured from; `MultiSwitch` now feeds both. A `ref` you put on a
  `MultiSwitch` yourself reaches its radiogroup too. If you wrapped the switch
  in a `<span>` to work around this, the wrapper can go.
  - The same report said the switch also lost its `className`. It does not:
    the class is in the DOM and paints in light mode, directly inside a Tooltip
    or not. In DARK mode a bare `border-green-500` loses to the component's own
    `dark:border-*`, with or without a Tooltip -- add `dark:border-green-500`.

### Changed

- Docs only: `icon-config.ts`'s comments now say `<Icon name="github-logo" />`
  resolves the brand mark. fancy-brand-icons 0.4.0 registers every mark as
  `<brand>-logo`, so a bare `github` is Lucide's icon.

## [5.54.0] - 2026-10-21

### Added

- **`PdfViewer` page-image mode (`pages`), with an access `policy` and a
  `watermark`** (react-fancy#36). For showing a PDF without handing over the
  file: your app renders the PDF to page images on its server, behind its own
  auth, and the viewer only displays them.
  - `pages={{ count, url: (page, scale) => string, aspectRatio? }}`. The page
    images are the **only** requests the viewer makes. It never fetches or
    references the PDF, and `src` is ignored in this mode even if passed.
    `scale` is zoom x devicePixelRatio, rounded up to 1, 1.5, 2, 3 or 4.
  - Its own toolbar: previous / next page, zoom out / reset / in, fit width,
    fit page. With `frame`, full screen comes from the `FauxClient` frame.
    Pages near the viewport get images; the rest are sized placeholders.
  - Controlled `page` / `onPageChange` and `zoom` / `onZoomChange`, with stable
    `data-react-fancy-pdf-viewer-*` handles on each page and button.
  - **No search**: page images have no text to search. That is the cost of
    not sending the PDF.
  - `policy={{ download?, print?, copy?, screenshot? }}`, all allowed by default.
    **Every flag is a deterrent, not a guarantee.** The real protection is that
    the PDF never reaches the browser:
    - `download: false`: no context menu on the pages and the images are not
      draggable. Page images can still be captured (devtools, cache, screen).
    - `print: false`: print CSS blanks the viewer, and Ctrl/Cmd+P is
      intercepted while focus is inside it.
    - `copy: false`: user selection off (there is no text layer anyway).
    - `screenshot: "deter"`: the pages blur while the tab is hidden or the
      window loses focus, and for 1.5 s after PrintScreen (which also tries to
      clear the clipboard, best effort). **A web page cannot prevent
      screenshots.**
  - `watermark={{ text, opacity?, angle?, density? }}`: a tiled overlay on every
    page, `pointer-events: none`. **It can be removed with devtools.** If it
    must hold, burn it into the images on your server; `url(page, scale)` is
    where to ask for that.
  - `policy` and `watermark` apply only in page-image mode. The native-plugin
    mode (`src`) is unchanged and cannot be restricted.
  - New types: `PdfPageSource`, `PdfViewerPolicy`, `PdfViewerWatermark`.
  - `MediaViewer` (`pdfProps`) and fancy-code's `FileViewer`
    (`mediaProps.pdfProps`) already forward these untouched, so neither needed a
    change.
- **What to do:** nothing unless you want it. `src` is now optional in the
  types, since page-image mode does not need one; every existing call compiles
  and renders as before. No new dependencies.

## [5.53.1] - 2026-10-21

### Fixed

- **Inactive nav labels and their hover fill ignored a host palette.**
  TribeShare's runtime audit against 5.53.0 found the following still on raw
  zinc, and beating its tokens in dark mode, so it was overriding them per
  instance:
  - MultiSwitch's unselected option label: `text-zinc-600 dark:text-zinc-400`.
  - Sidebar.Item's inactive label (the same pair) and its hover fill:
    `hover:bg-zinc-50 dark:hover:bg-zinc-800/50`.

  None of the ten 5.52.0 roles reproduced either pair exactly, so there are
  **two new roles**:
  - `text-subtle` (`--fancy-text-subtle` / `-dark`): zinc-600 / zinc-400.
  - `surface-hover` (`--fancy-surface-hover` / `-dark`): zinc-50 / zinc-800
    at 50%. The dark default is written out as
    `color-mix(in oklab, var(--color-zinc-800) 50%, transparent)`, so a value
    you set is used as-is, not at half strength.

  Both roles now cover every exact occurrence in the kit, not just the two
  that were reported. That is 24 pairs in 19 files: MultiSwitch, Sidebar.Item,
  Sidebar.Submenu, Menu.Item, Menu.Submenu, MobileMenu.Item, Navbar.Item, the
  Select and Autocomplete option hover, Table row hover, Kanban, Accordion
  content, the Chart axis and labels, Timeline, and the Editor's blockquote.
  Their active and hover text uses the existing `text` role.
- **What to do:** if you set nothing, nothing changes. Light and `.dark`
  screenshots, including Sidebar, Menu and MultiSwitch, are byte-identical to
  5.51.2, and the computed hover colours of Sidebar.Item and Menu.Item match in
  both modes. If you were overriding these per instance, you can delete those
  overrides and set the two new tokens instead.
- **Still on zinc, because no token matches them exactly:**
  - Navbar.Item's hover fill (`hover:bg-zinc-50 / dark:hover:bg-zinc-800`, which
    is opaque rather than 50%).
  - The active Tabs and Navbar label (`text-zinc-900 / dark:text-white`).
  - SidebarToggle's hover text (`zinc-600 / zinc-300`).

## [5.53.0] - 2026-10-21

### Added

- **`[data-theme="dark"]` now moves every surface `.dark` moves.** Switching the
  attribute alone -- on `<html>` or any wrapper -- turns the kit dark, provided
  your `dark:` variant follows it too (next item).
- **`@particle-academy/react-fancy/dark-variant.css`** -- the one-line
  `@custom-variant dark` that follows `.dark` OR `[data-theme="dark"]`, on the
  element or an ancestor. Import it after `tailwindcss` in your CSS. Opt-in,
  because it replaces the `dark` variant for your whole build.

### Fixed

- **`styles.css` ignored `[data-theme="dark"]`.** Its 37 dark selectors
  (the `--color-secondary-*` flip, the inherent dark inputs, checkbox/radio,
  switch track, input affixes, overlays, overlay hover + separators, field
  labels, focus ring, the media checkerboard) were all written `:where(.dark …)`.
  Each now reads `:where(.dark …, [data-theme="dark"] …)` -- still zero
  specificity, so any override you had still wins.
  - **Why binding `@custom-variant dark` to the attribute did not fix this:**
    a custom variant rewrites what Tailwind compiles through the `dark`
    VARIANT -- `dark:` utilities and `@variant dark` blocks. These were plain
    selectors with `.dark` written into them, which no variant touches. The
    most visible casualty was the secondary scale: `text-secondary-900` stayed
    near-black on a dark page.
  - **What to do:** if you switch themes with the class, nothing. If you
    switch with `data-theme`, import `dark-variant.css` (or add
    `[data-theme="dark"], [data-theme="dark"] *` to your own variant).

### Not changed

- Under `.dark` everything renders exactly as before: a browser screenshot of
  18 components in light and `.dark` is byte-identical to 5.51.2 and 5.52.0,
  with and without `dark-variant.css` imported.

## [5.52.0] - 2026-10-21

### Added

- **Semantic theme tokens.** A host can now repaint the kit's neutral chrome
  with its own palette, light and dark, WITHOUT remapping Tailwind's `zinc` or
  `violet`. Ten roles, two CSS variables each (`--fancy-<role>` for light,
  `--fancy-<role>-dark` for dark):
  `surface`, `surface-muted`, `border`, `border-strong`, `input`, `text`,
  `text-soft`, `text-muted`, `text-faint`, `focus`. The table, with each role's
  default and what reads it, is exported as `THEME_TOKENS` and documented in
  the README under "Semantic tokens".
  ```css
  :root {
    --fancy-surface: #fbf6ee;      --fancy-surface-dark: #1f2833;
    --fancy-border: #e4d3bd;       --fancy-border-dark: #3a4757;
    --fancy-text: #3b2a1e;         --fancy-text-dark: #e6edf5;
  }
  ```
  Set them anywhere the variable is in scope (`:root`, `body`, a wrapper) -- no
  selector, layer or specificity to win.
- 351 light/dark class pairs across 126 component files now read these tokens
  (Card, the overlays, every form control, Table, Tabs, Menu, Sidebar, Navbar,
  Toast, Timeline, Chart axes, FileBrowser, TreeNav, PromptInput chrome, …),
  plus the dark-mode rules in `styles.css` (inputs, checkbox/radio, switch
  track, input affixes, overlays, overlay hover + separators, field labels,
  focus ring).
- The literal colours TribeShare's 2026-10-21 audit found in chrome are gone:
  the form controls' `#1e1e24` dark field (Input and `inputs.utils`, Checkbox,
  CheckboxGroup, RadioGroup, Autocomplete, OtpInput, Pillbox, EmojiSelect) is
  `--fancy-input-dark`; ChartLine's dot hole and ChartPie's slice gap (`white`)
  are `surface`; MoodMeter's grid lines and Timeline's scrollbar thumb are
  `text-faint`.

### Changed

- **Nothing you can see, unless you set a token.** Every converted class
  carries its old colour as the `var()` fallback --
  `bg-[color:var(--fancy-surface,var(--color-white))]` where it said
  `bg-white` -- so with no token set the computed value is identical. Verified
  two ways: the suite compiles each token class with Tailwind and asserts its
  declaration is `var(--fancy-x, <the old utility's declaration>)`, and a
  browser screenshot of 18 components in light and dark is **byte-identical**
  before and after.
- `className` overrides still win exactly as before: tailwind-merge classifies
  the token classes as the same colour utilities they replaced.
- **What to do:** nothing. If you asserted on a literal class string in your
  own tests (`toContain("bg-white")` on a kit component), assert on the token
  class or the computed colour instead.

### Not covered -- deliberately

- **Colours that encode data stay literal:** chart series palettes and the
  Sparkline default, file-type marks and folder glyphs (FileBrowser, TreeNav),
  MoodMeter's series colours, PromptInput's mention-kind marks and confidence
  scale, ReasonTag's confidence scale, Avatar's glow per event kind,
  ColorPicker's default value. Repainting them with a neutral palette would
  erase what they mean. `tests/literal-colours.test.tsx` lists each with its
  reason and exact values, so a new literal anywhere fails the suite.
- **An explicit `color` prop is the host's choice, not chrome:** Badge, Button,
  Callout, Progress, Switch and Timeline colour maps keep their hues.
- **Coverage is not total.** A pair is converted only where one token
  reproduces it exactly in BOTH modes. Near-misses keep zinc today -- e.g.
  `text-zinc-600 / dark:text-zinc-400` (15 sites), `border-zinc-200 /
  dark:border-zinc-800` (13), `text-zinc-900 / dark:text-white` (13), the
  default Button and Badge. Widening a token over them would change their
  look, which this release promises not to do.
- **Dark mode still keys off your `dark:` variant and `.dark`.** Following
  `[data-theme="dark"]` is the next release.

## [5.51.2] - 2026-10-21

### Fixed

- **`Toast.Stack` puts the front card first in the DOM**, then the cards behind
  in walk order. It rendered the cards behind first, so with three cards the
  DOM read 2, 3, 1 -- and a `querySelector`, the stack's `textContent` or a
  copy-paste got a card behind before the one in front. (Reported via MOIC
  against fancy-app-update's `AppUpdateStack`.)
  - **Assistive tech was not affected**, checked in Chromium before the fix: the
    cards behind are `aria-hidden` and `inert`, so the accessibility tree held
    only the front card, Tab never entered a card behind, and find-in-page did
    not match their text. The order mattered to anything reading the DOM.
  - **Nothing visible changes.** z-index decides what paints on top and the
    cards behind are absolutely positioned; a screenshot of the stack before and
    after is byte-identical.
  - **Nothing to do**, unless you selected the front card by its position among
    the cards (e.g. `:last-child`). Select it with
    `[data-react-fancy-toast-stack-card="front"]`, which was always the way.

## [5.51.1] - 2026-10-20

### Fixed

- **`Toast.Stack`'s "+N" badge is readable in dark mode whatever is behind it**
  (fancy-app-update#1). It was the soft zinc `Badge`, whose dark background is
  `dark:bg-zinc-900/30` -- 30% opaque -- and it sits over the cards peeking out
  behind the front one, so over a light image header its zinc-300 text was on a
  light screenshot. It now paints an opaque `dark:bg-zinc-800` with
  `dark:text-zinc-100`, plus a `ring-1` (`ring-zinc-200` / `dark:ring-zinc-700`)
  and `shadow-sm` so it stands off a card edge. Light mode keeps `bg-zinc-100`
  / `text-zinc-700`. Every `Toast.Stack` gets this, `AppUpdateStack` included.
  **Nothing to do.** `Badge` itself is unchanged: every other soft badge keeps
  its look.

## [5.51.0] - 2026-10-20

### Added

- **`Chart.Sparkline` takes `min`**: the value the bottom edge stands for.
  `min={0}` scales from zero, the way `Chart.Line` and `Chart.Bar` always do, so
  a window where every point had activity no longer draws its quietest point on
  the floor (and a flat busy series draws along the top, not the bottom). A value
  below `min` extends the scale instead of being drawn outside the box.
  **Nothing to do:** without `min` the scale still starts at the data's minimum.
- **`MagicWand` takes `target`**, so it can act on a textarea, input or editor
  the HOST renders. Pass a ref to a textarea / input as is, or for anything else
  (a code editor, a contenteditable) an adapter:
  `{ element, getSelection: () => ({ start, end }) | null, getSelectionRect? }`.
  With `target`, MagicWand renders no textarea of its own, only the wand
  (portalled, viewport-positioned). The write still goes through
  `onValueChange`, and `value` must be the target's current value.
  **Nothing to do** without `target`: the built-in textarea is unchanged.
- `MagicWandTarget`, `MagicWandTargetAdapter`, `MagicWandRect` type exports.
- Stable handles on the wand: `data-react-fancy-magic-wand` on the toolbar and
  `data-react-fancy-magic-wand-action="<id>"` on each action.

### Changed

- **Paste pills preview in a `Popover`, not a `Tooltip`** (`Composer`,
  `PromptInput` and `Input` with inline paste). It opens on hover AND on focus,
  so a keyboard user gets the same preview; the image pill is now focusable
  (`tabIndex=0`) for that. An image pill shows its thumbnail; if the image cannot
  load (typically a CSP without `blob:` in `img-src`) it shows its label instead
  of an empty box, and the `<img>` now carries the label as `alt`.
  **If you relied on the tooltip:** the preview now sits in
  `[data-react-fancy-popover]`, not `[data-react-fancy-tooltip]`, and has no
  `role="tooltip"`; update any selector or test that looked for those. It looks
  like a Popover (light panel, border) rather than the dark tooltip bubble;
  `classNames.preview` still merges onto it, so restyle there. It stays open
  while the pointer is over it and closes ~300ms after leaving, and Escape closes
  it. `data-react-fancy-composer-paste-pill-preview` and `renderPastePreview` are
  unchanged: that is already the slot for supplying your own preview content.

### Fixed

- **A closed `Drawer` unmounts even when no exit animation runs.** `useAnimation`
  unmounted ONLY on `animationend`, so in an app that does not load Fancy's
  stylesheet (and in jsdom) a closed panel stayed in the DOM forever. It now
  measures the exit (`getAnimations()`, else the computed animation / transition
  duration): nothing running unmounts at once, something running unmounts on its
  own `animationend` or after its measured duration, whichever comes first. A
  child's `animationend` bubbling up no longer ends the exit early. The same hook
  drives **`Modal`, `Command`, `ContextMenu`, `Dropdown` and `MobileMenu`'s
  flyout**, which had the same defect and get the same fix. **Nothing to do**; if
  you worked around it (forcing a remount, a `key`, your own timeout), you can
  remove the workaround.

## [5.50.0] - 2026-10-19

### Added

- **`sanitizeHtml(html, options)` has an allowlist mode** (#35). Pass
  `{ allowedTags, allowedAttributes, allowedSchemes, allowRelative }` and only
  what is listed survives: unlisted tags are unwrapped (text kept), unlisted
  attributes and URL schemes are removed, and comments go. `allowedAttributes`
  is one list or a per-tag map with `"*"` for every tag, and `"data-*"`-style
  prefixes. `allowedSchemes` defaults to `http:`, `https:`, `mailto:`;
  `allowRelative` (default `false`) keeps same-site relative URLs and fragments
  but never `//host`.
  **An allowlist can only narrow.** Event handlers, `srcdoc`, `srcset`,
  `javascript:` / `vbscript:` URLs and script-capable or foreign-content tags
  (`script`, `style`, `iframe`, `object`, `embed`, `form`, `template`, `svg`,
  `math`, ...) are removed even when listed. Without a DOM (SSR) allowlist mode
  returns the input as escaped text rather than passing it through.
- **`renderMarkdown(markdown, sanitize?)`**: the markdown `ContentRenderer`
  renders, as a sanitised HTML string (blocklist by default, the allowlist when
  given options), so a host no longer imports the markdown parser behind our
  back. `ContentRenderer` now uses the same function, so the two cannot drift.
- `SanitizeHtmlOptions` type export.

**Nothing to do:** `sanitizeHtml(html)` with no options is unchanged, byte for
byte.

## [5.49.1] - 2026-10-19

### Fixed

- **A `FauxClient` with both `fill` and a logical `width` scrolls its content.**
  Scaled mode pinned the body to the content's full scaled height, so a long
  document in a frame that fills its parent was clipped at the frame's edge
  instead of scrolling inside it. Found putting a real multi-page .docx in the
  new fancy-docs viewer. **Nothing to do.**

## [5.49.0] - 2026-10-19

### Added

- **`ImageViewer` and `PdfViewer` take `frame`**: the `FauxClient` frame every
  file viewer carries, with full screen and (for images) zoom, revealed on
  hover. Each zooms the way its content can:
  - **Image:** the frame's zoom bar drives the viewer's own pan/zoom about the
    centre, and replaces its boxed bar; wheel zoom shows in the frame's
    percentage.
  - **PDF:** full screen from the frame; zoom stays on the browser's PDF
    toolbar. A plugin fits the page to its box, so scaling the box only re-fits
    it, and `#zoom=` is relative to the page's real size, which a frame cannot
    know. The PDF sits in the browser variant with its title in the address
    bar, because the plugin swallows the pointer: controls over it could never
    be revealed by hover, and its top-right corner is the PDF toolbar's.
  `frameProps` reaches the frame. **Nothing to do:** `frame` defaults to
  `false`.

## [5.48.1] - 2026-10-19

### Security

- **Untrusted HTML can no longer retitle the host page.** `sanitizeHtml` (used
  by `ContentRenderer` and everything that renders user or file HTML through
  it) kept `<title>`, and a `<title>` anywhere in the document renames the
  browser tab, so any HTML a person opened could rename the app it was opened
  in. Found rendering a real HTML file in fancy-code's `FileViewer`. `<title>`
  is now stripped with `<script>`, `<style>`, `<meta>`, `<link>`, `<base>`,
  `<iframe>` and the rest, and the sanitiser has tests for all of them; it had
  none. **Nothing to do** beyond upgrading.

## [5.48.0] - 2026-10-19

### Added

- **Tab completes in `PromptInput`'s `/` and `@` menus**, as Enter does: the
  highlighted command or mention goes in. Only while a menu is open; with no
  menu, Tab moves focus as before. **Nothing to do.**

## [5.47.0] - 2026-10-19

### Added

- **`FauxClient` `applyZoom={false}`**: the frame shows the zoom controls and
  keeps the zoom state, but leaves the zooming to the content. A viewer that
  fits itself to its box (a slide viewer) only re-fits under a scaled frame, so
  it ended up the same size with its own buttons enlarged; it now reads the zoom
  and magnifies itself. **Nothing to do:** it defaults to `true`.

## [5.46.0] - 2026-10-19

### Added

- **`FauxClient` `fill`**: the frame takes its parent's height and gives the
  content whatever the chrome leaves, for content that sizes itself to its box
  (a slide viewer, a spreadsheet) rather than to what is in it. Without it, a
  viewer at `height: 100%` inside the frame collapsed to nothing.
  **Nothing to do:** it defaults to `false`.

## [5.45.1] - 2026-10-19

### Changed

- **`FauxClient`'s controls stay out of sight until wanted.** They are hidden,
  and fade in when the pointer is over the frame or focus is inside it; on a
  touch screen, which has no hover, they are always shown. In a browser frame
  they sit inline in the address bar as ghost icons; on a device or bare frame
  they are a slim pill in the top-right corner, leaving the bottom corners to
  the content (a slide viewer's page count lives there). 5.45.0 drew them as a
  bordered box over the content's bottom-right corner, permanently.
  **Nothing to do:** same props, same `data-*` handles.

## [5.45.0] - 2026-10-19

### Added

- **`FauxClient` zoom and full screen**, for content that has to be read rather
  than glanced at, such as a slide or a sheet shrunk to fit a panel.
  `<FauxClient variant="device" controls>` adds a zoom bar (−, percentage, +;
  the same bar `ImageViewer` has) and a full-screen button in the frame's
  corner. Zooming keeps the frame its size and scrolls the content inside it.
  The zoom is controllable (`zoom` / `defaultZoom` / `onZoomChange`, bounded by
  `minZoom` / `maxZoom`) so an agent can read and set it. Full screen follows
  the browser's own state: Esc leaves the button telling the truth, and
  `onFullscreenChange` and `data-fullscreen` report it.
  **Nothing to do** unless you want them: `controls` defaults to `false`, and a
  frame without it renders as before.

## [5.44.0] - 2026-10-19

### Added

- **`Input` holds a long paste as a pill**, as `Composer` and `PromptInput` do:
  `<Input name="q" pasteThreshold={500} />`. The pill sits in the field (one
  line, so no line of its own); clicking it puts the full text back. A hidden
  `<input name={name}>` posts the value with every pill expanded, so a plain
  `<form>` submit sends the whole paste. Enter still submits the form.
  **Omit `pasteThreshold` and `pasteImages` and nothing changes**: it is the same
  `<input>` as before. With either set, `ref` points at the hidden input,
  `onValueChange` receives the value with a marker per pill, and `onChange` is
  not called.
- **Pasted files reach the form.** `pasteImages` on `Input` holds a pasted image
  as a pill AND puts the file in a hidden `<input type="file" multiple>` in the
  same form (`{name}_files[]` by default, or `pasteFilesName`), kept in step with
  the pills: delete one and its file leaves the input. `Composer` and
  `PromptInput` take `pasteFilesName` for the same hidden input.
- **`PastePills`** (`@particle-academy/react-fancy/paste-pills`): the paste-pill
  core in one place: `usePastePills`, `useInlinePaste`, `InlinePasteEditor`,
  `PastedFilesInput` and the marker helpers. `Composer`, `PromptInput` and
  `Input` all import it, so `npx fancy-cli add` copies it once, as a dependency,
  instead of a copy per component.

### Changed

- The paste-pill files moved from `components/Composer/` and
  `hooks/use-paste-pills.ts` into `components/PastePills/`. **What to do:**
  nothing. Every public export is unchanged, and `hooks/use-paste-pills` still
  re-exports the hook.

## [5.43.0] - 2026-10-17

### Fixed

- **A click in a big `TreeNav` no longer re-renders the whole tree.** Selection,
  expansion and drag state lived in one context that every row read, so one click
  re-rendered every row. Measured in a real browser on Genie 2's file browser
  shape (5,000 nodes, 6 levels, all expanded): **175–267 ms per click before,
  17–20 ms after**, with no change to your code. Rows now subscribe to their own
  slice (am I selected / expanded / the drop target?), handlers are stable, and
  expansion is a Set lookup instead of an array scan per row.

  `useTreeNav()` is unchanged and still live: a component that reads it gets
  current `selectedId` / `expandedIds` exactly as before.

### Added

- **`<TreeNav virtualize height={600}>` renders only the rows in view.** The
  visible rows (expanded folders only) are flattened and windowed by
  `VirtualList`; selection, expansion, context menus and drag-and-drop behave as
  in the nested tree. Same tree, all expanded: **33 rows in the DOM instead of
  5,000, and 30 ms to mount instead of 614 ms.** `rowHeight` seeds the row
  estimate (default 26). The nested DOM wrapper
  `data-react-fancy-tree-node-children` does not exist in this mode — rows are
  flat, indented by `paddingLeft`.

- **`TreeNav` has tests.** It had none, which is why a refactor this size starts
  with them: selection, toggling, lazy mounting, `useTreeNav`, virtual rows and
  drag-and-drop in both modes.

**What you must DO: nothing.** `virtualize` is off by default and the nested tree
renders the same DOM as before. Collapsed folders were already cheap — their
children are not mounted until expanded — and still are.

## [5.42.1] - 2026-10-17

### Fixed

- **A filled `Button`'s icon and badge now take the label's colour** (react-fancy#34,
  from the MOIC estate). They were hard-coded `text-white`, so on
  `color="brand"` with a host's per-mode pair (pale blue `#BFD7EA` with navy
  `#003057` contrast) the label turned navy and the icon stayed WHITE on pale
  blue — nearly invisible. The same bug hit **every host** on `amber`, `yellow`
  and `lime`, whose labels are dark: white icons on yellow. The icon is now
  `text-current` and the badge `bg-current/20 text-current`, following the
  colour's own text class. White-label colours (`blue`, `red`, …) look exactly
  as before.
- **A `badge` or `avatar` no longer renders twice.** With `badgeTrailing` /
  `avatarTrailing` unset, the check `badgeTrailing ?? trailing` was true in BOTH
  the leading and trailing passes, so every badge appeared before and after the
  label. They now render once, leading unless the `…Trailing` prop says
  otherwise, as the docs and `alertIconTrailing` already had it.

### Added

- `data-action-icon` (`leading` / `trailing`) on a Button's icon wrapper, beside
  the existing `data-action-badge` / `data-action-avatar` handles.

**What you must DO: nothing.** If you had added a `className` to force a dark
icon onto a light-filled button, you can remove it; if you had hidden one of
the two duplicate badges with CSS, remove that too.

## [5.42.0] - 2026-10-17

### Fixed

- **Enter in `Command.Input` now picks an item**: the active one, or the first
  visible one when none is active. Before, typing a query and pressing Enter did
  nothing — `Command` handled no Enter, and only a *focused* item took it, as a
  native click. Found by Genie 2's real-window test.

### Changed

- **`Command` is a proper combobox: focus stays in the input.** ArrowUp/Down move
  the *active* item (marked `aria-selected="true"` and `data-active`, scrolled into
  view, highlighted) and the input announces it through `aria-activedescendant`;
  the input is `role="combobox"` with `aria-controls` pointing at the list. Typing
  resets the active item, so Enter picks the new first match. Hovering an item
  makes it active.

  **Visible change:** the arrows used to move keyboard focus onto the item buttons,
  and items were in the Tab order; now focus stays in the input and items are
  `tabIndex={-1}`. **What you must DO: nothing**, unless you styled
  `:focus` on `Command.Item` to show the highlighted row — style `[data-active]`
  (or `aria-selected="true"`) instead.

## [5.41.1] - 2026-10-17

### Fixed

- **`Toast.Item` is now exported.** The docs describe it for rendering your own
  viewport, and its props type `ToastItemProps` was exported, but the part was
  not: following the docs gave `undefined` and a render crash. **Nothing to do**
  unless you had worked around it, in which case `Toast.Item` now just works.

## [5.41.0] - 2026-10-17

### Added

- **`Toast.Stack` — a controlled stack of actionable toasts** (react-fancy#33),
  for requests a person walks through rather than races: an agent asking to add a
  database, a site, a process.

  ```tsx
  <Toast.Stack
    items={approvals}
    renderItem={(r) => <Approval request={r} onAllow={…} onDeny={…} onLater={…} />}
    depth={2} offset={8} scaleStep={0.05}
    frontIndex={front} onFrontIndexChange={setFront}
  />
  ```

  - **A view of YOUR list, so it never drops anything.** No timer, no limit; an
    item leaves only when you remove it. (The imperative provider's `maxToasts`
    silently drops the oldest — the reason this is a separate component.)
  - `depth` cards peek out behind the front one, each `offset` px higher and
    `scaleStep` smaller; they are `inert` and `aria-hidden`, so only the front
    card is interactive. Anything beyond `depth` shows as `+N`.
  - **The wheel walks the stack**, one card per notch, adding up small trackpad
    deltas, wrapping at both ends — and keeps the page from scrolling underneath.
  - **Arrow keys** move the front when the stack has focus (it is focusable, with a
    visible ring); a text field inside a card keeps its own arrows.
  - `renderItem` renders anything, so a card can carry as many actions as it
    needs. When the front item is removed, the next comes forward; an index left
    out of range by a shrinking list is clamped.
  - `position`: a screen corner (default `bottom-right`) or `"inline"`.
    `cardClassName` restyles the card shell. A polite live region says
    "2 of 5" as the front changes.

  Handles: `data-react-fancy-toast-stack`, `-stack-card` (`front` / `behind`),
  `-stack-more`, `-stack-status`, `-stack-position`.

**What you must DO: nothing.** `Toast.Provider` and `useToast` are unchanged.

## [5.40.0] - 2026-10-17

### Added

- **`<Command shouldFilter={false}>` turns off the built-in filter.** Every
  `Command.Item` renders and the caller decides which to render; the input,
  active index and keyboard handling are unchanged. Same name as cmdk's.

  A palette with its own matching could not use `Command`: Genie 2's Command
  Window reads `w> tynn` as "workspaces matching tynn", and every item hid itself
  because no item's text contains `w> tynn`.

- **`query` / `onQueryChange` make the search text controllable.** Filtering for
  yourself needs the query, and it was internal-only state — which the component
  contract does not allow for anything an agent might read or write.

**What you must DO: nothing.** `shouldFilter` defaults to `true`, and an
uncontrolled `Command` keeps its own query exactly as before.

## [5.39.0] - 2026-10-15

### Added

- **`PromptInput` gets inline paste pills** — the same ones `Composer` gained in
  5.38.0, built on the same code (react-fancy#32, asked for by Genie 2, whose chat
  composer this is).

  ```tsx
  <PromptInput budgetTokens={200_000} pasteThreshold={500} pasteImages previewChars={30}
    onSubmit={(text, attachments) => send(text, attachments)} />
  ```

  - A paste of `pasteThreshold`+ characters becomes `Pasted text · N characters`
    **where it was pasted**, on a line of its own. Clicking it puts the full text
    back right there; hovering shows the first and last `previewChars`.
  - **`pasteImages`**: a pasted image becomes an inline `Pasted image N` pill AND
    arrives in `onSubmit`'s attachments with its File, in message order. The text
    marks where it sat as `[Pasted image N]`.
  - `onSubmit` receives every text pill expanded where it sits — never a marker —
    and **a message that is only a paste can be sent**.
  - **The send contract is unchanged**: Ctrl/⌘+Enter sends, plain Enter is a
    newline, and the `/` and `@` pickers, drop-to-attach and the file picker all
    work in the inline editor exactly as in the textarea.
  - `renderPastePreview` and `pasteClassNames` restyle the pills and popover.

  Asked for as chips beside the input carried as `text/plain` attachments; built
  inline instead, to the owner's own spec given against screenshots of this
  composer. The text still reaches the model — positioned where the person put it.

- **A quieter `PromptInput` footer**, each part opt-in:
  - `attachButton="icon"` — paperclip only, with an accessible name and a tooltip.
  - `sendButton="icon"` — a compact send button whose tooltip carries the shortcut
    (`Send · Ctrl+Enter`), replacing the inline kbd hint.
  - `meter="near-limit"` — hidden until usage passes `meterShowAt` (0.75), muted
    until `meterWarnAt` (0.9), warning colour past it. `meter="hidden"` never
    shows it.
  - **`usedTokens`** — the caller's REAL usage (an agent's context, say). The
    meter shows it plus the draft's estimate; before, it could only estimate the
    draft as length ÷ `charsPerToken`, which is why a host had to fake the budget.

  Handles: `data-react-fancy-prompt-input-attach`, `-send`, `-meter` (with
  `data-level`: `ok` / `caution` / `warn` / `muted`).

### Changed

- `Composer` and `PromptInput` now share one implementation of inline paste
  pills (`useInlinePaste`), so the two cannot disagree about what a pill means.
  No behaviour change to `Composer`; all its tests pass untouched.
- `Composer`'s internal inline pill moved to its own file. No behaviour or API
  change; its props were being read as `Composer`'s by the showcase's docs
  coverage check.

**What you must DO: nothing.** Every option defaults to the old behaviour: no
`pasteThreshold` or `pasteImages` means the textarea you had, and the footer is
unchanged unless you ask.

## [5.38.0] - 2026-10-14

### Added

- **`Composer` can put paste pills IN the message, where the paste happened.**

  ```tsx
  <Composer pasteThreshold={500} pastePlacement="inline" pasteImages previewChars={30}
    onSubmit={(text, { images }) => send(text, images)} />
  ```

  ```
  This is what [Pasted image 1] I mean and this
  [Pasted text · 669 characters]
  ```

  - **A text pill gets a line to itself** — a newline above (unless it is already
    at the start of a line) and below (unless one already follows).
  - **Clicking a text pill removes it and puts the full text exactly where it
    sat**, not appended to the end.
  - **An image pill sits in the sentence** — `Pasted image 1`, numbered by
    arrival, and the number survives deleting an earlier one. Hovering shows a
    thumbnail. Opt-in with `pasteImages`; see below for why.
  - **Backspace deletes a pill like a character**, and the held paste goes with
    it: the message is the one record of what is attached.
  - **A send carries every pill where it sits.** Text pills are expanded in place;
    each image's place is marked `[Pasted image N]` in the text and the images
    arrive as `onSubmit`'s new second argument, in message order.

  With `pastePlacement="inline"`, `value` carries a marker per pill
  (`pasteMarker(id)`, exported), so a host or agent can attach a paste by writing
  the marker and the held paste. `onSubmit` never sees a marker. A marker naming
  nothing held stays text, so pasted content cannot invent an attachment.

  This is the MOIC estate's own design — the pill as a marker inside the message —
  which is why they never adopted the beside-the-input layout. Asked for by the
  owner against screenshots of exactly that layout.

  **`pasteImages` is off by default** because turning it on is a promise to read
  `onSubmit`'s second argument: a pill reads as "attached", and an image a host
  never sends is one the person believes went and did not. A clipboard with text
  AND an image pastes the text — copying from a document often adds a picture of
  the selection, and holding it would turn a pasted sentence into a screenshot of
  it.

- **The pills and their hover popover are restyleable.** `classNames` —
  `pill`, `textPill`, `imagePill`, `preview`, `remove`, `input` — merged onto the
  defaults, so a restyle can be one class or a whole new look.
  `renderPastePreview` replaces what the popover shows. Both placements.

- **`previewChars`** — characters of a held paste shown at each end of the hover
  preview. Default stays 20.

- **`heldImages` / `onHeldImagesChange`** — controllable, per the component
  contract, like `heldPastes`.

- **`usePastePills().hold(text)`** — hold a paste unconditionally and get its id
  back, for a host that places the pill itself. `Composer`'s inline placement is
  its caller.

### Fixed

- **`usePastePills` could mint an id a controlled list already held.** Its counter
  started at 1 whatever the list contained, so a host that seeded `paste-1` got a
  second `paste-1` on the next paste — two pills on one id, and expanding either
  took both. It now skips taken ids.

- **`Tooltip`'s arrow kept its own dark colour when the bubble was restyled**, so
  `className="bg-white"` gave a dark arrow pointing out of a white bubble. The
  arrow now inherits the bubble's background.

**What you must DO: nothing.** `pastePlacement` defaults to `"above"`, which is
5.31.0's behaviour unchanged; `pasteImages` is off; `previewChars` defaults to the
old 20; and `onSubmit`'s second argument is ignorable, so a one-argument handler
still type-checks.

## [5.37.0] - 2026-10-11

### Changed

- **`<QrCode>` is documented as what it always was: a byte container, not a
  link component.** Owner's ruling — a consumer's request says what to build,
  never the final pattern, and every package here has to suit any project
  rather than the one that asked.

  **Nothing to do. No API changed and no behaviour changed** — `value` has
  always accepted any string and the encoder has always picked numeric,
  alphanumeric or byte mode for it. What changed is everything that *taught*
  the component: 5.36.x led with a device-pairing URL in the JSDoc, the docs,
  the showcase tile and the interactive demo, because that is what the
  requesting consumer needed. A general implementation framed narrowly is a
  narrow component in practice — nobody reaches for a "pairing code" component
  to print an asset label.

  The examples now lead with payloads that have no network in them at all,
  because those are the cases where the format earns its place: an asset or
  serial number, a bare numeric reference, a WiFi credential block
  (`WIFI:T:WPA;S:…;P:…;;`), a MeCard contact, a `tel:` or `geo:` URI. A URL is
  one payload among them.

  Two things the docs now say that are worth knowing even if you never read
  them:

  - **Uppercase matters.** Alphanumeric mode covers `0-9 A-Z` and `$%*+-./: `
    only, so lower-casing an identifier pushes it into byte mode and makes the
    symbol bigger for the same information. If you control the format of a code
    you are printing, uppercase it.
  - **Capacity at the largest symbol** (version 40, level `L`) is 7,089 digits,
    4,296 alphanumeric characters, or 2,953 bytes.

  `label` guidance changed with it: describe what the code is *for* ("Asset tag
  for pump 14"), not its destination — "destination" was itself the link
  framing.

## [5.36.2] - 2026-10-11

### Security

- **The `<QrCode>` example value was changed to an RFC 2606 reserved host.**
  5.36.0 and 5.36.1 shipped a JSDoc `@example` — and therefore a string inside
  `dist/qr-code.d.ts` — using a host of the form
  `<name>.<tailnet>.ts.net:<port>/pair#<pin>`. That reads as a machine on a
  private Tailscale network, and it arrived as an illustrative value in a
  feature request rather than from anything in this repository.

  It is now `https://device.example.com/pair#482913`. `example.com` is reserved
  by RFC 2606 and can never resolve, so an example that is scanned or pasted
  reaches nothing.

  **Nothing to do** — no API changed, and the value only ever appeared in
  documentation and examples, never in code that runs.

  Why this is filed under Security rather than Docs: an example host in a
  published package is copied, rendered on public pages, and in this case
  **encoded into a scannable QR code**, which turns a documentation string into
  a pointer anyone can follow with a phone. An example value is part of a
  package's attack surface, and a reserved domain is the only kind that cannot
  become one.

## [5.36.1] - 2026-10-11

### Security

- **`encodeQr` spent linear time on a value it was always going to refuse.**
  `<QrCode>` renders a `value` the component did not author, and version
  selection walked versions 1–40 re-encoding the payload at each one — so a
  value too long to fit was encoded **forty times** before being rejected.
  Measured on the built bundle: **342 ms for 100 kB, 2.0 s for 500 kB**,
  linear, which is tens of seconds of blocked main thread for a few megabytes
  through `<QrCode value={userInput} />`.

  The refusal was always correct; the *cost* of the refusal was the defect. An
  impossible value is now rejected from `value.length` alone — a character
  count can never exceed a byte count, so a string longer than the largest
  capacity any mode offers cannot fit in any of them. **500 kB now refuses in
  0.0 ms**, and the legitimate path got faster too (the payload's bit length
  depends on the version only through the character-count indicator, which has
  three tiers, so it is computed at most three times rather than forty).

  **Nothing to do** — the API, the thrown `RangeError` and every value that
  previously encoded are unchanged, boundary cases included (2,953 bytes still
  encodes; 2,954 still throws).

  Worth stating why this was treated as a security fix rather than a
  performance note: this encoder reaches consumers **as vendored source** via
  `npx fancy-cli add qr-code`, not only as a package. Vendored source carries
  no manifest, so no advisory, Dependabot alert or audit row would ever have
  named it — the only time to fix it is before anyone copies it in.

## [5.36.0] - 2026-10-11

### Added

- **`<QrCode>` — a QR code as an SVG, with no dependencies.** ISO/IEC 18004,
  versions 1–40, error correction L/M/Q/H, and numeric / alphanumeric / byte
  modes selected automatically. **Nothing to do** — it is a new component and
  nothing else changed.

  ```tsx
  <QrCode value="https://host/pair#482913" size={192} label="Pair this device" />
  ```

  `label` is required. A QR code is unusable to anyone who cannot point a second
  device at the screen, so it needs an accessible name describing the
  *destination* — and the value should also appear as text or a link nearby,
  which an `aria-label` cannot substitute for.

  Also exported on the `./qr-code` subpath, and **the encoder is exported
  separately** (`encodeQr`, `selectMode`) for a consumer that needs the modules
  rather than an SVG — a canvas, a PDF, a thermal printer, a terminal. Without
  that, getting at them would mean adding a dependency for something already in
  the package.

  Three notes that decide whether a code actually scans, none of which are
  visible in a screenshot:

  - **The quiet zone is not padding.** It is how a scanner finds the symbol's
    edge, so it defaults to the standard's minimum of 4 modules. `quietZone={0}`
    is allowed and is not a space saving.
  - **`background` defaults to `"transparent"`**, which inherits whatever is
    behind it — so on a dark surface the symbol renders dark-on-dark and most
    scanners refuse it. Set `foreground` and `background` together there.
  - **`"H"` is not a free upgrade over `"M"`.** It survives more damage and
    holds a third less, so at the same pixel width the modules are smaller; on a
    phone screen it can read *worse*. Raise it for print or a covered symbol.

  Rendered as a single `<path>` on a module-unit `viewBox` rather than a `<rect>`
  per module: a version 10 symbol has over three thousand modules, and the
  module-unit viewBox is what lets `size` scale with no resampling — a raster
  code at a non-integer multiple of its module size has blurred module edges,
  and a scanner reading a blurred edge guesses.

  `encodeQr` throws a `RangeError` rather than truncating a value that will not
  fit, because a truncated symbol scans cleanly and yields the wrong string.
  Kanji mode and structured append are not supported; an untested branch in an
  encoder fails as a code a phone quietly refuses to read.

  Built for `claude · tynn`'s device-pairing panel (Genie 2 §6.8), which
  previously had only a typed URL.

## [5.35.1] - 2026-10-10

### Fixed

- **`ActivityLight direction="both"` drew as a tofu box in a container carrying
  only the Liberation fonts.** The mark was U+21C4 (`⇄`), which those fonts do not
  cover; it is now U+2194 (`↔`), which they do. **Nothing to do** — the prop, the
  data attributes and the accessible name are unchanged, and the mark is
  decorative (`aria-hidden`).

  **One of three states failing is the expensive shape**, which is why this was
  worth a release rather than a note. `in` and `out` drew arrows and `both` drew
  a box, so a reader saw two working indicators and one they had no reason to
  distrust — a font gap and a state are indistinguishable at that point, and a
  direction mark going missing is the kind of absence nobody notices.

  The choice is measured, not reasoned. `claude · tynn` rasterised each candidate
  in a Liberation-only container and compared it pixel-for-pixel against a
  Private Use Area codepoint no font covers: U+2190–2195 draw, U+21C4 and U+21C6
  do not. **U+21C6 was included as a falsifier** — had it drawn, the finding
  would have been "Liberation covers arrows" rather than "Liberation covers
  WGL4", and this set would be the wrong fix.

  Two glyph families in the kit are still outside that repertoire and are
  deliberately NOT changed: the Dingbats (`✓` `✕` in `Checkbox`, `✦` in
  `MagicWand`) have no in-repertoire substitute, so they are a genuine
  glyph-versus-SVG trade rather than a one-character fix, and paying it for an
  environment nobody ships a desktop app into is the wrong call today. A test
  pins the `ActivityLight` set so a prettier arrow cannot drift back in.

## [5.35.0] - 2026-10-10

### Fixed

- **`PromptInput` told every Windows and Linux user to press a key they do not
  have.** The keyboard hint was a hardcoded `⌘ + Enter to send`, and so was the
  default placeholder. **Nothing to do** — the hint now names the modifier the
  platform actually has, and the keys it accepts are unchanged (`⌘/Ctrl+Enter`
  submits everywhere, as it always did).

  It is worth more than one wrong glyph. A reader who cannot act on a hint
  learns to ignore hints, which costs the credibility of every hint beside it.
  In the lean Linux container where it was found, the glyph had no font behind
  it either and rendered as a tofu box.

  - New `platform?: "apple" | "generic"` prop. Omit it and the component reads
    the platform after mount; pass it when the host knows better than
    `navigator` — an Electron renderer forwarding `process.platform`, a remote
    session where the keyboard is not the one running the browser, or a test
    that needs the branch it is not sitting on.
  - The platform is resolved AFTER mount, never during render, so this does not
    introduce a hydration mismatch under SSR.
  - `generic` is the fallback, and not arbitrarily: submit accepts
    `metaKey || ctrlKey`, so `Ctrl` is a TRUE label on an Apple keyboard while
    `⌘` is a false one everywhere else. The honest default is the pressable one.
  - `detectPlatform(hints)` and `modifierKeyLabel(platform)` are exported for
    any surface with a keyboard hint of its own. **Both take the platform as an
    ARGUMENT** rather than reading a global, which is the only way a test can
    cover the platform the developer is not sitting at.

- **`PromptInput`'s attach control rendered as a tofu box in a lean container.**
  Its icon was a literal paperclip emoji, and an emoji needs a dedicated COLOUR
  EMOJI FONT — not merely a font with broad coverage — which a container image
  has no reason to carry. **Nothing to do**: it now draws `icon="paperclip"`
  from the kit's own icon layer, as the rest of the suite does. The attachment
  chips had the same emoji and are fixed with it.

  The `send` button's trailing `->` arrow became `iconTrailing="arrow-right"` in
  the same pass — same class of risk, same primitive already in the kit.

- **`PromptInput` dropped any `data-*` or `aria-*` handle put on it.** It named
  every prop it used and had no rest spread, so a consumer's handle vanished
  silently — the component contract's "agents never guess DOM" broken in the
  one component an agent is most likely to be asked to drive. This is issue #22
  recurring in a component that was not in that sweep. **Nothing to do**;
  `className` now merges rather than replacing the surface's own classes, and
  the root carries `data-react-fancy-prompt-input` whether or not a consumer
  adds a handle.

### Added

- `data-react-fancy-prompt-input`, `-drag` (`over` / `idle`) and `-hint`
  (`apple` / `generic`) on `PromptInput`, so a bridge reads the composer's drop
  and platform state off the DOM instead of inferring it from Tailwind colours.

### Notes

- **A suite cannot see a font, which is why this needed a consumer to find it.**
  Both glyph bugs passed every test here and would have passed forever: jsdom
  has no fonts, so an emoji asserted in a DOM string is indistinguishable from
  one a user can see. It took a screenshot of a real Electron window on Linux.
  The new guard therefore does not test rendering — it tests the SOURCE for the
  property that predicts the failure, that no component contains a character
  above the Basic Multilingual Plane (the emoji dataset excepted). That line is
  where "needs a font with good coverage" becomes "needs a second font dedicated
  to emoji". BMP symbols are deliberately not covered: smaller risk, one
  judgement call each, and a rule with false positives gets deleted.
- Measured while here, because the same report asked: **no Fancy package
  declares a `font-family` at all**, so none of our defaults can be hijacked by
  a generic family resolving to whatever a machine's fontconfig puts first. The
  showcase and the starter kit both lead their stack with a named face.
- **This release shipped without a `lab:run`** — same dead Anthropic key as
  5.34.0 (401 since before the previous release wave, `fancy-labs` #5). It went
  out on a green package suite (498 tests) plus sabotage verification instead.
- Each fix was verified by breaking it on purpose: hardcoding the glyph back
  fails 2 tests, defaulting an unknown platform to Apple fails 5, letting free
  text overturn an enumerated platform fails 1, putting an emoji into a
  different component fails the source guard, restoring the emoji icon fails 5,
  dropping the rest spread fails 1, and letting `className` replace instead of
  merge fails 1.

## [5.34.0] - 2026-10-09

### Added

- **`VirtualList` — a windowed list for ledgers of tens of thousands of rows**,
  with measured variable row heights, deep links by row id, and sticky-bottom
  tail-following. **Nothing to do**: it is a new component, and no existing
  export changed.

  Built for an agent event stream, where all three matter at once — message
  rows wrap while event rows do not, a link carries `?at=<rowId>` to the exact
  row under discussion, and new rows keep arriving while the human reads older
  ones. `fancy-term`'s scrollback, `CommitHistory` and long `Table` bodies want
  the same thing.

  Three decisions worth knowing before you reach for it:

  - **Heights are measured, not predicted.** `estimateRowHeight` only seeds rows
    that have never been on screen; a row's real height replaces it the moment
    it renders. There is deliberately no `rowHeight(item)` callback — that is a
    prediction about text wrapping, font loading and container width, and when
    it is wrong the error accumulates down the list until rows draw in the wrong
    place and `scrollToId` lands on a neighbour.
  - **`followTail` is controlled** (`followTail` + `onFollowChange`), so the
    follow state is readable and writable by an agent over a bridge, as the
    Human+ contract requires. The `↓ n new` pill is yours to render, from
    `onUnseenChange`.
  - **Tail-follow breaks on INTENT, not on scroll position.** Any upward wheel,
    drag, `PageUp` or `Home` stops following at once — even while still pinned to
    the bottom with `scrollTop` unchanged. Position cannot distinguish "the human
    scrolled up" from "content grew downward", so a position-only implementation
    follows through a wheel-up and yanks the reader back on the next append.

  `scrollToId` resolves asynchronously when the target is far down an unmeasured
  list, and `onScrollToIdResolved(id, landed)` reports when it has settled.
  `landed` is `false` when the id is not in `items` — a deep link to a pruned row
  must be distinguishable from a successful scroll to the top.

- **`ActivityLight` — an activity indicator for an EDGE**, a relationship
  between two parties, with a recency ramp (`live` / `recent` / `quiet` /
  `unseen`), an optional direction and an optional count. **Nothing to do.**

  It is not a presence dot and does not replace `Avatar status`: that belongs to
  one party and says whether *they* are online, while this belongs to a pair and
  says when *the link between them* last moved.

  **It distinguishes "none" from "cannot see", and that is the point.**
  `level: null` means the edge is real but undatable and renders **nothing** — no
  dot, no dash, no placeholder, because a grey dot asserts "quiet", which is a
  claim that cannot be made. `count: null` or omitted renders no number. But a
  measured **`count: 0` does render**, because "we looked and it was none" is a
  fact, and suppressing it would be indistinguishable from never having looked.
  A zero that should have been "unknown" tells a reader an agent works alone, and
  they believe it.

### Changed

- Both new components are reachable by subpath — `@particle-academy/react-fancy/virtual-list`
  and `/activity-light` — alongside the barrel, like every other component.

### Security

- `source-map-js` is pinned forward to `^1.2.2` via `overrides`. Versions up to
  1.2.1 allow an event-loop denial of service through indexed source-map section
  offsets, and it arrives here transitively through the build toolchain.
  **Nothing for a consumer to do, and no runtime change**: an npm package does
  not ship a lockfile, so this governs builds OF this repo, not anything
  installed FROM it. Recorded rather than left silent because the override it
  sits beside — `shell-quote` `^1.9.0`, added for an earlier advisory — was
  carried with no note of why, and had drifted back inside the vulnerable range
  before anyone looked.

### Notes

- **This release shipped without a `lab:run`.** The estate's rule is to run the
  lab before any release; the Anthropic key behind it has been returning 401
  since before the previous release wave (tracked as `fancy-labs` #5), so it has
  judged nothing. This went out on a green package suite (469 tests) plus
  sabotage verification of the new suites instead. Stated here because a reader
  should not have to find it out.
- The new suites were checked by breaking the implementation on purpose, since a
  new test that passes either way proves nothing. Removing height measurement
  fails 4 of the `VirtualList` tests; making tail-follow watch position instead
  of intent fails 2; gating the count on `count` rather than "is it counted" —
  the classic falsy-zero bug — fails both `ActivityLight` zero cases.

## [5.33.0] - 2026-10-04

### Fixed

- **`FileUpload` with `multiple={false}` could never change its file.** Choosing
  a second file kept the first and discarded the new one in silence, so a
  single-file field was write-once; the only way out was removing the file or
  remounting the component. Reported by the YouGene estate, who were working
  around it with a `key` remount.

  **What changed, precisely:** `multiple={false}` now REPLACES. `maxFiles` is
  unchanged and still refuses the overflow. The two used to share one rule — a
  cap of one, first-wins — on the reasoning that they must not disagree about
  what a single-file upload means. They are different statements and are now
  allowed to differ: `maxFiles={n}` is a quota (drop five files into a
  three-file field and you keep three, not the last three), while
  `multiple={false}` is a field shape whose analogue is a radio group, where
  choosing again moves the selection.

  **Dropping several files at once onto a single-file field still keeps the
  FIRST**, exactly as before. Only the across-gestures case changed. If you
  depended on the old write-once behaviour — which we do not think anyone could
  have wanted — pass `maxFiles={1}` instead of `multiple={false}`.

- **`FileUpload` ignored the same file being chosen twice.** The hidden
  `<input type="file">` was never reset, and an input still holding a path fires
  no `change` event when the user picks that same path again. So "remove it,
  then choose it again" and "retry the import that just failed" were dead
  gestures — the component was never asked, so it never rejected anything. The
  input is now cleared after each change.


## [5.32.0] - 2026-10-02

### Added

- **`usePastePills` — the paste-holding logic without a surface.**

  ```ts
  const pills = usePastePills({ threshold: 500, heldPastes, onHeldPastesChange });

  function onPaste(e) {
    if (pills.handlePaste(e)) return;   // it took the paste and called preventDefault
    // ...your own handling
  }
  ```

  Returns `heldPastes`, `handlePaste(event) => boolean`, `expand(id) => string | undefined`
  (removes it and hands back the text for you to insert), `remove(id)` and `clear()`.

  **It owns no DOM** — you render the pills. And `handlePaste` is **composable**: it
  returns `true` only if it took the paste, having called `preventDefault()` itself,
  and otherwise declines *without touching the event*, so a host whose own handler
  already intercepts paste can ask "did you want this?" rather than hand over.

  `HeldPaste` carries `id` and `text` and deliberately **no `length`** — it would be
  `text.length` and nothing else, and a derived value stored beside its source is a
  value that can disagree with it.

  Exists because the estate that specified 5.31.0's `Composer` feature then
  established that they cannot use `Composer` at all: their chat input is a
  contenteditable rendering inline `[deal:42|Acme]` badges, which a textarea cannot
  do. **`Composer` is now this hook's first caller** — one implementation rather than
  two, because two copies of a rule drift and the copy nobody reads is the one that
  rots.

  **What you must DO: nothing.** `Composer`'s behaviour is unchanged and its tests
  are the proof — all 15 from 5.31.0 pass untouched across the refactor.

### Fixed

- **`useControllableState` silently lost an update when two functional updates
  batched.** It resolved `setValue(fn)` against the **render closure's** value and
  handed React a pre-computed result, so two calls before a re-render both computed
  from the same stale value and **the first was dropped**:

  ```
  setItems(c => [...c, "a"]);
  setItems(c => [...c, "b"]);   // -> ["b"], not ["a", "b"]
  ```

  Most stateful components in this library use this hook, so the blast radius was
  everything — but it only surfaces when a caller updates twice in one batch, which
  is why it survived. No error, no warning: just less state than you asked for.

  Found by a `usePastePills` test that held two pastes inside one `act()` and got
  one. Four of the five new regression tests fail against the previous
  implementation.

  **What you must DO: nothing**, and one thing you may notice: **the setter is now
  stable across renders.** It used to change identity on every update, which
  invalidated any consumer `useCallback`/`useEffect` depending on it. If you were
  relying on that churn to re-run an effect, you were relying on a bug.

## [5.31.0] - 2026-10-02

### Added

- **`Composer` can hold a large paste beside the input as a pill instead of
  inserting it.** Set `pasteThreshold={500}` (characters) to enable.

  Paste a transcript into a composer and it becomes a scrolling wall: the message
  you were half way through writing is above the fold, and the only way to see what
  you are about to send is to scroll your own input.

  - over the threshold, the paste is held and shown as `Pasted text · 2,036 characters`
  - **hover** previews the first and last 20 characters, middle elided — the middle
    is what made it unreadable, the ends are what tell you which paste this is when
    there are several
  - **click** inserts it, appended to what is already typed (people type the
    question *before* pasting the thing it is about), and removes the pill
  - **×** discards one without inserting it
  - **a send with pills still closed CARRIES the text**, in arrival order, after
    what was typed

  That last point is the one worth knowing about. A pill reads as *"your paste is
  attached"*, so a send that dropped it would mean asking a question about a
  document without the document — with nobody able to tell, because the sender
  believes it went and the receiver sees a question about nothing. `onSubmit`
  receives everything; the pills clear.

  Handles: `data-react-fancy-composer-paste-pill`, `-paste-pill-preview`,
  `-paste-pill-remove`, `-paste-pills`.

  The pill carries an `aria-label` with the count and an `aria-describedby`
  pointing at its preview, and the discard control is labelled — a bare `×` is
  otherwise announced as "times", which is not an action. The pill deliberately has
  no `title`: a native tooltip plus the hover preview renders two tooltips on one
  hover, at different delays.

  Held pastes are controllable — `heldPastes` + `onHeldPastesChange` — per the
  component contract, which forbids internal-only state for anything an agent might
  need to read or write. Omit them and the component keeps its own.

  **What you must DO: nothing.** `pasteThreshold` is **opt-in and has no default**,
  so paste behaves exactly as it always has unless you ask for this. That is
  deliberate rather than cautious: paste is a fundamental interaction and this
  package is past 1.0, so a minor release must not quietly change what it does for
  every consumer. Below the threshold nothing happens at all — no prevented event,
  no pill, no ceremony for an address.

  Specified by the MOIC estate, who had already built and proven it against their
  own hand-rolled composer and sent the spec rather than a patch because they are
  not on this component. The dangerous-state analysis above is theirs.

### Fixed

- **`CHANGELOG.md` is now in the published tarball.** `files` did not whitelist it, so npm never shipped it: a consumer who followed a link to the changelog — from the README, from npm, or from an upgrade guide — found nothing. Nothing for you to do; the file simply arrives from this release on.

## [5.30.0] - 2026-09-30

**Nothing here will stop your build.** Every prop below is new and optional,
and every default was chosen so a `Card` written before this release renders
byte-identically — `size` defaults to `md`, `sections` to `divided`,
`highlight` to `false`. No API changed, nothing was renamed, nothing was
removed. If you do not pass a new prop, there is nothing to do.

`Card` was measured against Flux UI's card and this closes the feature gap.

### Added

- **`Card.Header` and `Card.Footer` compose from props.** `heading`,
  `headingLevel`, `description` and `actions` lay a header out without a
  wrapper from the caller. This suite's own showcase had two pages writing
  `<div style={{ display: "flex", justifyContent: "space-between" }}>` INSIDE a
  `Card.Header` — inline styles, in the app whose job is to demonstrate the
  kit, across 136 headers, because nothing in the kit laid one out.

  `children` still works and **wins**: pass it and the three props are ignored
  rather than rendered alongside, so a caller who sets both gets one title
  instead of two.

- **`sections="divided" | "plain" | "banded"`** and **`dividerInset`** — how
  header and footer are set apart: a hairline rule (today's behaviour and the
  default), nothing at all, or a tinted band. `dividerInset` keeps the rules but
  stops them at the content's edge.

  `divided` is the default because it is what Card has always rendered.
  Seamless is arguably the nicer default — Flux chose it — but defaulting to it
  here would have silently restyled every card in every consumer.

- **`size="xs" | "sm" | "md" | "lg"`** — scales padding and corner radius
  together, and is inherited by `Card.Media` and `Card.Bleed`. `padding` stays
  authoritative when you pass it, including `padding="none"`.

- **`variant` gained `muted` and `soft`** — tint steps between `outlined` (no
  tint) and `flat`. `flat` is NOT renamed to Flux's `filled`: the name is public
  API and a rename buys nothing.

- **`highlight`** — a 1px hairline just inside the top edge, white at 70% in
  light mode and white at 10% in dark. Default `false`, deliberately unlike
  Flux's `true`; turning a decorative hairline on by default would have changed
  the look of every existing card.

- **`Card.Bleed`** — runs content out to the card's edges (an image, a table, a
  chart strip), with `edges="x" | "top" | "bottom" | "all"`.

- **`Card.Header` and `Card.Footer` work standalone**, outside a `Card`, as a
  section heading above one. They take their own `size` there, since there is
  no card to inherit one from.

- **`CardMediaProps`, `CardBleedProps`, `CardSectionProps`, `CardSize`,
  `CardPadding`, `CardSections` and `CardBleedEdges` are exported** from the
  package root. `CardMediaProps` had never been, so `Card.Media`'s props could
  not be typed by a consumer wrapping it.

- **`tests/card-tailwind.test.tsx`** renders every Card permutation, harvests
  the class names it produced, and compiles them through the real Tailwind. A
  class that is in the DOM and in no stylesheet now fails the build. See
  *Fixed*, below, for why that check had to exist.

### Changed

- **`Card.Media`'s top radius follows the card's `size`** instead of hardcoding
  `rounded-t-lg`. A `size="lg"` card previously put a `rounded-xl` frame around
  a `rounded-t-lg` image and showed a sliver of card through each top corner.
  Unchanged at `md`, which is the class it used to hardcode and the default.

- **A standalone `Card.Header` / `Card.Footer` no longer draws a rule.** It
  previously kept the `border-bottom` belonging to a card it was not inside.
  This is the one visible change to existing markup, and only for a section
  rendered outside a `Card` — which was a broken-looking state, not a style
  anyone chose.

### Fixed

These were all found reviewing the additions above before release, so no
released version carries them. They are recorded because each is a shape worth
recognising.

- **An inset divider and a `Card.Bleed` were measured from `size`, not from the
  padding actually applied.** The two agree until someone passes `padding`, and
  then they disagree by a whole step: `<Card size="md" padding="lg">` drew a
  rule inset 1rem over content inset 1.5rem, and `<Card padding="none">` gave a
  bleed a `-1rem` margin that carried it a centimetre PAST the card's edge and
  hung the content outside the border. Both now read the resolved padding step
  from context.

- **A `Card.Bleed` inside a *standalone* header did nothing.** The section
  published "am I inside a card" where the bleed needed "how much padding is
  above me" — and a standalone header pads itself, so the answer was `false`
  when the padding was real.

- **`highlight` was a no-op in dark mode.** It carried
  `dark:before:bg-transparent`, so the prop did nothing at all in the mode that
  needs it most — a dark surface has no border contrast of its own, which is
  why Flux turns its equivalent on by default.

### Not copied from Flux, on purpose

- **The `--flux-bleed-*` CSS-variable protocol.** Flux's padding sits on the
  CARD, so a descendant has no way to know how far it must reach, and it needs
  published custom properties to tell it — a public CSS API to version forever.
  Ours sits on the card's direct CHILDREN, so the distance is always exactly one
  padding step and `Card.Bleed` can look it up. Arithmetic instead of a contract.

- **`body="inset"` / `body="flush"`.** A nested `<Card variant="soft">` already
  composes an inset body, and `Card.Bleed` already composes a flush one. A prop
  for it would be a second way to say the same thing.

- **A `Card.Heading` / `Card.Subheading` pair.** `Heading` already ships an
  11-step size ramp. Forking a card-local copy would give two answers to "how
  big is a heading", and they would drift.


## [5.29.1] - 2026-09-29

### Fixed

- **Documented how to theme `color="brand"` per mode, in the file a consumer
  actually receives.** 5.29.0 explained the three brand variables in a comment
  in `src/styles.css` — and the build emits `@theme` without comments, so none
  of it reached anyone who installed the package. The guidance now lives in
  `README.md`, which ships.

  The part worth having: **`--color-brand` and `--color-brand-contrast` are a
  pair and must turn over together.** Repointing one for dark mode is the
  obvious move and it fails QUIETLY — the surface goes pale while the label
  stays white on top of it, and on `ghost` / `outline`, where brand is the
  label rather than the surface, a brand that stayed dark puts dark text on a
  near-black background. Nothing errors; it is simply unreadable.

  ```css
  .dark {
    --color-brand: #BFD7EA;
    --color-brand-contrast: #003057;
  }
  ```

  `--color-brand-hover` usually needs no per-mode value.

  Reported by the consumer who drove #30, from five ghost buttons that made it
  real rather than theoretical. No code changed.

## [5.29.0] - 2026-09-29

### Added

- **`color="brand"` on every component that takes a colour** — `Button`,
  `Badge`, `Callout`, `Progress`, `Switch` and `Timeline.Item`. Requested in
  #30 by a consumer with 164 call sites reading `color="violet"` to mean "our
  primary action"; their brand is navy, so every one of those was indigo-ish,
  and `ButtonColor` was a closed union of the 22 Tailwind hue names with no
  escape hatch.

  `brand` is not a hue. It resolves through **three** CSS variables a host sets
  once:

  ```css
  :root {
    --color-brand: #003057;
    --color-brand-contrast: #ffffff;  /* text/icons ON the brand colour */
    --color-brand-hover: #D4A017;     /* need NOT be a shade of brand */
  }
  ```

  **Three rather than one, and that is the whole design.** A generated hover
  assumes "same hue, darker". A brand palette need not work that way — the
  reporter's hover is gold on a navy brand, which no amount of arithmetic
  recovers from navy. So the host states the hover instead of the kit guessing
  it. The tinted variants (`outline`, `ghost`, `soft`) derive from the same
  three via opacity modifiers, which is what lets three variables cover four
  variants without asking anyone for a whole 50–950 scale.

  Defaults keep the kit's violet, so a host that sets nothing sees no change.

  `--color-brand` had existed in `styles.css` since before this release with
  nothing in the kit reading it. That was not quite a dead token — Tailwind v4's
  `@theme` generates `bg-brand` / `text-brand` utilities from it, so a host could
  already paint its own markup. The gap was one-directional: nothing in the kit
  could be pointed at it.

### Changed

- **`Color` (and therefore `ButtonColor`) gained the member `"brand"`.** Runtime
  behaviour is purely additive and every existing hue is untouched.

  **What you must do:** nothing, unless you wrote an exhaustive
  `Record<Color, …>` or a `switch` over `Color` in your own code. Those will now
  fail to compile with a missing `brand` case, which is the compiler correctly
  telling you there is a colour you do not handle. Add the one entry. If you
  would rather not, type your map against the hue names directly instead of
  against our union.

  `COLORS` also gained `"brand"`, since it is documented as every value of
  `Color` and is what an exhaustive map is meant to be built from.

## [5.28.1] - 2026-09-28

### Fixed

- **`contentEditableAdapter.replaceRange` flattened the element, so `InputTag`
  could only ever insert ONE tag into a contenteditable that renders anything.**
  Reported in #29 by a consumer whose entire surface is a contenteditable: the
  first pill vanished on the second insert, and the characters around the insert
  were eaten, because `start` / `end` index the visible text while the host's
  `insert()` returns a marker of a different length — so the slice drifted by
  the difference every time.

  The cause was `el.textContent = next`, which destroys every element child.
  `caretIndex()` and `setCaret()` already node-walked correctly; `replaceRange`
  was the one place reaching for `textContent` as BOTH reader and writer, and
  reading a flattened string is fine while writing one back is what threw the
  elements away.

  It now resolves both indices through the same walk `setCaret` uses (extracted
  as a shared `locate`) and edits through a `Range` — `deleteContents()` +
  `insertNode()` — so nodes outside the range survive by construction, and the
  caret anchors on the node just written rather than on an offset that has
  moved.

  **What you must do: nothing.** A plain-text contenteditable behaves exactly as
  before; this only adds behaviour where element children exist, which is the
  case that used to lose them. If you wrote your own adapter to work around
  this, you can delete it.

## [5.28.0] - 2026-09-28

### Fixed

- **`FileUpload`'s `accept` and `multiple` props were wired to nothing.** Both
  were declared on `FileUploadProps`, so they were real props to anyone reading
  the types or asking an agent to compose the component. Neither was
  destructured in the root, neither reached the hidden `<input>`, and neither was
  consulted when files were added. `accept="image/*"` filtered nothing in the
  browse dialog and accepted any dropped file; `multiple={false}` sat beside an
  input that hard-coded `multiple`.

  **`accept` is now enforced on BOTH paths, and the drop path is the one that
  matters.** A browser enforces `accept` in the file picker only — a
  drag-and-drop never opens a picker, so forwarding the attribute alone would
  still have let a `.exe` dropped onto an image-only zone through. A new
  `matchesAccept` implements the HTML `accept` grammar (extensions, exact MIME
  types, `type/*` wildcards, case-insensitive) and filters dropped files with it.
  Extension rules match the file NAME, because a dropped file frequently reports
  an empty `File.type` — that is the common case, not an edge one.

  **What a consumer must do: check whether you pass `accept` to `FileUpload`.**
  If you do, files that previously got through will now be refused — which is
  what you asked for, but it is a real behaviour change rather than a no-op, and
  it is why this is a minor rather than a patch. If you were relying on the prop
  being ignored, remove it. If you pass neither prop, nothing changes: an absent
  `accept` constrains nothing and `multiple` still defaults to `true`.

  `multiple={false}` now sets the input attribute and caps the selection at one
  file, applied exactly the way `maxFiles` is (first-wins, not replace-last) so
  the two props cannot disagree about what a single-file upload means.

  `FileUpload` had **no tests at all**; it now has eight, four of which fail
  against 5.27.1.

## [5.27.1] - 2026-09-20

### Fixed

- **A wide `leading` / `trailing` no longer renders on top of the value.**
  These adornments are absolutely positioned over the input, so they take no
  space in flow and the input is padded by hand to keep text clear of them. That
  padding was a fixed `pl-9` / `pr-9` — 36px, sized for a single icon — while the
  adornment sits at `left-3` (12px), leaving 24px of room.

  `leading="https://"` is roughly 50px, so the protocol and the value drew on top
  of one another. Reported on the live showcase.

  The width is now **measured** rather than assumed, because these props accept
  arbitrary content — a currency code, a unit, a protocol, a short label — and no
  fixed padding can be right for all of it. A `ResizeObserver` re-measures when a
  webfont swaps in or the adornment's content changes.

  **What to do:** nothing. The fixed padding remains the pre-measure fallback, so
  server-rendered and first-paint output is unchanged, and an icon-sized
  adornment lands on the same 36px it always did.

## [5.27.0] - 2026-09-14

### Added

- **`<PromptInput>` attaches a pasted image.** Pasting a screenshot into the
  composer now adds it as an attachment, with the `File` and its MIME type, just
  like a drop or the picker. There was no paste handler at all, so a pasted image
  did nothing: no chip and no error. A host that swapped its own paste-capable
  textarea for `PromptInput` (flabs did) lost the feature without noticing.

  Files attach only when the clipboard carries no plain text. Word, Excel and
  most editors put a picture of the selection beside the text, and attaching
  that would turn every pasted sentence into a screenshot of the sentence. A text
  paste is left entirely to the browser.

  **What you must do:** nothing. If your host already handled `paste` on an
  element wrapping `PromptInput`, an image paste now attaches here as well, so
  remove your handler or you will get the image twice.

## [5.26.0] - 2026-08-23

### Fixed

- **`<Callout>` forwards its rest props** (#28). It destructured its six named
  props and spread nothing, so everything else was accepted and discarded:

  ```tsx
  // Compiled. Rendered. The attribute was nowhere in the DOM.
  <Callout data-my-handle="x" color="red">…</Callout>
  ```

  **TypeScript could not catch this.** A hyphenated JSX attribute is always
  allowed and never checked against a component's props type, so `data-*` on a
  Callout typechecked and vanished — accepted silently and dropped silently,
  with no signal at compile time or run time. It also made Callout the odd one
  out: `Badge`, `Button`, `Table.Cell`, `Table.Row` and `Table.Column` all
  already spread rest.

  Found building `fancy-trading-ui`, where **four** agent handles were dead for
  this reason — each with a passing test, because the tests asserted on
  rendered text rather than on the handle.

  `CalloutProps` now extends `HTMLAttributes<HTMLDivElement>`, and the spread
  sits last, so `id`, `aria-*`, event handlers and `role` all reach the element.
  `role="alert"` remains the default and is now overridable — a static
  informational callout no longer has to announce itself assertively.

  **What you must do: nothing.** This only adds props that were previously
  discarded. If you worked around it by moving a handle onto a wrapping
  element, that still works; you can now move it back.


## [5.25.0] - 2026-08-23

### Fixed

- **`<Card>` padding now reaches every direct child, not only `<div>`
  children.** `padding` compiled to `[&>div]:px-4`, so the TAG a caller
  happened to choose silently decided whether that child was padded. A card
  mixing element types came out half-padded:

  ```tsx
  <Card>
    <div>Backend & headless</div>   {/* inset 16px */}
    <p>PHP / Node packages…</p>     {/* flush against the border */}
  </Card>
  ```

  Nothing in the caller's code hinted at the rule, so the result read as a bug
  in the card rather than in the markup — it was found on the showcase's
  `/packages` page, where a description paragraph and a footer link sat hard
  against the border while the header and thumbnail strip beside them were
  correctly inset.

  **What you must do: nothing, unless you were compensating for this.** Any
  non-`<div>` direct child of a `Card` now picks up the card's padding. If you
  had added your own `padding-inline` to such a child to work around the gap,
  remove it or you will get the inset twice. If you genuinely want a
  full-bleed child, use the same escape hatch `Card.Media` uses — `!px-0
  !py-0` — which keeps working and is now reachable from any tag.


## [5.24.0] - 2026-08-20

Both from putting `<Progress>` on the showcase's player level meter, filed as
#26 and #27. They are one shape — the component decided everything and the
caller could not reach past the outer wrapper — and they failed differently.

### Added

- **`trackClassName` and `fillClassName` on `<Progress>`** (#27). `className`
  reached only the outermost of three nested elements, so the track
  (`bg-zinc-200`) and the fill were unreachable, and `color` takes a single
  palette name — a gradient was not expressible at all. The showcase shipped a
  solid colour in place of its brand gradient rather than reach in with
  `className="[&>div>div]:…"`, which hard-codes this component's DOM shape into
  a consumer and breaks silently, still rendering but unstyled, the first time a
  wrapper is added.

  Named for the ROLE, not the element, so one vocabulary covers both variants:
  on `variant="circular"` they land on the ring's background and value circles.

  ```tsx
  <Progress value={xp} max={next} fillClassName="bg-[linear-gradient(90deg,#7dd3fc,#818cf8_55%,#c4b5fd)]" />
  ```

### Fixed

- **`<Progress>` can be named, and can say what its number means** (#26). It
  announced as *"progress bar, 42%"* — 42% of what was not recoverable from the
  control. `ProgressProps` was a closed interface and the component had **no
  rest spread**, so `aria-label`, `aria-labelledby` and `aria-valuetext` had no
  route in at either the type or the runtime level. Unlike #24 this needed both.

  `ProgressProps` now extends `HTMLAttributes<HTMLDivElement>` (minus `color`,
  which here is a palette name rather than the legacy HTML attribute) and the
  rest props are spread onto the `progressbar` element in both variants. That
  brings `aria-valuetext` with it, which is the right answer for a meter whose
  scale is not a percentage:

  ```tsx
  <Progress
    value={1240} max={2500}
    aria-labelledby="level-heading"
    aria-valuetext="1,240 of 2,500 XP to Level 6"
  />
  ```

  **Nothing to do on upgrade** — additive, and a bar with no ARIA props renders
  exactly as before.

  Not done, and deliberately left open on #27: the custom-property route
  (`--fancy-progress-fill` and friends) for consumers who theme centrally rather
  than per-call-site. That is a kit-wide decision about how components expose
  theming hooks, and #23 is the reason not to add one casually — a property that
  is set but never read is worse than none, because the doc comment then
  promises a hook that does nothing.


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

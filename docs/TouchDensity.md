# Touch density

An opt-in that makes every interactive react-fancy control at least **44 x 44
CSS px**, the WCAG 2.5.5 Target Size (Enhanced, AAA) size. It is off by default:
an app that does not set it renders exactly what it rendered before.

## Turn it on

Set one attribute, once, on the root:

```html
<html data-fancy-density="touch">
```

That is the whole switch. It needs `@particle-academy/react-fancy/styles.css`,
which the setup already imports. Put it on `<html>` rather than a wrapper:
popups (Dropdown, Select, Command, ContentReaction, the PhoneInput country list)
are portalled to `<body>`, so a wrapper would not cover them.

### Change the size

`--fancy-target-min` sets the minimum on both axes. Default `44px`.

```css
:root { --fancy-target-min: 48px; }
```

WCAG 2.5.8 (Target Size, Minimum, AA) asks for 24px. 44px is the enhanced level
and the size Apple and Android recommend for touch.

### Follow the pointer

There is no built-in coarse-pointer query, by design: touch density never turns
itself on. To apply it on touch screens only, set the attribute from script:

```js
const coarse = window.matchMedia("(pointer: coarse)");
const apply = () =>
  coarse.matches
    ? document.documentElement.setAttribute("data-fancy-density", "touch")
    : document.documentElement.removeAttribute("data-fancy-density");
apply();
coarse.addEventListener("change", apply);
```

## What it does

Under the attribute, the element a person taps gets `min-height` and
`min-width` of `var(--fancy-target-min, 44px)`. That element is also the one a
bounding-box sweep measures (`getBoundingClientRect()`): the size is on the
control itself, never on a `::before` / `::after` hit area. A minimum beats
`height`, `width`, `max-height` and `max-width`, so the box really is that big.

Where a control's visual would not survive growing, it keeps its look and grows
around it. The measured element is still 44px:

| Control | Measure | What you see |
|---|---|---|
| Switch (`button[role="switch"]`) | the button | The track and knob keep their default size. The extra size is a transparent border the track's background does not paint, so the knob's travel is unchanged. The focus ring follows the larger box. |
| A labelled Checkbox, CheckboxGroup option or RadioGroup option | the labelled **row**, not the input | The row (`[data-react-fancy-checkbox]`, or the option's `div` inside the group) and its `<label>` are at least 44px tall; the label fills the row beside the input, so a tap anywhere in it toggles the input once. The native checkbox or radio keeps its normal drawn size (14 to 24px by `size`) and is centred on the label's 44px line; the label's text is vertically centred in that line. The browser draws a native checkbox or radio at its box size, which is why the input itself is not grown. A description or error line sits below the 44px line, at its usual indent. |
| A Checkbox with no visible label (`labelHidden`, or no `label`), or an option row without one | the native input | There is no row to tap, so the input itself is at least 44 x 44. Chromium and Firefox draw the box at that size; Safari keeps the glyph small and centres it in a 44px box. |
| A labelled Switch (the row) | the switch, plus the `<label>` | The whole row beside the control is the label, so a tap anywhere in it toggles the control once. The label column stretches to the row's height and takes its free width, the label fills it, and the `gap-2` before it becomes the label's own `0.5rem` start padding. The track is not stretched, and description and error lines keep their indent. A `labelHidden` label is not a target, so that row keeps its gap. |
| IndexList title, PdfViewer download link, links listed in a Popover (`a[href]`), SkipLink | the link | These are inline text. An inline box ignores `min-height`, so under the opt-in they become `inline-flex`: the same text in a box that can grow. |
| Textarea, Composer, PromptInput, CodeView, Editor content, Kanban card | the surface | These are raised to the floor and never lowered. PromptInput (5.5rem) and Editor (120px) are already taller and keep their own minimum. |

## Covered

Every interactive control in:

Accordion, AccordionPanel, Autocomplete (input + options), Breadcrumbs (items +
collapsed dropdown), Button at every size (including icon-only and `href`),
Calendar (days + month navigation), Callout (dismiss), Carousel (controls +
steps), ChatThread (load earlier, jump), Checkbox, CheckboxGroup, CodeBlock
(copy), CodeView, ColorPicker, Command (input + items), Composer (textarea +
send), ContentReaction (trigger + picker items), ContextMenu, DatePicker,
Drawer (close), Dropdown, Editor (toolbar + source toggle + content),
EmojiSelect (trigger + picker), FauxClient (zoom + full screen), FileBrowser
(nodes, path bar, sort, filter), FileUpload (browse), FullScreen toggle,
HotkeyCapture, ImagePill, ImageViewer controls, IndexList, Input (including the
password reveal), JsonEditor (rows + every action), Kanban cards, MagicWand,
Menu (items + submenu), MobileMenu (flyout + bottom bar), Modal (close),
MultiSwitch, Navbar (items + toggle), NumberField, OtpInput, Pagination,
PdfViewer, PhoneInput (country button, number, country search + list), Pillbox,
Popover content links, PromptInput (textarea, attach, send), QrCodePanel
actions, RadioGroup, ReasonTag (follow-up + sources), ReorderableGrid items,
ResizablePanels separator, Select (native, listbox, multiple, search), SetupWizard,
Sidebar (items, submenu, toggle), SkipLink, Slider, Stepper (clickable steps),
StreamingAudio, Switch, Table (search, sort, row expand, pagination), Tabs,
Textarea, TimeGrid cells, TimePicker, Toast (action + dismiss), TreeNav.

There is no separate theme-toggle component: a theme toggle is a `Button`, so it
is covered as one.

**Not covered:**

- **ChatDrawer.** It renders no `data-react-fancy-*` handle, so there is no
  selector that reaches its tabs and toggle without also matching your markup.
  It needs a root handle first, which is a change to its default markup.
- **VideoViewer, AudioViewer, MediaViewer playing media.** These use the
  browser's own `<video controls>` / `<audio controls>`. WCAG 2.5.5 exempts
  user-agent controls, and author CSS cannot size the buttons inside them.

## How it is tested

`tests/touch-density.test.tsx` renders every component above under the opt-in,
opening each popup first. jsdom does no layout, so it measures through the
cascade instead of a bounding box: it compiles Tailwind for the classes the
component rendered, installs `styles.css` after it, and reads
`getComputedStyle` `min-height` and `min-width` on every tappable element. It
finds those elements itself (buttons, links, inputs, and every tappable ARIA
role), so a control added later is measured the day it appears. A checkbox or
radio whose row has a visible label is measured by that row, not by the input
(see the table above); with no visible label, the input is measured.
`tests/touch-density-label-rows.test.tsx` also checks that such an input has
no 44px minimum, that the row and label do, that the label's text is centred,
and that the input's block-start margin centres it on the label's line. It also fails a
target that computes to `display: inline`, because an inline box ignores
`min-height`.

The same file proves the default is unchanged: for every component, the markup
and every computed property of every element are identical with and without the
density rules in the sheet, and every density selector starts from
`[data-fancy-density="touch"]`.

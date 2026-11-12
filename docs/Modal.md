# Modal

A dialog overlay with backdrop, focus trapping, escape-to-close, and body scroll locking. Renders via a portal.

## Import

```tsx
import { Modal } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
const [open, setOpen] = useState(false);

<button onClick={() => setOpen(true)}>Open Modal</button>

<Modal open={open} onClose={() => setOpen(false)}>
  <Modal.Header>Confirm Action</Modal.Header>
  <Modal.Body>
    <p>Are you sure you want to proceed?</p>
  </Modal.Body>
  <Modal.Footer>
    <button onClick={() => setOpen(false)}>Cancel</button>
    <button onClick={handleConfirm}>Confirm</button>
  </Modal.Footer>
</Modal>
```

## Props

### Modal (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| open | `boolean` | - | Whether the modal is visible (required) |
| onClose | `() => void` | - | Callback to close the modal (required) |
| size | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"md"` | Max width of the modal panel |
| className | `string` | - | Additional CSS classes for the panel |

### Modal.Header

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Header content |
| className | `string` | - | Additional CSS classes |

### Modal.Body

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Body content |
| className | `string` | - | Additional CSS classes |

### Modal.Footer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Footer content (typically action buttons) |
| className | `string` | - | Additional CSS classes |

## Theming

The panel's corners and the header read theme tokens. Set nothing and the Modal
looks exactly as before.

| Token | Default | Paints |
|-------|---------|--------|
| `--fancy-radius-modal` | `var(--radius-2xl)` (`rounded-2xl`, 1rem) | the panel's corner radius |
| `--fancy-modal-header-bg` / `--fancy-modal-header-bg-dark` | transparent (the panel's surface shows through) | the header's fill, and the close button's hover fill |
| `--fancy-modal-header-text` / `--fancy-modal-header-text-dark` | the `text` token on the title; `text-muted`, hovering to `text-soft`, on the close button | the title and the close button, at rest and on hover |

```css
:root {
  --fancy-radius-modal: 0.5rem;
  --fancy-modal-header-bg: #1d3557;       --fancy-modal-header-bg-dark: #0b1a2e;
  --fancy-modal-header-text: #f1faee;     --fancy-modal-header-text-dark: #e8f1ff;
}
```

- Keep the title at 4.5:1 and the close icon at 3:1 against the header fill.
  The defaults clear both in each mode.
- With a header fill set, the close button's hover fill is that same fill, so
  the header text stays on the colour it was chosen for. The button has no
  focus styling of its own; the browser's focus ring is unchanged.
- The handles `[data-react-fancy-modal]`, `[data-react-fancy-modal-header]`,
  `[data-react-fancy-modal-close]`, `[data-react-fancy-modal-body]` and
  `[data-react-fancy-modal-footer]` are unchanged.

## Large Modal

```tsx
<Modal open={open} onClose={() => setOpen(false)} size="xl">
  <Modal.Header>Large Content</Modal.Header>
  <Modal.Body>
    <p>This modal uses the xl size variant for wider content.</p>
  </Modal.Body>
  <Modal.Footer>
    <button onClick={() => setOpen(false)}>Close</button>
  </Modal.Footer>
</Modal>
```

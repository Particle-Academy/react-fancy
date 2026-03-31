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

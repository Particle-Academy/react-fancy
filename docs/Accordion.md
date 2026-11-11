# Accordion

A collapsible content panel supporting single or multiple open items simultaneously.

## Import

```tsx
import { Accordion } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Accordion>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>What is React Fancy?</Accordion.Trigger>
    <Accordion.Content>
      A headless-ish UI component library for React.
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="item-2">
    <Accordion.Trigger>Is it accessible?</Accordion.Trigger>
    <Accordion.Content>
      Yes, it follows WAI-ARIA patterns.
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

## Props

### Accordion (root)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| type | `"single" \| "multiple"` | `"single"` | Whether one or multiple items can be open |
| value | `string \| null` (single), `string[]` (multiple) | - | Controlled: which items are open |
| defaultValue | `string \| null` (single), `string[]` (multiple) | - | Uncontrolled initial value, in the same shape as `value` |
| onChange | `(value) => void` | - | Called with the next value, in the same shape as `value` |
| defaultOpen | `string[]` | `[]` | Values of items that start open (kept for compatibility; `defaultValue` wins when both are set) |
| className | `string` | - | Additional CSS classes |

### Accordion.Item

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| value | `string` | - | Unique item identifier (required) |
| className | `string` | - | Additional CSS classes |

### Accordion.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Clickable header content |
| className | `string` | - | Additional CSS classes |

### Accordion.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | `ReactNode` | - | Collapsible content |
| className | `string` | - | Additional CSS classes |

## Multiple Open Items

```tsx
<Accordion type="multiple" defaultOpen={["faq-1", "faq-3"]}>
  <Accordion.Item value="faq-1">
    <Accordion.Trigger>First question</Accordion.Trigger>
    <Accordion.Content>First answer</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-2">
    <Accordion.Trigger>Second question</Accordion.Trigger>
    <Accordion.Content>Second answer</Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="faq-3">
    <Accordion.Trigger>Third question</Accordion.Trigger>
    <Accordion.Content>Third answer</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

## Controlled

Pass `value` and `onChange` to own the open state, so an agent (or anything else) can read and set it. With `type="single"` the value is the open item's `value`, or `null` when none is open; with `type="multiple"` it is an array of open item values.

```tsx
const [open, setOpen] = useState<string | null>("faq-1");

<Accordion value={open} onChange={setOpen}>
  <Accordion.Item value="faq-1">...</Accordion.Item>
  <Accordion.Item value="faq-2">...</Accordion.Item>
</Accordion>

const [openMany, setOpenMany] = useState<string[]>([]);

<Accordion type="multiple" value={openMany} onChange={setOpenMany}>...</Accordion>
```

Without `value` the accordion is uncontrolled (`defaultValue` or `defaultOpen`), and `onChange` still reports every change.

## Agent handles

| Selector | Element |
|---|---|
| `[data-react-fancy-accordion]` | Root; `data-type` is `single` or `multiple` |
| `[data-react-fancy-accordion-item]` | One item; `data-value` is its `value`, `data-state` is `open` or `closed` |
| `[data-react-fancy-accordion-trigger]` | The item's button; `aria-expanded` mirrors `data-state` |
| `[data-react-fancy-accordion-content]` | The item's collapsible body |

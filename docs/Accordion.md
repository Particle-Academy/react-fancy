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
| defaultOpen | `string[]` | `[]` | Values of items that start open |
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

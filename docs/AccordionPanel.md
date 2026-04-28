# AccordionPanel

Horizontal or vertical accordion of collapsible sections. Sized for both menus/toolbars and full-page panels.

## Import

```tsx
import { AccordionPanel } from "@particle-academy/react-fancy";
```

## Compound parts

| Component | Role |
|-----------|------|
| `AccordionPanel` | Root. Manages the open/closed set across all sections. |
| `AccordionPanel.Section` | One collapsible region. Identified by a stable `id`. |
| `AccordionPanel.Trigger` | The collapse/expand handle. Renders inside a Section. |
| `AccordionPanel.Content` | Wraps the open-state content. Renders only when open. |

## Basic

```tsx
<AccordionPanel orientation="horizontal" defaultValue={["wishlist"]}>
  <AccordionPanel.Section id="home" pinned>
    <Action icon="home" />
  </AccordionPanel.Section>

  <AccordionPanel.Section id="wishlist">
    <AccordionPanel.Trigger />
    <AccordionPanel.Content>
      <Action icon="list">Wishlist</Action>
      <Action icon="mail">Feedback</Action>
      <Action icon="file-text">Plans</Action>
    </AccordionPanel.Content>
  </AccordionPanel.Section>

  <AccordionPanel.Section id="board">
    <AccordionPanel.Trigger />
    <AccordionPanel.Content>
      <Action icon="grid">Board</Action>
    </AccordionPanel.Content>
  </AccordionPanel.Section>
</AccordionPanel>
```

When closed, the Trigger renders as a standalone chevron button. When open, the Trigger collapses into a thin divider on the section's trailing edge — hovering reveals an inset chevron, clicking collapses.

## Custom triggers

`Trigger` is a separate exported component so you can compose your own. It reads section state via context — pass `children` (node or render-prop) to fully replace the default look:

```tsx
<AccordionPanel.Section id="more">
  <AccordionPanel.Trigger className="bg-amber-500">
    {({ open }) => (open ? "Collapse" : "Expand")}
  </AccordionPanel.Trigger>
  <AccordionPanel.Content>
    <Action>Releases</Action>
  </AccordionPanel.Content>
</AccordionPanel.Section>
```

You can also use the hook directly to build a trigger from scratch:

```tsx
import { useAccordionSection } from "@particle-academy/react-fancy";

function MyTrigger() {
  const { open, toggle } = useAccordionSection();
  return <button onClick={toggle}>{open ? "▾" : "▸"}</button>;
}
```

## Vertical orientation

Pass `orientation="vertical"` for sidebar/full-page panel layouts. Triggers turn into horizontal divider bars; collapsed sections become wide buttons.

```tsx
<AccordionPanel orientation="vertical" defaultValue={["files", "tools"]}>
  <AccordionPanel.Section id="files">
    <AccordionPanel.Content>{/* file tree */}</AccordionPanel.Content>
    <AccordionPanel.Trigger />
  </AccordionPanel.Section>
  <AccordionPanel.Section id="tools">
    <AccordionPanel.Content>{/* tools */}</AccordionPanel.Content>
    <AccordionPanel.Trigger />
  </AccordionPanel.Section>
</AccordionPanel>
```

## Controlled

```tsx
const [open, setOpen] = useState<string[]>(["wishlist"]);

<AccordionPanel value={open} onValueChange={setOpen}>
  ...
</AccordionPanel>
```

## Props

### AccordionPanel

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Layout axis |
| `value` | `string[]` | - | Controlled list of open section ids |
| `defaultValue` | `string[]` | `[]` | Default open set (uncontrolled) |
| `onValueChange` | `(open: string[]) => void` | - | Fires on every toggle |
| `className` | `string` | - | Class on the root container |

### AccordionPanel.Section

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Stable identifier |
| `pinned` | `boolean` | `false` | Never collapses; doesn't need a Trigger |
| `className` | `string` | - | Class on the section's outer container |
| `openClassName` / `closedClassName` | `string` | - | Class applied per state |
| `unstyled` | `boolean` | `false` | Skip the default flex layout (`items-center`, `gap-1`, row/col by orientation). Use for full-bleed panel sections where the trigger should stretch to fill the panel. *Since v2.7.0.* |

### AccordionPanel.Trigger

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode \| (state) => ReactNode` | - | Custom render. State: `{ id, open, orientation, toggle }` |
| `className` | `string` | - | Override default styles |
| `aria-label` | `string` | `"Toggle section"` | Accessibility label |

### AccordionPanel.Content

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Open-state content |
| `className` | `string` | - | Layout class on the content container |
| `unstyled` | `boolean` | `false` | Skip the default flex layout. Same intent as `Section.unstyled` — for full-bleed panel content (chat panes, canvas surfaces). *Since v2.7.0.* |

## Hitbox

The default open-state Trigger renders as a thin 1px divider on the section's trailing edge, but the **clickable hitbox is 12px wide** (`w-3` / `h-3`) so users don't have to land pixel-perfect on the line. The visible 1px line darkens on hover and an inset chevron fades in. *Since v2.7.0.*

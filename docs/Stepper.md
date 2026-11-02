# Stepper

An ordered list of steps, each with a title, an optional description and rich content, and a state: `upcoming`, `current`, `complete` or `error`. Use it for setup walkthroughs and multi-step guides. Data-driven (via the `steps` prop) or compound (`Stepper.Step`).

By default a Stepper is **pure content**: an `<ol>` with no buttons, inputs or form elements, so it is safe on pages that forbid interactive controls. Clickable steps are opt-in with `clickable`.

For in-app product tours, use `fancy-walkthrough`. For a record of past events, use `Timeline`.

## Import

```tsx
import { Stepper } from "@particle-academy/react-fancy";
```

## Basic Usage

```tsx
<Stepper
  aria-label="Connect your provider"
  defaultCurrent={1}
  steps={[
    { id: "account", title: "Create an account", description: "At the provider", content: <p>Sign up at the provider's site.</p> },
    { id: "key", title: "Copy the API key", content: <p>Open Settings, then API keys.</p> },
    { id: "paste", title: "Paste it here", content: <p>Come back to this page.</p> },
  ]}
/>
```

Steps before `current` are `complete`, the step at `current` is `current`, and steps after it are `upcoming`. A step's own `state` overrides that, which is how a step shows `error`.

## Stepper Props

Also accepts every `<ol>` attribute (`id`, `aria-label`, `style`, `data-*`, ...), forwarded to the list.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| steps | `StepperStep[]` | - | The steps as data. Wins over `children` when both are given |
| children | `ReactNode` | - | `Stepper.Step` elements (direct children only) |
| current | `number` | - | Controlled index of the current step. `steps.length` means every step is complete |
| defaultCurrent | `number` | `0` | Uncontrolled starting index |
| onChange | `(index: number) => void` | - | Called with the chosen step's index. Only fires when `clickable` |
| orientation | `"vertical" \| "horizontal"` | `"vertical"` | Layout. Horizontal suits short content |
| clickable | `boolean` | `false` | Render each step's header as a `<button>` that makes it current |
| showContent | `"all" \| "current"` | `"all"` | Show every step's content, or only the current step's |
| stateLabels | `Partial<Record<StepperStepState, string>>` | English | Words for each state, read by screen readers |
| className | `string` | - | Additional CSS classes on the `<ol>` |

## StepperStep (data-driven)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | `ReactNode` | yes | Step heading |
| id | `string` | no | Stable identity, rendered as `data-step-id` |
| description | `ReactNode` | no | Short line under the title |
| content | `ReactNode` | no | The step's body |
| state | `"upcoming" \| "current" \| "complete" \| "error"` | no | Overrides the state derived from `current` |
| disabled | `boolean` | no | With `clickable`, the step's button is disabled |

## Stepper.Step Props

The same fields as `StepperStep`, with the step's content as `children`. `Stepper.Step` renders nothing by itself: `Stepper` reads it as data, so both forms produce identical markup.

```tsx
<Stepper current={step} aria-label="Connect your provider">
  <Stepper.Step title="Create an account" description="At the provider">
    <p>Sign up at the provider's site.</p>
  </Stepper.Step>
  <Stepper.Step title="Copy the API key" state={keyRejected ? "error" : undefined}>
    <p>Open Settings, then API keys.</p>
  </Stepper.Step>
  <Stepper.Step title="Paste it here" />
</Stepper>
```

## Clickable steps

```tsx
const [step, setStep] = useState(0);

<Stepper
  clickable
  current={step}
  onChange={setStep}
  steps={[
    { title: "Account" },
    { title: "API key" },
    { title: "Finish", disabled: step < 1 },
  ]}
/>
```

With `clickable`, each step's indicator and title become a `type="button"`. The description and content stay outside the button, so links in them remain links. Enter and Space activate a button natively; the arrow keys (Up/Down, or Left/Right when horizontal) and Home/End move focus between enabled steps without changing the current step. Every button stays in the tab order. Clicking the step that is already current does not call `onChange`.

## Horizontal

```tsx
<Stepper orientation="horizontal" current={1} steps={[{ title: "Cart" }, { title: "Shipping" }, { title: "Pay" }]} />
```

## Content visibility

`showContent="current"` renders only the current step's content, for a wizard-style view. The default, `"all"`, renders every step's content, for a walkthrough read top to bottom.

## Accessibility

- An `<ol>` of `<li>`s. Give the list an `aria-label`.
- The current step's `<li>` carries `aria-current="step"`.
- Each step's state is in text (visually hidden, before the title: "Completed: Create an account"), and the indicator's glyph differs per state (number, tick, "!"), so state never depends on colour alone. Translate the words with `stateLabels`.
- Server-renders with no `window` or `document` access.

## Agent handles

| Attribute | On | Value |
|-----------|----|-------|
| `data-react-fancy-stepper` | `<ol>` | - |
| `data-orientation` | `<ol>` | `vertical` / `horizontal` |
| `data-current` | `<ol>` | current index |
| `data-react-fancy-stepper-step` | each `<li>` | - |
| `data-state` | each `<li>` | `upcoming` / `current` / `complete` / `error` |
| `data-index` | each `<li>` | the step's index |
| `data-step-id` | each `<li>` | the step's `id`, when given |
| `data-disabled` | each `<li>` | `true` when disabled |
| `data-react-fancy-stepper-trigger` | the step's `<button>` | only when `clickable` |
| `data-react-fancy-stepper-indicator` / `-title` / `-description` / `-content` / `-state` | the step's parts | - |

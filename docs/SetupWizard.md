# SetupWizard

A step-by-step guide for setting up a third-party service, written for someone who has never done it. One step is on screen at a time. Each step says who does it (the person, or the agent building their app), what to open, what to copy, and how to tell it worked. With `verify`, the guide ends with a live "Check it works" step.

It knows nothing about any provider: a guide is plain JSON, so an agent can write one. It is fully controlled through `value` / `onChange`.

For a static list of steps with no navigation, use `Stepper`. For an in-app product tour, use `fancy-walkthrough`.

## Import

```tsx
import { SetupWizard } from "@particle-academy/react-fancy";
// or the subpath
import { SetupWizard } from "@particle-academy/react-fancy/setup-wizard";
```

## Basic Usage

```tsx
const [value, setValue] = useState({ current: 0, done: [] as number[] });

<SetupWizard
  value={value}
  onChange={setValue}
  tokens={{ appUrl: "https://app.example.com" }}
  steps={[
    { id: "account", title: "Create an account", detail: "Sign up, then confirm your email.", url: "https://dashboard.example.com/signup" },
    { id: "webhook", title: "Add the webhook", detail: "In Developers, then Webhooks, add this URL.", copy: [{ label: "Webhook URL", value: "{{appUrl}}/hooks/example" }], done: "the webhook shows as Enabled" },
    { id: "env", title: "Store the key", detail: "Your agent puts the key in the app's settings.", actor: "agent", prompt: "Add EXAMPLE_KEY to .env and read it in config/services.php." },
  ]}
  verify={async () => {
    const res = await fetch("/setup/example/check");
    return res.json(); // { ok, detail, proves? }
  }}
/>
```

## What each step shows

- A counter ("Step 2 of 4") and a badge for who does it: **You** for `actor: "person"` (the default), **Your agent** for `actor: "agent"`.
- The title, as the step heading, and the `detail` as plain text.
- **person** steps: an "Open <host>" button when `url` is set, opening in a new tab with `rel="noopener noreferrer"`. Only absolute `http:` and `https:` URLs render; `javascript:`, `data:`, relative paths and anything unparseable render no link at all. Each `copy` entry shows its label, its value and a Copy button.
- **agent** steps: the `prompt` in a code block, one prominent "Copy prompt" button, and a line telling the person to paste it to the agent building their app.
- "You'll know it worked when: ..." when `done` is set.
- Back, "Mark done and continue" ("Mark done" on the last step), and the step indicator (react-fancy's `Stepper`), whose steps are buttons for jumping to any step.

## Tokens

`tokens` fills `{{name}}` in `detail`, `prompt` and `copy[].value`. It is literal string replacement: the result is rendered as text, never HTML, and a value is never evaluated (`$&` in a value stays `$&`). A placeholder with no token stays as written, and logs one `console.warn` per name in development. Titles, labels and `url` are not filled.

## Copy

Copy writes with `navigator.clipboard` when it exists, and the button reads "Copied" for two seconds. When the clipboard is missing or refuses (an insecure context, a denied permission), the value's text is selected instead, so the person can copy it by hand, and the button reads "Selected". Either result is announced through a polite live region. Nothing touches `window` or `navigator` during render, so the component renders on the server.

## Verify

With `verify`, a final step is added at index `steps.length`. Its button runs `verify()` and shows the result: "It works" or "It isn't working yet", the `detail`, and on success "What this proves: <proves>". A passing check adds its index to `done` through `onChange`; a failing one changes nothing. A `verify` that throws is shown as a failed check with "The check could not run. Try again."

## Props

Also accepts every `<div>` attribute (`style`, `aria-*`, `data-*`, ...), forwarded to the root.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| steps | `SetupWizardStep[]` | - | The steps, in order |
| value | `{ current: number; done: number[] }` | - | Controlled state. `current` is clamped to the steps that exist |
| onChange | `(next: SetupWizardValue) => void` | - | Called on Back, Mark done, a jump, and a passing check |
| tokens | `Record<string, string>` | - | Fills `{{name}}` in `detail`, `prompt`, `copy[].value` |
| verify | `() => Promise<{ ok: boolean; detail: string; proves?: string }>` | - | Adds the final "Check it works" step |
| labels | `Partial<SetupWizardLabels>` | English | Every visible string (see below) |
| id | `string` | generated | Root id; element ids derive from it |
| className | `string` | - | Classes on the root |

## SetupWizardStep

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | `string` | yes | Step heading |
| detail | `string` | yes | What to do, as plain text. Tokens filled |
| id | `string` | no | Stable identity: `data-setup-step` and element ids |
| url | `string` | no | Provider page; http(s) only |
| actor | `"person" \| "agent"` | no | Who does it. Default `"person"` |
| prompt | `string` | no | For an agent step: the prompt to paste. Tokens filled |
| copy | `{ label: string; value: string }[]` | no | Values to copy. Tokens filled in `value` |
| done | `string` | no | How to tell it worked |

## Labels

All optional. `{host}`, `{current}` and `{total}` are filled where shown.

| Key | Default |
|-----|---------|
| person | `You` |
| agent | `Your agent` |
| indicator | `Setup steps` (accessible name of the step indicator) |
| stepOf | `Step {current} of {total}` |
| open | `Open {host}` |
| copy | `Copy` |
| copyPrompt | `Copy prompt` |
| copied | `Copied` |
| selected | `Selected` |
| copyFailed | `Couldn't copy. The text is selected, so you can copy it yourself.` |
| agentHint | `Paste this prompt to the agent building your app.` |
| doneWhen | `You'll know it worked when:` |
| back | `Back` |
| next | `Mark done and continue` |
| finish | `Mark done` |
| verifyTitle | `Check it works` |
| verifyDetail | `Run a quick check to make sure everything is connected.` |
| verify | `Check it works` |
| verifying | `Checking...` |
| verifyOk | `It works` |
| verifyFailed | `It isn't working yet` |
| verifyError | `The check could not run. Try again.` |
| proves | `What this proves:` |

## Accessibility

- The current step is a `role="region"` labelled by its heading.
- When the step changes, focus moves to the new step's heading (`tabIndex={-1}`). It does not move on first render.
- Copy and verify results are announced through one `role="status"` polite live region.
- Every control is a native button or link, and the step indicator supports arrow keys, Home and End.
- Secondary text uses the `--fancy-text-muted` token, never faint.

## Stable handles

| Selector | Element |
|----------|---------|
| `[data-setup-wizard]` | Root (`id` = the `id` prop). Also `data-current`, `data-total` |
| `[data-setup-indicator]` | The Stepper; its steps carry `data-step-id` |
| `[data-setup-step]` | The current step region; value is the step `id`, its index, or `verify` |
| `[data-setup-heading]` | Step heading, id `<id>-<step>-heading` |
| `[data-setup-actor]` | The badge; value `person` or `agent` |
| `[data-setup-detail]` | The filled detail |
| `[data-setup-open]` | The provider link, id `<id>-<step>-open` |
| `[data-setup-copy-entry]`, `[data-setup-copy-value]` | A copy entry and its value |
| `[data-setup-copy="<n>"]` | A copy button, id `<id>-<step>-copy-<n>`, with `data-copy-state` = `idle` / `copied` / `selected` |
| `[data-setup-prompt]`, `[data-setup-copy-prompt]` | The agent prompt and its button (id `<id>-<step>-copy-prompt`) |
| `[data-setup-agent-hint]`, `[data-setup-done]`, `[data-setup-counter]` | Hint, done line, counter |
| `[data-setup-back]`, `[data-setup-next]` | Navigation, ids `<id>-back`, `<id>-next` |
| `[data-setup-verify]`, `[data-setup-verify-result]`, `[data-setup-proves]` | Verify button (id `<id>-verify-button`), result (`data-ok`), proof line |
| `[data-setup-live]` | The polite live region |

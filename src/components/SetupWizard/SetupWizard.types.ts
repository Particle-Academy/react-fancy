import type { HTMLAttributes } from "react";

/** Who does a step: the person reading, or the agent building their app. */
export type SetupWizardActor = "person" | "agent";

/** A value the person copies out of a step: an API base URL, a webhook path. */
export interface SetupWizardCopyEntry {
  /** What the value is, shown above it. */
  label: string;
  /** The value. `{{name}}` placeholders are filled from `tokens`. */
  value: string;
}

/**
 * One step, as data. Every field is JSON, so an agent can emit a whole guide.
 * Plain strings only: nothing here is parsed as HTML or Markdown.
 */
export interface SetupWizardStep {
  /** Stable identity, rendered as `data-setup-step` and used in element ids. */
  id?: string;
  /** Step heading. */
  title: string;
  /** What to do, in plain words. `{{name}}` placeholders are filled from `tokens`. */
  detail: string;
  /**
   * A page at the provider. Rendered as an "Open <host>" link in a new tab,
   * and ONLY when it is an absolute `http:` or `https:` URL. Anything else
   * (`javascript:`, `data:`, a relative path) renders no link at all.
   */
  url?: string;
  /** Who does it. Default `"person"`. */
  actor?: SetupWizardActor;
  /** For an `agent` step: the prompt the person pastes to their agent. Tokens are filled. */
  prompt?: string;
  /** Values to copy, each with its own Copy button. Tokens are filled in `value`. */
  copy?: SetupWizardCopyEntry[];
  /** How the person can tell the step worked. Shown as "You'll know it worked when: ...". */
  done?: string;
}

/**
 * The wizard's whole state. `current` is the step on screen; `done` lists the
 * indexes marked done. With `verify`, the check is index `steps.length`.
 */
export interface SetupWizardValue {
  current: number;
  done: number[];
}

/** What `verify` resolves to. */
export interface SetupWizardVerifyResult {
  /** Whether the service is set up correctly. */
  ok: boolean;
  /** What the check found, in plain words: "Connected as acme", "401 from the API". */
  detail: string;
  /** What a passing check demonstrates: "Your key can create a payment". Shown when `ok`. */
  proves?: string;
}

/**
 * Every visible string, for translation. English by default. `{host}`,
 * `{current}` and `{total}` are filled where noted.
 */
export interface SetupWizardLabels {
  /** Badge on a `person` step. @default "You" */
  person: string;
  /** Badge on an `agent` step. @default "Your agent" */
  agent: string;
  /** Accessible name of the step indicator. @default "Setup steps" */
  indicator: string;
  /** Counter above the step. `{current}`, `{total}`. @default "Step {current} of {total}" */
  stepOf: string;
  /** The url button. `{host}`. @default "Open {host}" */
  open: string;
  /** A copy entry's button. @default "Copy" */
  copy: string;
  /** The agent step's button. @default "Copy prompt" */
  copyPrompt: string;
  /** Shown on the button, and announced, after a copy. @default "Copied" */
  copied: string;
  /** Shown on the button when the clipboard was unavailable and the text was selected. @default "Selected" */
  selected: string;
  /** Announced when the clipboard was unavailable. @default "Couldn't copy. The text is selected, so you can copy it yourself." */
  copyFailed: string;
  /** Under the prompt. @default "Paste this prompt to the agent building your app." */
  agentHint: string;
  /** Before `done`. @default "You'll know it worked when:" */
  doneWhen: string;
  /** @default "Back" */
  back: string;
  /** @default "Mark done and continue" */
  next: string;
  /** The last step's button when there is no `verify`. @default "Mark done" */
  finish: string;
  /** Title of the verify step. @default "Check it works" */
  verifyTitle: string;
  /** Detail of the verify step. @default "Run a quick check to make sure everything is connected." */
  verifyDetail: string;
  /** The verify button. @default "Check it works" */
  verify: string;
  /** The verify button while the check runs. @default "Checking..." */
  verifying: string;
  /** Heading of a passing result. @default "It works" */
  verifyOk: string;
  /** Heading of a failing result. @default "It isn't working yet" */
  verifyFailed: string;
  /** Detail when `verify` itself throws. @default "The check could not run. Try again." */
  verifyError: string;
  /** Before `proves`. @default "What this proves:" */
  proves: string;
}

export interface SetupWizardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "children" | "defaultValue"> {
  /** The steps, in order. */
  steps: SetupWizardStep[];
  /** Controlled state. The wizard never moves on its own. */
  value: SetupWizardValue;
  /** Called with the next state on Back, Mark done, a jump, or a passing check. */
  onChange: (next: SetupWizardValue) => void;
  /**
   * Fills `{{name}}` in `detail`, `prompt` and `copy[].value`. Literal string
   * replacement: no HTML, no evaluation. An unknown token stays as written and
   * logs one warning in development.
   */
  tokens?: Record<string, string>;
  /** When present, a final "Check it works" step runs it and shows the result. */
  verify?: () => Promise<SetupWizardVerifyResult>;
  /** Override any visible string. */
  labels?: Partial<SetupWizardLabels>;
  /** Root id; every interactive element's id is derived from it. Generated when omitted. */
  id?: string;
}

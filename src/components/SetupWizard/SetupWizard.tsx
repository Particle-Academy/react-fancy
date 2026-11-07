import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { visuallyHidden } from "../../utils/visually-hidden";
import { useId } from "../../hooks/use-id";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Callout } from "../Callout/Callout";
import { Card } from "../Card/Card";
import { CodeBlock } from "../CodeBlock/CodeBlock";
import { Heading } from "../Heading/Heading";
import { Stepper } from "../Stepper/Stepper";
import type { StepperStep, StepperStepState } from "../Stepper/Stepper.types";
import { Text } from "../Text/Text";
import { defaultClipboardWriter, runWriter } from "../ContentRenderer/copy";
import { externalLink, fillLabel, fillTokens, warnUnknownTokens } from "./tokens";
import type {
  SetupWizardLabels,
  SetupWizardProps,
  SetupWizardVerifyResult,
} from "./SetupWizard.types";

const DEFAULT_LABELS: SetupWizardLabels = {
  person: "You",
  agent: "Your agent",
  indicator: "Setup steps",
  stepOf: "Step {current} of {total}",
  open: "Open {host}",
  copy: "Copy",
  copyPrompt: "Copy prompt",
  copied: "Copied",
  selected: "Selected",
  copyFailed: "Couldn't copy. The text is selected, so you can copy it yourself.",
  agentHint: "Paste this prompt to the agent building your app.",
  doneWhen: "You'll know it worked when:",
  back: "Back",
  next: "Mark done and continue",
  finish: "Mark done",
  verifyTitle: "Check it works",
  verifyDetail: "Run a quick check to make sure everything is connected.",
  verify: "Check it works",
  verifying: "Checking...",
  verifyOk: "It works",
  verifyFailed: "It isn't working yet",
  verifyError: "The check could not run. Try again.",
  proves: "What this proves:",
};

/** How long "Copied" / "Selected" stays on a button. */
const FEEDBACK_MS = 2000;

type CopyFeedback = { key: string; state: "copied" | "selected" } | null;
type VerifyState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; result: SetupWizardVerifyResult };

/** Select an element's text so the person can copy it by hand. Click-time only. */
function selectText(el: Element | null | undefined): void {
  if (!el || typeof document === "undefined") return;
  const selection = document.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * A step-by-step guide for setting up a third-party service, written for
 * someone who has never done it. One step on screen at a time; each says who
 * does it (the person, or their agent), what to open, what to copy, and how to
 * tell it worked. Optionally ends with a live check.
 *
 * Fully controlled through `value` / `onChange`, and knows nothing about any
 * particular provider: a guide is plain JSON.
 */
export const SetupWizard = forwardRef<HTMLDivElement, SetupWizardProps>(function SetupWizard(
  { steps, value, onChange, tokens, verify, labels: labelsProp, id, className, style, ...rest },
  ref,
) {
  const generated = useId("setup-wizard");
  const base = id ?? generated;
  const labels: SetupWizardLabels = { ...DEFAULT_LABELS, ...labelsProp };

  const hasVerify = typeof verify === "function";
  const verifyIndex = steps.length;
  const total = steps.length + (hasVerify ? 1 : 0);
  const current = Math.min(Math.max(0, Math.trunc(value.current) || 0), Math.max(0, total - 1));
  const done = value.done;
  const onVerifyStep = hasVerify && current === verifyIndex;
  const step = onVerifyStep ? undefined : steps[current];
  const stepKey = onVerifyStep ? "verify" : (step?.id ?? String(current));

  // Latest props for async handlers, which resolve after a render or two.
  const latest = useRef({ value, onChange, verify, labels });
  latest.current = { value, onChange, verify, labels };

  // -- tokens --------------------------------------------------------------
  const unknown: string[] = [];
  const fill = (text: string) => fillTokens(text, tokens, unknown);
  const detail = step ? fill(step.detail) : labels.verifyDetail;
  const prompt = step?.prompt != null ? fill(step.prompt) : undefined;
  const copies = (step?.copy ?? []).map((c) => ({ label: c.label, value: fill(c.value) }));
  // Token names cannot contain "|" (see PLACEHOLDER), so it is a safe joiner.
  const unknownKey = unknown.join("|");
  useEffect(() => {
    if (unknownKey) warnUnknownTokens(unknownKey.split("|"));
  }, [unknownKey]);

  // -- live region + copy --------------------------------------------------
  const [announcement, setAnnouncement] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(copyTimer.current);
    };
  }, []);

  const copyText = async (key: string, text: string, target: () => Element | null | undefined) => {
    // `defaultClipboardWriter` uses navigator.clipboard and throws without it;
    // `runWriter` turns a throw, rejection or hang into `false`.
    const ok = await runWriter(defaultClipboardWriter, { kind: "code", text, html: "" });
    if (!mounted.current) return;
    if (!ok) selectText(target());
    const l = latest.current.labels;
    setCopyFeedback({ key, state: ok ? "copied" : "selected" });
    setAnnouncement(ok ? l.copied : l.copyFailed);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => {
      if (mounted.current) setCopyFeedback(null);
    }, FEEDBACK_MS);
  };

  const feedbackFor = (key: string) => (copyFeedback?.key === key ? copyFeedback.state : "idle");
  const copyLabel = (key: string, idle: string) => {
    const s = feedbackFor(key);
    return s === "copied" ? labels.copied : s === "selected" ? labels.selected : idle;
  };

  // -- focus follows the step ----------------------------------------------
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef(current);
  useEffect(() => {
    if (shown.current === current) return;
    shown.current = current;
    headingRef.current?.focus();
  }, [current]);

  // -- navigation ----------------------------------------------------------
  const go = (index: number) => {
    if (index === current) return;
    onChange({ current: index, done });
  };
  const markDone = () => {
    const nextDone = done.includes(current) ? done : [...done, current].sort((a, b) => a - b);
    onChange({ current: current < total - 1 ? current + 1 : current, done: nextDone });
  };

  // -- verify --------------------------------------------------------------
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: "idle" });
  const runVerify = async () => {
    const run = latest.current.verify;
    if (!run) return;
    setVerifyState({ status: "running" });
    let result: SetupWizardVerifyResult;
    try {
      result = await run();
    } catch {
      result = { ok: false, detail: latest.current.labels.verifyError };
    }
    if (!mounted.current) return;
    const l = latest.current.labels;
    setVerifyState({ status: "done", result });
    setAnnouncement(`${result.ok ? l.verifyOk : l.verifyFailed}. ${result.detail}`);
    const now = latest.current.value;
    if (result.ok && !now.done.includes(verifyIndex)) {
      latest.current.onChange({
        current: now.current,
        done: [...now.done, verifyIndex].sort((a, b) => a - b),
      });
    }
  };

  // -- indicator -----------------------------------------------------------
  // States come from `done`, not position: a step you skipped past is not
  // complete just because it is behind you.
  const titles = steps.map((s) => s.title);
  if (hasVerify) titles.push(labels.verifyTitle);
  const indicatorSteps: StepperStep[] = titles.map((title, i) => {
    const state: StepperStepState = i === current ? "current" : done.includes(i) ? "complete" : "upcoming";
    return { id: i === verifyIndex && hasVerify ? "verify" : (steps[i]?.id ?? String(i)), title, state };
  });

  // -- the step ------------------------------------------------------------
  const actor = onVerifyStep ? "person" : (step?.actor ?? "person");
  const link = step ? externalLink(step.url) : undefined;
  const idFor = (part: string) => `${base}-${stepKey}-${part}`;
  const headingId = idFor("heading");
  const promptRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const isLast = current === total - 1;

  return (
    <div
      ref={ref}
      id={base}
      data-react-fancy-setup-wizard=""
      data-setup-wizard=""
      data-current={current}
      data-total={total}
      className={cn("relative flex flex-col gap-6", className)}
      // `relative` inline too: the live region is absolutely positioned.
      style={{ position: "relative", ...style }}
      {...rest}
    >
      {total > 0 && (
        <Stepper
          data-setup-indicator=""
          aria-label={labels.indicator}
          orientation="horizontal"
          clickable
          steps={indicatorSteps}
          current={current}
          onChange={go}
        />
      )}

      {(step || onVerifyStep) && (
        <Card
          role="region"
          aria-labelledby={headingId}
          data-setup-step={stepKey}
          data-setup-index={current}
          data-setup-actor-kind={actor}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Text as="span" size="sm" color="muted" data-setup-counter="">
                {fillLabel(labels.stepOf, { current: current + 1, total })}
              </Text>
              <Badge
                data-setup-actor={actor}
                color={actor === "agent" ? "violet" : "zinc"}
                variant="soft"
                size="sm"
              >
                {actor === "agent" ? labels.agent : labels.person}
              </Badge>
            </div>

            <Heading
              ref={headingRef}
              as="h3"
              size="lg"
              weight="semibold"
              id={headingId}
              tabIndex={-1}
              data-setup-heading=""
              className="focus:outline-none"
            >
              {onVerifyStep ? labels.verifyTitle : step!.title}
            </Heading>

            <Text as="p" data-setup-detail="" className="whitespace-pre-line">
              {detail}
            </Text>

            {link && (
              <div>
                <Button
                  id={idFor("open")}
                  data-setup-open=""
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  iconTrailing="external-link"
                >
                  {fillLabel(labels.open, { host: link.host })}
                </Button>
              </div>
            )}

            {actor === "person" &&
              copies.map((entry, j) => {
                const key = `copy-${j}`;
                return (
                  <div
                    key={j}
                    data-setup-copy-entry={j}
                    ref={(el) => {
                      copyRefs.current[j] = el;
                    }}
                    className="flex flex-col gap-1.5"
                  >
                    <Text as="span" size="sm" weight="medium" data-setup-copy-label="">
                      {entry.label}
                    </Text>
                    <div className="flex items-start gap-2">
                      <CodeBlock
                        data-setup-copy-value=""
                        code={entry.value}
                        copyable={false}
                        wrap
                        className="min-w-0 flex-1"
                      />
                      <Button
                        id={idFor(key)}
                        data-setup-copy={j}
                        data-copy-state={feedbackFor(key)}
                        size="sm"
                        icon={feedbackFor(key) === "copied" ? "check" : "copy"}
                        onClick={() =>
                          copyText(key, entry.value, () =>
                            copyRefs.current[j]?.querySelector("[data-react-fancy-code-block-code]"),
                          )
                        }
                      >
                        {copyLabel(key, labels.copy)}
                      </Button>
                    </div>
                  </div>
                );
              })}

            {actor === "agent" && prompt != null && (
              <div className="flex flex-col gap-3">
                <div ref={promptRef} data-setup-prompt="">
                  <CodeBlock code={prompt} copyable={false} wrap />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    id={idFor("copy-prompt")}
                    data-setup-copy-prompt=""
                    data-copy-state={feedbackFor("prompt")}
                    color="brand"
                    icon={feedbackFor("prompt") === "copied" ? "check" : "copy"}
                    onClick={() =>
                      copyText("prompt", prompt, () =>
                        promptRef.current?.querySelector("[data-react-fancy-code-block-code]"),
                      )
                    }
                  >
                    {copyLabel("prompt", labels.copyPrompt)}
                  </Button>
                  <Text as="span" size="sm" color="muted" data-setup-agent-hint="">
                    {labels.agentHint}
                  </Text>
                </div>
              </div>
            )}

            {step?.done && (
              <Text as="p" size="sm" color="muted" data-setup-done="">
                <span className="font-semibold">{labels.doneWhen}</span> {step.done}
              </Text>
            )}

            {onVerifyStep && (
              <div className="flex flex-col gap-3">
                <div>
                  <Button
                    id={`${base}-verify-button`}
                    data-setup-verify=""
                    color="brand"
                    loading={verifyState.status === "running"}
                    onClick={runVerify}
                  >
                    {verifyState.status === "running" ? labels.verifying : labels.verify}
                  </Button>
                </div>
                {verifyState.status === "done" && (
                  <Callout
                    color={verifyState.result.ok ? "green" : "red"}
                    data-setup-verify-result=""
                    data-ok={verifyState.result.ok ? "true" : "false"}
                  >
                    <p className="font-semibold">
                      {verifyState.result.ok ? labels.verifyOk : labels.verifyFailed}
                    </p>
                    <p>{verifyState.result.detail}</p>
                    {verifyState.result.ok && verifyState.result.proves && (
                      <p data-setup-proves="">
                        <span className="font-semibold">{labels.proves}</span> {verifyState.result.proves}
                      </p>
                    )}
                  </Callout>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                id={`${base}-back`}
                data-setup-back=""
                variant="ghost"
                icon="arrow-left"
                disabled={current === 0}
                onClick={() => go(current - 1)}
              >
                {labels.back}
              </Button>
              {!onVerifyStep && (
                <Button
                  id={`${base}-next`}
                  data-setup-next=""
                  color={actor === "agent" ? undefined : "brand"}
                  onClick={markDone}
                >
                  {isLast ? labels.finish : labels.next}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <span
        role="status"
        aria-live="polite"
        data-setup-live=""
        className="sr-only"
        style={visuallyHidden}
      >
        {announcement}
      </span>
    </div>
  );
});

SetupWizard.displayName = "SetupWizard";

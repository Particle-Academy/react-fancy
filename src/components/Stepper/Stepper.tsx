import {
  Children,
  forwardRef,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { cn } from "../../utils/cn";
import { isRtl } from "../../utils/direction";
import { useControllableState } from "../../hooks/use-controllable-state";
import type {
  StepperProps,
  StepperStep as StepperStepData,
  StepperStepProps,
  StepperStepState,
} from "./Stepper.types";

const DEFAULT_STATE_LABELS: Record<StepperStepState, string> = {
  upcoming: "Not started",
  current: "Current",
  complete: "Completed",
  error: "Error",
};

/**
 * Declarative step. Renders nothing itself: `Stepper` reads its props as data
 * and renders it through the same path as an entry in `steps`, so the two forms
 * cannot drift apart in markup, states or handles. Its children are the step's
 * content. It must be a DIRECT child of `Stepper` (not wrapped in another
 * component) for the same reason `Breadcrumbs.Item` must.
 */
function StepperStep(_props: StepperStepProps): null {
  return null;
}
StepperStep.displayName = "StepperStep";

function stepsFromChildren(children: ReactNode): StepperStepData[] {
  const out: StepperStepData[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement<StepperStepProps>(child) || child.type !== StepperStep) continue;
    const { children: content, ...rest } = child.props;
    out.push({ ...rest, content });
  }
  return out;
}

const indicatorClass: Record<StepperStepState, string> = {
  complete:
    "border-transparent bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
  current:
    "border-2 border-zinc-900 bg-[color:var(--fancy-surface,var(--color-white))] text-zinc-900 ring-4 ring-zinc-900/10 dark:border-white dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-white dark:ring-white/15",
  upcoming:
    "border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]",
  // red-600 in both modes: white on red-500 is 3.81:1.
  error: "border-transparent bg-red-600 text-white",
};

const titleClass: Record<StepperStepState, string> = {
  complete: "font-medium text-zinc-900 dark:text-white",
  current: "font-semibold text-zinc-900 dark:text-white",
  upcoming:
    "font-medium text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]",
  error: "font-semibold text-red-700 dark:text-red-400",
};

/** The glyph differs per state, so state reads without colour: number, tick, "!". */
function Indicator({ state, index }: { state: StepperStepState; index: number }) {
  return (
    <span
      aria-hidden="true"
      data-react-fancy-stepper-indicator=""
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
        indicatorClass[state],
      )}
    >
      {state === "complete" ? <Check size={16} strokeWidth={3} /> : state === "error" ? "!" : index + 1}
    </span>
  );
}

const StepperRoot = forwardRef<HTMLOListElement, StepperProps>(
  (
    {
      steps: stepsProp,
      children,
      current: currentProp,
      defaultCurrent = 0,
      onChange,
      orientation = "vertical",
      clickable = false,
      showContent = "all",
      stateLabels,
      className,
      onKeyDown,
      ...rest
    },
    ref,
  ) => {
    const [current, setCurrent] = useControllableState(currentProp, defaultCurrent, onChange);
    const steps = stepsProp ?? stepsFromChildren(children);
    const labels = { ...DEFAULT_STATE_LABELS, ...stateLabels };
    const horizontal = orientation === "horizontal";

    // Arrow keys move focus between step buttons; Enter / Space activate them
    // natively. Focus only -- the current step changes on activation, never on
    // arrowing past it. DOM is read in the handler, never during render.
    const handleKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
      onKeyDown?.(e);
      if (!clickable || e.defaultPrevented) return;

      // Horizontal steps run right-to-left in RTL, so the arrows swap there.
      const rtl = horizontal && isRtl(e.currentTarget);
      const prevKey = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
      const nextKey = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
      if (![prevKey, nextKey, "Home", "End"].includes(e.key)) return;

      const list = e.currentTarget;
      const target = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-react-fancy-stepper-trigger]");
      if (!target || target.closest("[data-react-fancy-stepper]") !== list) return;

      // Only this stepper's own buttons: a stepper nested in step content is
      // its own list.
      const buttons = Array.from(
        list.querySelectorAll<HTMLButtonElement>("[data-react-fancy-stepper-trigger]"),
      ).filter((b) => b.closest("[data-react-fancy-stepper]") === list && !b.disabled);
      const at = buttons.indexOf(target);

      let next: HTMLButtonElement | undefined;
      if (e.key === "Home") next = buttons[0];
      else if (e.key === "End") next = buttons[buttons.length - 1];
      else if (e.key === nextKey) next = buttons[at + 1] ?? target;
      else next = at > 0 ? buttons[at - 1] : target;

      e.preventDefault();
      next?.focus();
    };

    return (
      <ol
        ref={ref}
        data-react-fancy-stepper=""
        data-orientation={orientation}
        data-current={current}
        className={cn(horizontal ? "flex items-start" : "flex flex-col", className)}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {steps.map((step, index) => {
          const derived: StepperStepState =
            index < current ? "complete" : index === current ? "current" : "upcoming";
          const state = step.state ?? derived;
          const isCurrent = index === current;
          const isLast = index === steps.length - 1;
          const showBody = step.content != null && (showContent === "all" || isCurrent);

          const headerInner = (
            <>
              <Indicator state={state} index={index} />
              {/* State in words, before the title so it is read first. A
                  sibling of the title, so the title handle reads the title. */}
              <span className="sr-only" data-react-fancy-stepper-state="">
                {labels[state]}:{" "}
              </span>
              <span data-react-fancy-stepper-title="" className={cn("text-sm", titleClass[state])}>
                {step.title}
              </span>
            </>
          );

          const headerClass = horizontal
            ? "flex flex-col items-center gap-2 text-center"
            : "flex items-center gap-x-4 text-start";

          const header = clickable ? (
            <button
              type="button"
              data-react-fancy-stepper-trigger=""
              disabled={step.disabled}
              onClick={() => {
                if (index !== current) setCurrent(index);
              }}
              className={cn(
                headerClass,
                "cursor-pointer rounded-md border-0 bg-transparent p-0",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] focus-visible:ring-offset-[color:var(--fancy-surface,var(--color-white))]",
                "dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))] dark:focus-visible:ring-offset-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {headerInner}
            </button>
          ) : (
            <div className={headerClass}>{headerInner}</div>
          );

          return (
            <li
              key={step.id ?? index}
              data-react-fancy-stepper-step=""
              data-state={state}
              data-index={index}
              data-step-id={step.id}
              data-disabled={step.disabled ? "true" : undefined}
              aria-current={isCurrent ? "step" : undefined}
              className={cn("relative", horizontal ? "min-w-0 flex-1" : !isLast && "pb-8")}
            >
              {!isLast && (
                <span
                  aria-hidden="true"
                  data-react-fancy-stepper-connector=""
                  className={cn(
                    "absolute",
                    horizontal
                      ? "top-4 start-[calc(50%+1.5rem)] h-px w-[calc(100%-3rem)]"
                      : "top-10 bottom-2 start-4 w-px -translate-x-1/2 rtl:translate-x-1/2",
                    index < current
                      ? "bg-zinc-900 dark:bg-white"
                      : "bg-[color:var(--fancy-border,var(--color-zinc-200))] dark:bg-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
                  )}
                />
              )}
              {header}
              {(step.description != null || showBody) && (
                <div className={horizontal ? "mt-1 px-2 text-center" : "ps-12"}>
                  {step.description != null && (
                    <div
                      data-react-fancy-stepper-description=""
                      className="text-sm text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
                    >
                      {step.description}
                    </div>
                  )}
                  {showBody && (
                    <div
                      data-react-fancy-stepper-content=""
                      className="mt-2 text-sm text-[color:var(--fancy-text-subtle,var(--color-zinc-600))] dark:text-[color:var(--fancy-text-subtle-dark,var(--color-zinc-400))]"
                    >
                      {step.content}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    );
  },
);

StepperRoot.displayName = "Stepper";

export const Stepper = Object.assign(StepperRoot, { Step: StepperStep });

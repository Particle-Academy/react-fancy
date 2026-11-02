import type { OlHTMLAttributes, ReactNode } from "react";

/**
 * Where a step stands. `upcoming`, `current` and `complete` are derived from
 * the step's position against `current`; `error` is only ever declared, on the
 * step itself, and overrides the derived state.
 */
export type StepperStepState = "upcoming" | "current" | "complete" | "error";

export type StepperOrientation = "vertical" | "horizontal";

/** One step, as data. Everything an agent needs to emit a stepper is JSON. */
export interface StepperStep {
  /** Stable identity, rendered as `data-step-id`. Recommended for agent handles. */
  id?: string;
  /** Step heading. */
  title: ReactNode;
  /** Short supporting line under the title. */
  description?: ReactNode;
  /** The step's body: instructions, a code sample, a screenshot. */
  content?: ReactNode;
  /**
   * Override the derived state. Usually `"error"`; the others are accepted so
   * a caller can mark a skipped step complete without moving `current`.
   */
  state?: StepperStepState;
  /** With `clickable`, renders this step's button disabled. */
  disabled?: boolean;
}

export interface StepperProps
  extends Omit<OlHTMLAttributes<HTMLOListElement>, "onChange" | "children" | "defaultValue"> {
  /** The steps as data. Wins over `children` when both are given. */
  steps?: StepperStep[];
  /** `Stepper.Step` elements, read as data. Ignored when `steps` is given. */
  children?: ReactNode;
  /** Controlled index of the current step. `steps.length` means all complete. */
  current?: number;
  /** Uncontrolled starting index. Default `0`. */
  defaultCurrent?: number;
  /** Called with the chosen step's index. Only fires when `clickable`. */
  onChange?: (index: number) => void;
  /** Default `"vertical"`. Horizontal suits short content. */
  orientation?: StepperOrientation;
  /**
   * Render each step's header as a button that makes it current. Off by
   * default: a Stepper is content, with no interactive elements at all.
   */
  clickable?: boolean;
  /** Show every step's content (default), or only the current step's. */
  showContent?: "all" | "current";
  /** Words for each state, read by screen readers. English by default. */
  stateLabels?: Partial<Record<StepperStepState, string>>;
}

/** Declarative form of a `StepperStep`; its children are the step's content. */
export interface StepperStepProps extends Omit<StepperStep, "content"> {
  children?: ReactNode;
}

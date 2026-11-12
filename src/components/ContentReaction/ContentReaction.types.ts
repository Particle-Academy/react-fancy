import type { HTMLAttributes, ReactNode } from "react";
import type { Placement } from "../../utils/types";

/** One reaction an app offers. `key` is what `value` holds. */
export interface ContentReactionItem {
  /** Stable key, stored in `value` and `counts`. */
  key: string;
  /** The emoji shown. */
  emoji: string;
  /** Accessible name and tooltip. */
  label: string;
}

/** `multi`: any number active. `single`: at most one; choosing another replaces it. */
export type ContentReactionMode = "multi" | "single";

/** What changed, passed to `onChange` beside the next value. */
export interface ContentReactionChangeMeta {
  key: string;
  /** `true` when `key` was turned on, `false` when it was turned off. */
  on: boolean;
}

/** Every word ContentReaction shows or announces, for translation. */
export interface ContentReactionLabels {
  /** Placeholder and accessible name when nothing is active. Overridden by `triggerLabel`. @default "React" */
  trigger?: string;
  /** Accessible name of the picker. @default "Reactions" */
  menu?: string;
  /**
   * Accessible name of the trigger while reactions are shown. `{trigger}` is the
   * trigger label, `{reactions}` the shown reactions ("Like 3, Love 1").
   * @default "{trigger}: {reactions}"
   */
  triggerActive?: string;
  /** An item's accessible name when `counts` is given. `{label}`, `{count}`. @default "{label} ({count})" */
  itemCount?: string;
}

/** What `renderTrigger` receives. */
export interface ContentReactionTriggerState {
  value: readonly string[];
  /** The reactions the trigger would show: active ones, or every one with a count above 0 when `counts` is given. */
  active: ContentReactionItem[];
  counts?: Record<string, number>;
  /** Keys the current user has (`mine`, defaulting to `value`). */
  mine: readonly string[];
  open: boolean;
  disabled: boolean;
  /** The trigger label ("React"). */
  label: string;
}

export interface ContentReactionProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue" | "children"> {
  /** Active reaction keys. */
  value: readonly string[];
  /** Called with the next value and what changed. The host owns the state. */
  onChange?: (next: string[], meta: ContentReactionChangeMeta) => void;
  /** The reactions offered. @default DEFAULT_CONTENT_REACTIONS */
  reactions?: readonly ContentReactionItem[];
  /** @default "multi" */
  mode?: ContentReactionMode;
  /** Aggregate counts by key, for multi-user apps. The trigger then shows every reaction with a count above 0. */
  counts?: Record<string, number>;
  /** The current user's keys, highlighted among the aggregate counts. @default value */
  mine?: readonly string[];
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Where the picker opens. Flips to the opposite side when there is no room. @default "top-start" */
  placement?: Placement;
  /** Close the picker after a select. @default false in multi mode, true in single mode */
  closeOnSelect?: boolean;
  /** Placeholder and accessible name when nothing is active. @default labels.trigger ("React") */
  triggerLabel?: string;
  /** Replaces the trigger's content. The trigger button, and its ARIA, stay. */
  renderTrigger?: (state: ContentReactionTriggerState) => ReactNode;
  /** Words, for translation. */
  labels?: ContentReactionLabels;
}

import type { CSSProperties, ReactNode } from "react";

/** Built-in paper colors. Any CSS color string is also accepted. */
export type StickyNoteColor = "yellow" | "blue" | "green" | "pink" | "violet";

export interface StickyNoteProps {
  /** Note text (controlled). */
  value?: string;
  /** Initial text when uncontrolled. */
  defaultValue?: string;
  /** Fires when the edited text is committed (on blur). */
  onChange?: (text: string) => void;
  /** Paper color — one of the presets, or any CSS color string. Default `"yellow"`. */
  color?: StickyNoteColor | (string & {});
  /** Rotation in degrees. Default `0`. */
  rotate?: number;
  /** Width as px number or any CSS length. Default `180`. */
  width?: number | string;
  /** Height as px number or any CSS length. Default `"auto"`. */
  height?: number | string;
  /** Selected styling (focus ring). */
  selected?: boolean;
  /** Allow inline editing of the text. Default `true`. */
  editable?: boolean;
  /**
   * Focus the editable region (caret at end) when it becomes editable. Lets a
   * consumer's "enter edit mode" gesture drop straight into typing. Default `false`.
   */
  autoFocus?: boolean;
  /**
   * Stable handle — also emitted as the element `id`. Lets agents and
   * selectors target a specific note without guessing the DOM.
   */
  id?: string;
  /** Static content; when provided, overrides the editable text. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

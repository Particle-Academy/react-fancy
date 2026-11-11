import type { HTMLAttributes } from "react";
import type { FancyPlatform } from "../../utils/platform";
import type { HotkeyModifier } from "./hotkey";

/** Every word HotkeyCapture shows or announces, for translation. */
export interface HotkeyCaptureLabels {
  /** Default accessible name, used when no `label` prop is given. @default "Keyboard shortcut" */
  label?: string;
  /** Shown when no shortcut is set. @default "Not set" */
  empty?: string;
  /** Shown while capturing. @default "Press the keys…" */
  prompt?: string;
  /** Announced after a capture. `{combo}` is the spoken combination. @default "Shortcut set to {combo}" */
  captured?: string;
  /** Announced when a capture is cancelled. @default "Cancelled" */
  cancelled?: string;
  /** Announced when the shortcut is cleared. @default "Shortcut cleared" */
  cleared?: string;
  /** Accessible name of the clear button. @default "Clear shortcut" */
  clear?: string;
  /**
   * Accessible name of the trigger. `{label}` is the name, `{combo}` the
   * current combination (or `empty`, or `prompt` while capturing).
   * @default "{label}: {combo}"
   */
  trigger?: string;
  /**
   * Key cap names, by modifier or by normalised key (`"space"`, `"arrowup"`).
   * Merged over the defaults: Ctrl, Alt, Shift, and Meta (`⌘` / Option on Apple).
   */
  keys?: Partial<Record<HotkeyModifier | string, string>>;
}

export interface HotkeyCaptureProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /**
   * The shortcut as a normalised string, `"ctrl+shift+k"`: modifiers in the
   * order ctrl, alt, shift, meta, then one key, lower case. `""` is unset.
   */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Called with the normalised string on a capture, or `""` when cleared. */
  onChange?: (value: string) => void;
  /** Accessible name. Defaults to `labels.label`. */
  label?: string;
  /** Show a clear button when a shortcut is set. @default true */
  clearable?: boolean;
  disabled?: boolean;
  /** Form field name: a hidden input carries the value. */
  name?: string;
  /** Which modifier names to show. Detected after mount when omitted (SSR-safe). */
  platform?: FancyPlatform;
  /** Words, for translation. */
  labels?: HotkeyCaptureLabels;
  /** Key cap size. @default "sm" */
  size?: "xs" | "sm" | "md";
}

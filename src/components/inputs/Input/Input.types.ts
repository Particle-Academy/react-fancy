import type { InputHTMLAttributes, ReactNode } from "react";
import type { InputBaseProps, InputAffixProps } from "../inputs.types";

export interface InputProps
  extends InputBaseProps,
    InputAffixProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "prefix"> {
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  onValueChange?: (value: string) => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  /**
   * Show a toggle that reveals the value, for `type="password"`.
   *
   * Ignored on other input types — a reveal on a field that is already visible
   * is a button that does nothing.
   *
   * It occupies the trailing slot, so it replaces `trailing` when both are set:
   * the two would otherwise stack in the same corner, and the reveal is the one
   * a person needs to click.
   */
  reveal?: boolean;
  /** Controlled reveal state. Omit to let the input own it. */
  revealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  /** Accessible label for the toggle. Defaults to "Show password" / "Hide password". */
  revealLabel?: string;
  hideLabel?: string;
}

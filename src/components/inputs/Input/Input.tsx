import { forwardRef, useId } from "react";
import { cn } from "../../../utils/cn";
import { useControllableState } from "../../../hooks/use-controllable-state";
import { Field } from "../Field";
import { InputWrapper } from "../InputWrapper";
import {
  dirtyClasses,
  errorClasses,
  inputBaseClasses,
  inputSizeClasses,
} from "../inputs.utils";
import { useFieldMode } from "../mode/FieldMode.context";
import { DisplayValue } from "../mode/DisplayValue";
import { useInlineEdit } from "../mode/useInlineEdit";
import type { InputProps } from "./Input.types";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      type = "text",
      size = "md",
      dirty,
      error,
      label,
      description,
      required,
      disabled,
      className,
      id,
      leading,
      trailing,
      prefix,
      suffix,
      prefixPosition,
      suffixPosition,
      mode,
      onValueChange,
      onChange,
      reveal,
      revealed,
      onRevealedChange,
      revealLabel = "Show password",
      hideLabel = "Hide password",
      ...props
    },
    ref,
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const resolvedMode = useFieldMode(mode);
    const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(resolvedMode, disabled);

    // Only meaningful on a password field: a reveal on an already-visible input
    // is a button that does nothing.
    const canReveal = reveal === true && type === "password";
    const [isRevealed, setRevealed] = useControllableState(revealed, false, onRevealedChange);
    const shown = canReveal && isRevealed;
    // The rendered type, NOT the declared one — `type` stays "password" so the
    // display-mode masking below and any caller reading props are unaffected.
    const renderedType = shown ? "text" : type;

    const input = !showControl ? (
      <DisplayValue
        size={size}
        interactive={interactive}
        onActivate={enterEdit}
        leading={leading ?? prefix}
        trailing={trailing ?? suffix}
      >
        {type === "password" ? (props.value ? "••••••" : "") : (props.value as string | undefined)}
      </DisplayValue>
    ) : (
      <InputWrapper
        prefix={prefix}
        suffix={suffix}
        prefixPosition={prefixPosition}
        suffixPosition={suffixPosition}
        size={size}
      >
        <div data-react-fancy-input="" className="relative flex items-center">
          {leading && (
            <span className="pointer-events-none absolute left-3 text-zinc-400 dark:text-zinc-500">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={renderedType}
            disabled={disabled}
            required={required}
            className={cn(
              inputBaseClasses,
              inputSizeClasses[size],
              dirtyClasses(dirty),
              errorClasses(error),
              "w-full",
              leading && "pl-9",
              (trailing || canReveal) && "pr-9",
              className,
            )}
            onChange={(e) => {
              onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            {...props}
            // Inline click-to-edit: focus on entering edit, return to the display
            // (and run the host's onBlur) when focus leaves.
            autoFocus={interactive || props.autoFocus}
            onBlur={(e) => {
              props.onBlur?.(e);
              if (interactive) exitEdit();
            }}
          />
          {canReveal ? (
            <button
              type="button"
              // type="button" is load-bearing: the default is "submit", so a
              // reveal inside a login form would submit it on every click.
              id={`${inputId}-reveal`}
              data-react-fancy-reveal=""
              onClick={() => setRevealed((v) => !v)}
              disabled={disabled}
              aria-controls={inputId}
              aria-pressed={shown}
              aria-label={shown ? hideLabel : revealLabel}
              title={shown ? hideLabel : revealLabel}
              // Not focusable by tab: the field and the submit button are the
              // path through a login form, and a reveal in between is a stop
              // most people do not want. Still reachable by click and by
              // screen readers.
              tabIndex={-1}
              className="absolute right-2 inline-flex items-center justify-center rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {shown ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          ) : (
            trailing && (
              <span className="pointer-events-none absolute right-3 text-zinc-400 dark:text-zinc-500">
                {trailing}
              </span>
            )
          )}
        </div>
      </InputWrapper>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          description={description}
          error={error}
          required={required}
          htmlFor={inputId}
          size={size}
        >
          {input}
        </Field>
      );
    }

    return input;
  },
);

Input.displayName = "Input";

/**
 * Inline SVGs rather than the Icon component: Input is the most-installed
 * primitive in the kit, and routing it through the icon registry would make
 * every consumer's password field depend on an icon set being configured.
 */
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

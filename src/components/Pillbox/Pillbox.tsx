import { forwardRef, useCallback, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { isImeComposing } from "../../utils/ime";
import { fillLabel } from "../../utils/label-template";
import { visuallyHidden } from "../../utils/visually-hidden";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Field } from "../inputs/Field";
import type { PillboxProps } from "./Pillbox.types";

export const Pillbox = forwardRef<HTMLDivElement, PillboxProps>(
  function Pillbox(
    {
      value: controlledValue,
      defaultValue = [],
      onChange,
      placeholder = "Type and press Enter...",
      maxItems,
      maxLength,
      disabled = false,
      className,
      label,
      labelHidden,
      description,
      error,
      required,
      id,
      labels,
    },
    ref,
  ) {
    const removeLabel = labels?.remove ?? "Remove {tag}";
    const addedLabel = labels?.added ?? "Added {tag}";
    const removedLabel = labels?.removed ?? "Removed {tag}";
    const remainingLabel = labels?.remaining ?? "{remaining} characters remaining";
    // Unset (or not a usable number) means no cap: 6.17.1's behaviour.
    const cap =
      typeof maxLength === "number" && Number.isFinite(maxLength) && maxLength >= 0
        ? Math.floor(maxLength)
        : undefined;

    const autoId = useId();
    const inputId = id ?? autoId;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;
    // Field shows the description only while there is no error.
    const describedBy = error ? errorId : description ? descriptionId : undefined;

    const [items, setItems] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );
    const [input, setInput] = useState("");
    const [announcement, setAnnouncement] = useState("");
    // Whether the live region currently holds a remaining-count message, so
    // leaving the last 5 characters clears it without wiping "Added …".
    const countingRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const addItem = useCallback(
      (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || items.includes(trimmed)) return;
        if (cap !== undefined && trimmed.length > cap) return;
        if (maxItems && items.length >= maxItems) return;
        setItems([...items, trimmed]);
        setInput("");
        countingRef.current = false;
        setAnnouncement(fillLabel(addedLabel, { tag: trimmed }));
      },
      [items, setItems, maxItems, cap, addedLabel],
    );

    const removeItem = useCallback(
      (index: number) => {
        const removed = items[index];
        setItems(items.filter((_, i) => i !== index));
        if (removed !== undefined) {
          countingRef.current = false;
          setAnnouncement(fillLabel(removedLabel, { tag: removed }));
        }
      },
      [items, setItems, removedLabel],
    );

    const handleInput = (raw: string) => {
      // The native maxlength stops typing, but not a value set another way
      // (some paste and IME paths, extensions, an agent writing the DOM), so
      // the cap is held here too: the text is cut at it, never accepted past it.
      const next = cap !== undefined && raw.length > cap ? raw.slice(0, cap) : raw;
      setInput(next);
      if (cap === undefined) return;
      const remaining = cap - next.length;
      if (remaining <= 5) {
        countingRef.current = true;
        setAnnouncement(fillLabel(remainingLabel, { remaining }));
      } else if (countingRef.current) {
        countingRef.current = false;
        setAnnouncement("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (isImeComposing(e)) return;
        e.preventDefault();
        addItem(input);
      } else if (e.key === "Backspace" && !input && items.length > 0) {
        removeItem(items.length - 1);
      }
    };

    const control = (
      <div
        data-react-fancy-pillbox=""
        ref={ref}
        className={cn(
          "relative flex flex-wrap items-center gap-1.5 rounded-lg border border-[color:var(--fancy-border-strong,var(--color-zinc-500))] bg-[color:var(--fancy-input,var(--color-white))] px-3 py-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[color:var(--fancy-focus,var(--color-blue-500))] focus-within:ring-2 focus-within:ring-[color:var(--fancy-focus,var(--color-blue-500))]/40 dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))] dark:bg-[color:var(--fancy-input-dark,#1e1e24)] dark:text-zinc-100 dark:focus-within:border-[color:var(--fancy-focus-dark,var(--color-blue-400))] dark:focus-within:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]/20",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] px-2 py-0.5 text-sm dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]"
          >
            {item}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(i);
                }}
                className="text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]"
                aria-label={fillLabel(removeLabel, { tag: item })}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          maxLength={cap}
          onKeyDown={handleKeyDown}
          placeholder={items.length === 0 ? placeholder : ""}
          disabled={disabled}
          // aria-required, not `required`: this box is the entry field, and it
          // is empty whenever the value is complete. A native `required` would
          // block a form whose pills are all there.
          aria-required={required ? true : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:placeholder:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]"
        />
        <span
          data-react-fancy-pillbox-status=""
          role="status"
          aria-live="polite"
          className="sr-only"
          style={visuallyHidden}
        >
          {announcement}
        </span>
      </div>
    );

    if (label || error || description) {
      return (
        <Field
          label={label}
          labelHidden={labelHidden}
          description={description}
          descriptionId={descriptionId}
          error={error}
          errorId={errorId}
          required={required}
          htmlFor={inputId}
        >
          {control}
        </Field>
      );
    }

    return control;
  },
);

Pillbox.displayName = "Pillbox";

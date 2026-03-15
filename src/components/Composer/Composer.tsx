import { forwardRef, useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { ComposerProps } from "./Composer.types";

export const Composer = forwardRef<HTMLDivElement, ComposerProps>(
  function Composer(
    {
      value: controlledValue,
      defaultValue = "",
      onChange,
      onSubmit,
      placeholder = "Type a message...",
      actions,
      disabled = false,
      className,
    },
    ref,
  ) {
    const [value, setValue] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = useCallback(() => {
      if (!value.trim() || disabled) return;
      onSubmit?.(value);
      setValue("");
      textareaRef.current?.focus();
    }, [value, disabled, onSubmit, setValue]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <div
        data-react-fancy-composer=""
        ref={ref}
        className={cn(
          "rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
          disabled && "opacity-50",
          className,
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-zinc-400"
        />
        <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-1">{actions}</div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Send
          </button>
        </div>
      </div>
    );
  },
);

Composer.displayName = "Composer";

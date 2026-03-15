import { forwardRef, useCallback, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { PillboxProps } from "./Pillbox.types";

export const Pillbox = forwardRef<HTMLDivElement, PillboxProps>(
  function Pillbox(
    {
      value: controlledValue,
      defaultValue = [],
      onChange,
      placeholder = "Type and press Enter...",
      maxItems,
      disabled = false,
      className,
    },
    ref,
  ) {
    const [items, setItems] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const addItem = useCallback(
      (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || items.includes(trimmed)) return;
        if (maxItems && items.length >= maxItems) return;
        setItems([...items, trimmed]);
        setInput("");
      },
      [items, setItems, maxItems],
    );

    const removeItem = useCallback(
      (index: number) => {
        setItems(items.filter((_, i) => i !== index));
      },
      [items, setItems],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addItem(input);
      } else if (e.key === "Backspace" && !input && items.length > 0) {
        removeItem(items.length - 1);
      }
    };

    return (
      <div
        data-react-fancy-pillbox=""
        ref={ref}
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 transition-colors focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-500",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-sm dark:bg-zinc-800"
          >
            {item}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(i);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={items.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
    );
  },
);

Pillbox.displayName = "Pillbox";

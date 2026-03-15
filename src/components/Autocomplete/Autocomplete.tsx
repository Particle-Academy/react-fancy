import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useFloatingPosition } from "../../hooks/use-floating-position";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";
import type { AutocompleteProps } from "./Autocomplete.types";

export const Autocomplete = forwardRef<HTMLInputElement, AutocompleteProps>(
  function Autocomplete(
    {
      value: controlledValue,
      defaultValue = "",
      onChange,
      onSearch,
      options,
      placeholder,
      loading = false,
      emptyMessage = "No results found.",
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
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const anchorRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const position = useFloatingPosition(anchorRef, listRef, {
      placement: "bottom-start",
      offset: 4,
      enabled: open,
    });

    const close = useCallback(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, []);

    useOutsideClick(wrapperRef, close, open);
    useEscapeKey(close, open);

    const filtered = options.filter((o) =>
      o.label.toLowerCase().includes(query.toLowerCase()),
    );

    const select = useCallback(
      (val: string) => {
        setValue(val);
        const opt = options.find((o) => o.value === val);
        setQuery(opt?.label ?? val);
        close();
      },
      [setValue, options, close],
    );

    useEffect(() => {
      onSearch?.(query);
    }, [query, onSearch]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown") {
          setOpen(true);
          return;
        }
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item && !item.disabled) select(item.value);
      }
    };

    return (
      <div data-react-fancy-autocomplete="" ref={wrapperRef} className={cn("relative", className)}>
        <input
          ref={(node) => {
            (anchorRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
        />
        {open && (
          <Portal>
            <div
              ref={listRef}
              role="listbox"
              className="fixed z-50 max-h-60 min-w-[8rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 fancy-scale-in"
              style={{
                left: position.x,
                top: position.y,
                width: anchorRef.current?.offsetWidth,
              }}
            >
              {loading ? (
                <div className="px-3 py-2 text-sm text-zinc-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-zinc-400">
                  {emptyMessage}
                </div>
              ) : (
                filtered.map((option, i) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={i === activeIndex}
                    disabled={option.disabled}
                    onClick={() => select(option.value)}
                    className={cn(
                      "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      i === activeIndex
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <HighlightMatch text={option.label} query={query} />
                  </button>
                ))
              )}
            </div>
          </Portal>
        )}
      </div>
    );
  },
);

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-zinc-900 dark:text-white">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

Autocomplete.displayName = "Autocomplete";

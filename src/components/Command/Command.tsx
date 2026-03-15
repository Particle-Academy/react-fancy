import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { CommandContext } from "./Command.context";
import { CommandInput } from "./CommandInput";
import { CommandList } from "./CommandList";
import { CommandItem } from "./CommandItem";
import { CommandGroup } from "./CommandGroup";
import { CommandEmpty } from "./CommandEmpty";
import { useFocusTrap } from "../../hooks/use-focus-trap";
import { useEscapeKey } from "../../hooks/use-escape-key";
import { useAnimation } from "../../hooks/use-animation";
import type { CommandProps } from "./Command.types";

function CommandRoot({ children, open, onClose, className }: CommandProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    onClose();
    setQuery("");
    setActiveIndex(-1);
  }, [onClose]);

  useEscapeKey(close, open);
  useFocusTrap(panelRef, open);

  // Cmd+K global shortcut is handled by the consumer
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = panelRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]',
      );
      if (!items?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(next);
        items[next]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        setActiveIndex(prev);
        items[prev]?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex]);

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-slide-up",
    exitClass: "fancy-fade-out",
  });

  const ctx = useMemo(
    () => ({ open, close, query, setQuery, activeIndex, setActiveIndex }),
    [open, close, query, activeIndex],
  );

  if (!mounted) return null;

  return (
    <CommandContext.Provider value={ctx}>
      <Portal>
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={(node) => {
              panelRef.current = node;
              (animRef as React.MutableRefObject<HTMLElement | null>).current =
                node;
            }}
            data-react-fancy-command=""
            className={cn(
              "relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900",
              animClass,
              className,
            )}
          >
            {children}
          </div>
        </div>
      </Portal>
    </CommandContext.Provider>
  );
}

export const Command = Object.assign(CommandRoot, {
  Input: CommandInput,
  List: CommandList,
  Item: CommandItem,
  Group: CommandGroup,
  Empty: CommandEmpty,
});

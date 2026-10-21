import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useControllableState } from "../../hooks/use-controllable-state";
import type { CommandProps } from "./Command.types";

function CommandRoot({
  children,
  open,
  onClose,
  className,
  shouldFilter = true,
  query: controlledQuery,
  onQueryChange,
}: CommandProps) {
  const [query, setQuery] = useControllableState(controlledQuery, "", onQueryChange);
  const [activeIndex, setActiveIndex] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

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

  /*
   * Keyboard navigation, as a combobox: the arrows move the ACTIVE item while
   * focus stays in the input (announced through aria-activedescendant), and
   * Enter picks the active item — or the first visible one when none is active.
   *
   * Focus used to move onto the items, and Enter was handled nowhere, so typing
   * a query and pressing Enter did nothing: only a focused item took Enter, as a
   * native click. Found by Genie 2's real-window test.
   */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = panelRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]',
      );
      if (!items?.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
      } else if (e.key === "Enter") {
        // A focused item takes Enter natively, as a click; picking here as well
        // would select it twice.
        if ((e.target as HTMLElement | null)?.getAttribute("role") === "option") return;
        const pick = items[activeIndex] ?? items[0];
        e.preventDefault();
        pick.click();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, activeIndex]);

  /*
   * Mark the active item and point the input at it. Done on the DOM after each
   * render because an item cannot know its own index — that is its position
   * among the options currently rendered, which filtering changes.
   */
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const items = Array.from(panel.querySelectorAll<HTMLElement>('[role="option"]'));
    const active = items[activeIndex];
    items.forEach((item) => {
      const on = item === active;
      item.setAttribute("aria-selected", on ? "true" : "false");
      if (on) item.setAttribute("data-active", "");
      else item.removeAttribute("data-active");
    });

    const input = panel.querySelector<HTMLInputElement>("[data-react-fancy-command-input] input");
    if (active?.id) input?.setAttribute("aria-activedescendant", active.id);
    else input?.removeAttribute("aria-activedescendant");
    active?.scrollIntoView?.({ block: "nearest" });
  });

  // A new query is a new list: nothing in it is active yet, so Enter picks the first match.
  const changeQuery = useCallback(
    (next: string) => {
      setQuery(next);
      setActiveIndex(-1);
    },
    [setQuery],
  );

  const { mounted, className: animClass, ref: animRef } = useAnimation({
    open,
    enterClass: "fancy-slide-up",
    exitClass: "fancy-fade-out",
  });

  const ctx = useMemo(
    () => ({
      open,
      close,
      query,
      setQuery: changeQuery,
      activeIndex,
      setActiveIndex,
      shouldFilter,
      listId,
    }),
    [open, close, query, changeQuery, activeIndex, shouldFilter, listId],
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
              "relative w-full max-w-lg overflow-hidden rounded-2xl border border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] shadow-2xl dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]",
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

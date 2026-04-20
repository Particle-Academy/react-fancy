import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import type { ContextMenuSubProps, ContextMenuSubTriggerProps, ContextMenuSubContentProps } from "./ContextMenu.types";

// ---------------------------------------------------------------------------
// Sibling coordination: parent tracks which sub is active so opening one
// immediately closes any previously-open sibling.
// ---------------------------------------------------------------------------

interface MenuGroupContextValue {
  activeSubId: string | null;
  setActiveSub: (id: string | null) => void;
}

const MenuGroupContext = createContext<MenuGroupContextValue>({
  activeSubId: null,
  setActiveSub: () => {},
});

/** Wrap sibling Subs so only one is open at a time. Placed inside Content/SubContent. */
export function MenuGroupProvider({ children }: { children: React.ReactNode }) {
  const [activeSubId, setActiveSub] = useState<string | null>(null);
  return (
    <MenuGroupContext.Provider value={{ activeSubId, setActiveSub }}>
      {children}
    </MenuGroupContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

interface SubContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  cancelClose: () => void;
}

const ContextMenuSubContext = createContext<SubContextValue>({
  open: false,
  setOpen: () => {},
  cancelClose: () => {},
});

export function ContextMenuSub({ children }: ContextMenuSubProps) {
  const id = useId();
  const { activeSubId, setActiveSub } = useContext(MenuGroupContext);
  const open = activeSubId === id;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(activeSubId);
  activeRef.current = activeSubId;

  const setOpen = useCallback((v: boolean) => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setActiveSub(v ? id : null);
  }, [id, setActiveSub]);

  const scheduleClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (activeRef.current === id) setActiveSub(null);
    }, 150);
  }, [id, setActiveSub]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      data-react-fancy-context-menu-sub=""
    >
      <ContextMenuSubContext.Provider value={{ open, setOpen, cancelClose }}>
        {children}
      </ContextMenuSubContext.Provider>
    </div>
  );
}

ContextMenuSub.displayName = "ContextMenuSub";

export function ContextMenuSubTrigger({ children, className }: ContextMenuSubTriggerProps) {
  const { open, setOpen, cancelClose } = useContext(ContextMenuSubContext);

  return (
    <button
      type="button"
      data-react-fancy-context-menu-sub-trigger=""
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
        "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
        open && "bg-zinc-100 dark:bg-zinc-800",
        className,
      )}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onClick={() => setOpen(!open)}
    >
      <span>{children}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 opacity-50">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

export function ContextMenuSubContent({ children, className }: ContextMenuSubContentProps) {
  const { open } = useContext(ContextMenuSubContext);
  const ref = useRef<HTMLDivElement>(null);
  const [flipLeft, setFlipLeft] = useState(false);

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setFlipLeft(rect.right > window.innerWidth - 8);
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      data-react-fancy-context-menu-sub-content=""
      role="menu"
      className={cn(
        "absolute top-0 z-50 min-w-[8rem] rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        flipLeft ? "right-full mr-1" : "left-full ml-1",
        className,
      )}
    >
      <MenuGroupProvider>
        {children}
      </MenuGroupProvider>
    </div>
  );
}

ContextMenuSubContent.displayName = "ContextMenuSubContent";

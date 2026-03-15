import { useState, useRef, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useOutsideClick } from "../../hooks/use-outside-click";
import { useEscapeKey } from "../../hooks/use-escape-key";

interface BreadcrumbsDropdownItem {
  label: ReactNode;
  href?: string;
  active?: boolean;
}

interface BreadcrumbsDropdownProps {
  items: BreadcrumbsDropdownItem[];
  activeLabel: ReactNode;
}

export function BreadcrumbsDropdown({ items, activeLabel }: BreadcrumbsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  return (
    <div ref={ref} data-react-fancy-breadcrumbs-dropdown="" className="relative flex md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-800"
      >
        {activeLabel}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[180px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {items.map((item, i) => {
            const cls = cn(
              "block w-full px-3 py-1.5 text-left text-sm",
              item.active
                ? "font-medium text-zinc-900 dark:text-white"
                : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
            );

            if (item.href && !item.active) {
              return (
                <a key={i} href={item.href} className={cls} onClick={() => setOpen(false)}>
                  {item.label}
                </a>
              );
            }

            return (
              <span key={i} className={cls}>
                {item.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

BreadcrumbsDropdown.displayName = "BreadcrumbsDropdown";

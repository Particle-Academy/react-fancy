import { cn } from "../../utils/cn";
import type { MenuGroupProps } from "./Menu.types";

export function MenuGroup({ children, label, className }: MenuGroupProps) {
  return (
    <div data-react-fancy-menu-group="" className={cn("py-1", className)}>
      {label && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--fancy-text-faint,var(--color-zinc-400))] dark:text-[color:var(--fancy-text-faint-dark,var(--color-zinc-500))]">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

MenuGroup.displayName = "MenuGroup";

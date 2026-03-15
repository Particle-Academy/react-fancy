import { cn } from "../../utils/cn";
import { MobileMenuContext } from "./MobileMenu.context";
import type { MobileMenuBottomBarProps } from "./MobileMenu.types";

export function MobileMenuBottomBar({ children, className }: MobileMenuBottomBarProps) {
  return (
    <MobileMenuContext.Provider value={{ variant: "bottom-bar" }}>
      <nav
        data-react-fancy-mobile-menu-bottom-bar=""
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95",
          "pb-[env(safe-area-inset-bottom)]",
          className,
        )}
      >
        {children}
      </nav>
    </MobileMenuContext.Provider>
  );
}

MobileMenuBottomBar.displayName = "MobileMenuBottomBar";

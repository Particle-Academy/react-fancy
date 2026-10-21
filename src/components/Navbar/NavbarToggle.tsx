import { Menu, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useNavbar } from "./Navbar.context";
import type { NavbarToggleProps } from "./Navbar.types";

export function NavbarToggle({ className }: NavbarToggleProps) {
  const { mobileOpen, setMobileOpen } = useNavbar();

  return (
    <button
      data-react-fancy-navbar-toggle=""
      type="button"
      onClick={() => setMobileOpen(!mobileOpen)}
      className={cn(
        "inline-flex items-center rounded-lg p-2 text-zinc-500 hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] md:hidden dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
        className,
      )}
      aria-label="Toggle navigation"
      aria-expanded={mobileOpen}
    >
      {mobileOpen ? (
        <X size={20} />
      ) : (
        <Menu size={20} />
      )}
    </button>
  );
}

NavbarToggle.displayName = "NavbarToggle";

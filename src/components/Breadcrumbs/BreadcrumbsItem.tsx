import { cn } from "../../utils/cn";
import type { BreadcrumbsItemProps } from "./Breadcrumbs.types";

export function BreadcrumbsItem({
  children,
  href,
  active = false,
  className,
}: BreadcrumbsItemProps) {
  const baseClass = cn(
    "text-sm",
    active
      ? "font-medium text-zinc-900 dark:text-white"
      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
    className,
  );

  if (href && !active) {
    return (
      <a data-react-fancy-breadcrumbs-item="" href={href} className={baseClass}>
        {children}
      </a>
    );
  }

  return (
    <span data-react-fancy-breadcrumbs-item="" className={baseClass} aria-current={active ? "page" : undefined}>
      {children}
    </span>
  );
}

BreadcrumbsItem.displayName = "BreadcrumbsItem";

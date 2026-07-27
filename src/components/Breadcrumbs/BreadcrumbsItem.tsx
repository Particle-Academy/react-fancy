import { cn } from "../../utils/cn";
import type { BreadcrumbsItemProps } from "./Breadcrumbs.types";

export function BreadcrumbsItem({
  children,
  href,
  active = false,
  onClick,
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

  // A crumb that navigates through a callback rather than a URL. Controlled
  // components own their navigation and have no href to give — a repository
  // browser walking directories, a wizard stepping back — and until this
  // existed the only way to make such a crumb clickable was to nest a button
  // inside the span below, which is interactive content inside a non-
  // interactive element.
  if (onClick && !active) {
    return (
      <button
        type="button"
        data-react-fancy-breadcrumbs-item=""
        onClick={onClick}
        className={cn(baseClass, "cursor-pointer border-0 bg-transparent p-0")}
      >
        {children}
      </button>
    );
  }

  return (
    <span data-react-fancy-breadcrumbs-item="" className={baseClass} aria-current={active ? "page" : undefined}>
      {children}
    </span>
  );
}

BreadcrumbsItem.displayName = "BreadcrumbsItem";

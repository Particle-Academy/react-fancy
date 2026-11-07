import { Children, Fragment, useState, type ReactElement } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../utils/cn";
import { BreadcrumbsItem } from "./BreadcrumbsItem";
import { BreadcrumbsDropdown } from "./BreadcrumbsDropdown";
import type { BreadcrumbsProps, BreadcrumbsItemProps } from "./Breadcrumbs.types";

function BreadcrumbsRoot({
  children,
  separator,
  shrink,
  className,
}: BreadcrumbsProps) {
  const items = Children.toArray(children);
  const [expanded, setExpanded] = useState(false);

  const sep = separator ?? (
    <ChevronRight size={12} aria-hidden="true" className="text-[color:var(--fancy-text-faint,var(--color-zinc-400))] dark:text-[color:var(--fancy-text-faint-dark,var(--color-zinc-500))] rtl:-scale-x-100" />
  );

  const lastItem = items[items.length - 1];

  // Extract info from children for mobile dropdown
  const dropdownItems = items.map((child) => {
    const el = child as ReactElement<BreadcrumbsItemProps>;
    return {
      label: el.props?.children,
      href: el.props?.href,
      as: el.props?.as,
      onClick: el.props?.onClick,
      active: el.props?.active,
      // Only `title` crosses into the menu. It is the full text of a crumb the
      // consumer truncated, and the narrow menu is where labels get cut. Other
      // attributes stay on the trail: both trails are in the DOM at once (CSS
      // hides one), so an `id` or a `data-*` handle would be duplicated.
      title: el.props?.title,
    };
  });

  const activeLabel = dropdownItems[dropdownItems.length - 1]?.label ?? "Menu";

  const showShrunk = shrink && !expanded && items.length > 1;

  return (
    <>
      {/* Desktop trail */}
      <nav
        data-react-fancy-breadcrumbs=""
        aria-label="Breadcrumb"
        className={cn("hidden items-center gap-2 md:flex", className)}
        onMouseLeave={() => shrink && setExpanded(false)}
      >
        {showShrunk ? (
          <>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              onMouseEnter={() => setExpanded(true)}
              className="text-sm text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] hover:text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:hover:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]"
            >
              ...
            </button>
            <span aria-hidden="true">{sep}</span>
            {lastItem}
          </>
        ) : (
          items.map((child, i) => (
            <Fragment key={i}>
              {i > 0 && <span aria-hidden="true">{sep}</span>}
              {child}
            </Fragment>
          ))
        )}
      </nav>

      {/* Mobile dropdown */}
      <BreadcrumbsDropdown items={dropdownItems} activeLabel={activeLabel} />
    </>
  );
}

export const Breadcrumbs = Object.assign(BreadcrumbsRoot, {
  Item: BreadcrumbsItem,
});

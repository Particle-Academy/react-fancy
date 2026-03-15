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
    <ChevronRight size={12} className="text-zinc-400" />
  );

  const lastItem = items[items.length - 1];

  // Extract info from children for mobile dropdown
  const dropdownItems = items.map((child) => {
    const el = child as ReactElement<BreadcrumbsItemProps>;
    return {
      label: el.props?.children,
      href: el.props?.href,
      active: el.props?.active,
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
              className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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

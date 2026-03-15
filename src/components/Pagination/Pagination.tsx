import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { cn } from "../../utils/cn";
import type { PaginationProps } from "./Pagination.types";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function getPages(
  page: number,
  totalPages: number,
  siblings: number,
): (number | "ellipsis")[] {
  const totalSlots = siblings * 2 + 5; // siblings + boundaries + ellipses + current
  if (totalPages <= totalSlots) return range(1, totalPages);

  const leftSibling = Math.max(page - siblings, 1);
  const rightSibling = Math.min(page + siblings, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = range(1, 3 + siblings * 2);
    return [...leftRange, "ellipsis", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = range(totalPages - (2 + siblings * 2), totalPages);
    return [1, "ellipsis", ...rightRange];
  }

  return [
    1,
    "ellipsis",
    ...range(leftSibling, rightSibling),
    "ellipsis",
    totalPages,
  ];
}

export function Pagination({
  page,
  onPageChange,
  totalPages,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const pages = useMemo(
    () => getPages(page, totalPages, siblingCount),
    [page, totalPages, siblingCount],
  );

  if (totalPages <= 1) return null;

  const btnBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border text-sm transition-colors";
  const btnDefault =
    "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";
  const btnActive =
    "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900";
  const btnDisabled = "cursor-not-allowed opacity-50";

  return (
    <nav aria-label="Pagination" data-react-fancy-pagination="" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(btnBase, btnDefault, page <= 1 && btnDisabled, "px-2")}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`e-${i}`} className="px-1 text-zinc-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              btnBase,
              p === page ? btnActive : btnDefault,
              "px-2",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(
          btnBase,
          btnDefault,
          page >= totalPages && btnDisabled,
          "px-2",
        )}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

Pagination.displayName = "Pagination";

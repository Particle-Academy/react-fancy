import { cn } from "../../utils/cn";
import type { TableFootProps } from "./Table.types";

/**
 * The table's footer rows (`<tfoot>`): totals, summaries. `Table` places it
 * inside the `<table>`, after the body, wherever it is written.
 */
export function TableFoot({ children, className, ...rest }: TableFootProps) {
  return (
    <tfoot
      {...rest}
      data-react-fancy-table-foot=""
      className={cn("border-t border-[color:var(--fancy-border,var(--color-zinc-200))] font-medium dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]", className)}
    >
      {children}
    </tfoot>
  );
}

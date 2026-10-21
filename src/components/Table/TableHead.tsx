import { cn } from "../../utils/cn";
import type { TableHeadProps } from "./Table.types";

export function TableHead({ children, className, ...rest }: TableHeadProps) {
  return (
    <thead
      {...rest}
      data-react-fancy-table-head=""
      className={cn("border-b border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]", className)}
    >
      {children}
    </thead>
  );
}

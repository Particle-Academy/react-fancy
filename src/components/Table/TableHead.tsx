import { cn } from "../../utils/cn";
import type { TableHeadProps } from "./Table.types";

export function TableHead({ children, className, ...rest }: TableHeadProps) {
  return (
    <thead
      {...rest}
      data-react-fancy-table-head=""
      className={cn("border-b border-zinc-200 dark:border-zinc-700", className)}
    >
      {children}
    </thead>
  );
}

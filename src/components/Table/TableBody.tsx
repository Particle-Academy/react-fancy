import { cn } from "../../utils/cn";
import type { TableBodyProps } from "./Table.types";

export function TableBody({ children, className, ...rest }: TableBodyProps) {
  return (
    <tbody
      {...rest}
      data-react-fancy-table-body=""
      className={cn("divide-y divide-zinc-100 dark:divide-zinc-800", className)}
    >
      {children}
    </tbody>
  );
}

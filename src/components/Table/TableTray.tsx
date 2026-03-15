import { cn } from "../../utils/cn";
import type { TableTrayProps } from "./Table.types";

export function TableTray({ children, className }: TableTrayProps) {
  return (
    <div data-react-fancy-table-tray="" className={cn("flex items-center justify-between px-4 py-3", className)}>
      {children}
    </div>
  );
}

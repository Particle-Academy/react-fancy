import { cn } from "../../utils/cn";
import type { DiagramFieldProps } from "./Diagram.types";

export function DiagramField({
  name,
  type,
  primary = false,
  foreign = false,
  nullable = false,
  className,
}: DiagramFieldProps) {
  return (
    <div
      data-react-fancy-diagram-field=""
      className={cn(
        "flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-1 text-sm dark:border-zinc-700",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {primary && (
          <span className="inline-flex items-center rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            PK
          </span>
        )}
        {foreign && (
          <span className="inline-flex items-center rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            FK
          </span>
        )}
        <span className="text-zinc-800 dark:text-zinc-200">{name}</span>
      </div>
      {type && (
        <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
          {type}
          {nullable && "?"}
        </span>
      )}
    </div>
  );
}

DiagramField.displayName = "DiagramField";

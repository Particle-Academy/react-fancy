import { forwardRef, useState } from "react";
import { cn } from "../../utils/cn";
import type { TimeGridProps, TimeGridTone } from "./TimeGrid.types";

const TONE_CLASSES: Record<TimeGridTone, string> = {
  violet: "bg-violet-500 hover:bg-violet-600",
  emerald: "bg-emerald-500 hover:bg-emerald-600",
  sky: "bg-sky-500 hover:bg-sky-600",
  rose: "bg-rose-500 hover:bg-rose-600",
  amber: "bg-amber-500 hover:bg-amber-600",
  indigo: "bg-indigo-500 hover:bg-indigo-600",
  blue: "bg-blue-500 hover:bg-blue-600",
  zinc: "bg-zinc-500 hover:bg-zinc-600",
};

const OFF_CLASSES =
  "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700";

export const TimeGrid = forwardRef<HTMLDivElement, TimeGridProps>(
  (
    {
      rows,
      cols,
      value,
      onChange,
      toneOn = "violet",
      cellWidth = 20,
      cellHeight = 16,
      sparseColLabels = true,
      toggleStripsOnHeaderClick = true,
      ariaCell,
      cellId,
      className,
    },
    ref,
  ) => {
    const [drag, setDrag] = useState<boolean | null>(null);

    const setCell = (r: number, c: number, v: boolean) => {
      if (value[r]?.[c] === v) return;
      const next = value.map((row) => row.slice());
      next[r][c] = v;
      onChange(next);
    };

    const toggleRow = (r: number) => {
      if (!toggleStripsOnHeaderClick) return;
      const all = value[r].every(Boolean);
      const next = value.map((row) => row.slice());
      for (let c = 0; c < cols.length; c++) next[r][c] = !all;
      onChange(next);
    };

    const toggleCol = (c: number) => {
      if (!toggleStripsOnHeaderClick) return;
      const all = value.every((row) => row[c]);
      const next = value.map((row) => row.slice());
      for (let r = 0; r < rows.length; r++) next[r][c] = !all;
      onChange(next);
    };

    const colStep = Math.max(1, Math.floor(cols.length / 6));
    const onTone = TONE_CLASSES[toneOn];

    return (
      <div
        ref={ref}
        data-react-fancy-timegrid=""
        className={cn(
          "select-none overflow-x-auto",
          className,
        )}
        onMouseLeave={() => setDrag(null)}
        onMouseUp={() => setDrag(null)}
      >
        <table className="text-[10px]">
          <thead>
            <tr>
              <th />
              {cols.map((label, c) => (
                <th
                  key={c}
                  onClick={() => toggleCol(c)}
                  style={{ width: cellWidth }}
                  data-react-fancy-timegrid-col={c}
                  className={cn(
                    "text-zinc-400",
                    toggleStripsOnHeaderClick &&
                      "cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200",
                  )}
                >
                  {sparseColLabels ? (c % colStep === 0 ? label : "") : label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((label, r) => (
              <tr key={r}>
                <th
                  onClick={() => toggleRow(r)}
                  data-react-fancy-timegrid-row={r}
                  className={cn(
                    "pr-1 text-right font-medium text-zinc-500",
                    toggleStripsOnHeaderClick &&
                      "cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200",
                  )}
                >
                  {label}
                </th>
                {cols.map((_, c) => {
                  const on = value[r]?.[c] ?? false;
                  return (
                    <td key={c} className="p-px">
                      <button
                        type="button"
                        onMouseDown={() => {
                          const v = !on;
                          setDrag(v);
                          setCell(r, c, v);
                        }}
                        onMouseEnter={() => drag !== null && setCell(r, c, drag)}
                        style={{ width: cellWidth, height: cellHeight }}
                        data-react-fancy-timegrid-cell={
                          cellId ? cellId(r, c) : `${r}:${c}`
                        }
                        aria-pressed={on}
                        aria-label={
                          ariaCell
                            ? ariaCell(r, c, on)
                            : `${rows[r]} ${cols[c]} ${on ? "on" : "off"}`
                        }
                        className={cn(
                          "block rounded-sm transition",
                          on ? onTone : OFF_CLASSES,
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

TimeGrid.displayName = "TimeGrid";

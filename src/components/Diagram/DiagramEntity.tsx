import { cn } from "../../utils/cn";
import { Canvas } from "../Canvas/Canvas";
import { DiagramField } from "./DiagramField";
import type { DiagramEntityProps, DiagramFieldProps } from "./Diagram.types";
import { Children, type ReactElement } from "react";

export function DiagramEntity({
  children,
  id,
  name,
  x = 0,
  y = 0,
  color = "bg-blue-600 dark:bg-blue-500",
  className,
}: DiagramEntityProps) {
  // Extract DiagramField children for rendering
  const fields: ReactElement<DiagramFieldProps>[] = [];
  const other: ReactElement[] = [];

  Children.forEach(children, (child) => {
    const el = child as ReactElement;
    if (!el || !el.type) return;
    if (el.type === DiagramField) {
      fields.push(el as ReactElement<DiagramFieldProps>);
    } else {
      other.push(el);
    }
  });

  return (
    <Canvas.Node id={id} x={x} y={y}>
      <div
        data-react-fancy-diagram-entity=""
        data-entity-id={id}
        className={cn(
          "w-[220px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800",
          className,
        )}
      >
        <div
          className={cn(
            "px-3 py-2 text-sm font-semibold text-white",
            color,
          )}
        >
          {name}
        </div>
        {fields.length > 0 && <div>{fields}</div>}
        {other}
      </div>
    </Canvas.Node>
  );
}

DiagramEntity.displayName = "DiagramEntity";

import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { Color } from "../../utils/types";
import type { ColorPickerProps } from "./ColorPicker.types";

const DEFAULT_COLORS: Color[] = [
  "zinc",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const COLOR_MAP: Record<Color, string> = {
  zinc: "bg-zinc-500",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
};

export function ColorPicker({
  value,
  defaultValue = "blue",
  onChange,
  colors = DEFAULT_COLORS,
  size = "md",
  className,
}: ColorPickerProps) {
  const [selected, setSelected] = useControllableState(
    value,
    defaultValue,
    onChange,
  );

  const swatchSize = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" }[size];

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            swatchSize,
            "rounded-full transition-transform",
            COLOR_MAP[color],
            selected === color
              ? "ring-2 ring-offset-2 ring-current scale-110"
              : "hover:scale-110",
          )}
          onClick={() => setSelected(color)}
          aria-label={color}
          aria-pressed={selected === color}
        />
      ))}
    </div>
  );
}

import type { Size } from "../../utils/types";
import type { InputOption } from "./inputs.types";

export const inputSizeClasses: Record<Size, string> = {
  xs: "px-2 py-1 text-xs rounded",
  sm: "px-2.5 py-1.5 text-sm rounded-md",
  md: "px-3 py-2 text-sm rounded-lg",
  lg: "px-4 py-2.5 text-base rounded-lg",
  xl: "px-5 py-3 text-lg rounded-xl",
};

export const labelSizeClasses: Record<Size, string> = {
  xs: "text-xs",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-sm",
  xl: "text-base",
};

export function dirtyClasses(dirty?: boolean): string {
  return dirty ? "border-l-[3px] border-l-amber-400" : "";
}

export function dirtyRingClasses(dirty?: boolean): string {
  return dirty ? "ring-2 ring-amber-400/50" : "";
}

export function errorClasses(error?: string): string {
  return error ? "border-red-500 focus:ring-red-500" : "";
}

export const inputBaseClasses =
  "border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";

export function resolveOption<V = string>(
  option: InputOption<V>,
): { value: V; label: string; disabled?: boolean; description?: string } {
  if (typeof option === "string") {
    return { value: option as unknown as V, label: option };
  }
  return option;
}

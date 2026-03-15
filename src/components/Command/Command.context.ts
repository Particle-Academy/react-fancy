import { createContext, useContext } from "react";
import type { CommandContextValue } from "./Command.types";

export const CommandContext = createContext<CommandContextValue | null>(null);

export function useCommand(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error(
      "Command compound components must be used within <Command>",
    );
  }
  return ctx;
}

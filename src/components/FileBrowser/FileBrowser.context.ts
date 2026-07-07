import { createContext, useContext } from "react";
import type { FileBrowserContextValue } from "./FileBrowser.types";

export const FileBrowserContext = createContext<FileBrowserContextValue | null>(null);

export function useFileBrowser(): FileBrowserContextValue {
  const ctx = useContext(FileBrowserContext);
  if (!ctx) {
    throw new Error("useFileBrowser must be used within a <FileBrowser> component");
  }
  return ctx;
}

import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { RenderExtension } from "../ContentRenderer/extensions";

export interface EditorContextValue {
  contentRef: RefObject<HTMLDivElement | null>;
  exec: (command: string, arg?: string) => void;
  insertText: (text: string) => void;
  wrapSelection: (before: string, after: string) => void;
  outputFormat: "html" | "markdown";
  lineSpacing: number;
  placeholder?: string;
  /** Merged render extensions (global + instance). */
  extensions: RenderExtension[];
  /** Initial HTML content to load into the editor on mount */
  _initialHtml: string;
  /** @internal Called by EditorContent on input events */
  _onInput: () => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an <Editor> component");
  }
  return ctx;
}

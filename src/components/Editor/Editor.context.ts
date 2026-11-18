import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { RenderExtension } from "../ContentRenderer/extensions";
import type { EditorToken } from "./editor.tokens";

export interface EditorContextValue {
  contentRef: RefObject<HTMLDivElement | null>;
  exec: (command: string, arg?: string) => void;
  insertText: (text: string) => void;
  wrapSelection: (before: string, after: string) => void;
  /**
   * Insert an atomic inline token (a chip) at the caret, or at the end when the
   * caret is not in the editor. The caret steps over a chip in one arrow press
   * and Backspace / Delete remove it whole. Emits through `onChange`.
   */
  insertToken: (token: EditorToken) => void;
  outputFormat: "html" | "markdown";
  lineSpacing: number;
  placeholder?: string;
  /** Merged render extensions (global + instance). */
  extensions: RenderExtension[];
  /** Whether the raw-source view (textarea) is showing instead of the rich-text surface. */
  showSource: boolean;
  /** Toggle/set the raw-source view. */
  setShowSource: (showSource: boolean) => void;
  /** Whether the editor currently covers the viewport. */
  fullScreen: boolean;
  /** Enter/leave full screen. Goes through `onFullScreenChange` when controlled. */
  setFullScreen: (fullScreen: boolean) => void;
  /** Initial HTML content to load into the editor on mount */
  _initialHtml: string;
  /** @internal Called by EditorContent on input events */
  _onInput: () => void;
  /** @internal Raw source value (`value` in `outputFormat`), for the source textarea. */
  _sourceValue: string;
  /** @internal Commit an edit made directly in the source textarea. */
  _onSourceInput: (value: string) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditor must be used within an <Editor> component");
  }
  return ctx;
}

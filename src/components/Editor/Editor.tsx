import { useCallback, useMemo, useRef } from "react";
import { marked } from "marked";
import { cn } from "../../utils/cn";
import { sanitizeHtml } from "../../utils/sanitize";
import { useControllableState } from "../../hooks";
import { EditorContext } from "./Editor.context";
import { EditorToolbar } from "./EditorToolbar";
import { EditorToolbarSeparator } from "./EditorToolbarSeparator";
import { EditorContent } from "./EditorContent";
import { htmlToMarkdown, detectFormat } from "./editor.utils";
import { mergeExtensions } from "../ContentRenderer/extensions";
import type { EditorProps } from "./Editor.types";

function toHtml(value: string, outputFormat: "html" | "markdown", unsafe: boolean): string {
  if (!value) return "";
  const raw = (() => {
    if (outputFormat === "html") return value;
    // Markdown value — convert to HTML for contentEditable
    const format = detectFormat(value);
    if (format === "html") return value;
    return (marked.parse(value, { async: false }) as string).trim();
  })();
  return unsafe ? raw : sanitizeHtml(raw);
}

function EditorRoot({
  children,
  className,
  value: controlledValue,
  defaultValue = "",
  onChange,
  outputFormat = "html",
  lineSpacing = 1.6,
  placeholder,
  extensions: instanceExtensions,
  unsafe = false,
}: EditorProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [, setValue] = useControllableState(controlledValue, defaultValue, onChange);

  const initialHtml = useMemo(
    () => toHtml(controlledValue ?? defaultValue, outputFormat, unsafe),
    // Only compute once on mount — don't re-run when value changes from user input
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const extensions = useMemo(
    () => mergeExtensions(instanceExtensions),
    [instanceExtensions],
  );

  const getOutputValue = useCallback(
    (html: string): string => {
      return outputFormat === "markdown" ? htmlToMarkdown(html) : html;
    },
    [outputFormat],
  );

  const handleInput = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    setValue(getOutputValue(el.innerHTML));
  }, [setValue, getOutputValue]);

  const exec = useCallback(
    (command: string, arg?: string) => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      document.execCommand(command, false, arg);
      handleInput();
    },
    [handleInput],
  );

  const insertText = useCallback(
    (text: string) => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      document.execCommand("insertText", false, text);
      handleInput();
    },
    [handleInput],
  );

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const selectedText = range.toString();
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      document.execCommand("insertText", false, `${before}${selectedText}${after}`);
      handleInput();
    },
    [handleInput],
  );

  const contextValue = {
    contentRef,
    exec,
    insertText,
    wrapSelection,
    outputFormat,
    lineSpacing,
    placeholder,
    extensions,
    _initialHtml: initialHtml,
    _onInput: handleInput,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      <div
        data-react-fancy-editor=""
        className={cn(
          "overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
          className,
        )}
      >
        {children}
      </div>
    </EditorContext.Provider>
  );
}

const ToolbarWithSeparator = Object.assign(EditorToolbar, {
  Separator: EditorToolbarSeparator,
});

export const Editor = Object.assign(EditorRoot, {
  Toolbar: ToolbarWithSeparator,
  Content: EditorContent,
});

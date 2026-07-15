import { useCallback, useMemo, useRef } from "react";
import { marked } from "marked";
import { cn } from "../../utils/cn";
import { sanitizeHtml } from "../../utils/sanitize";
import { useControllableState } from "../../hooks";
import { EditorContext } from "./Editor.context";
import { EditorToolbar } from "./EditorToolbar";
import { EditorToolbarSeparator } from "./EditorToolbarSeparator";
import { EditorSourceToggle } from "./EditorSourceToggle";
import { EditorContent } from "./EditorContent";
import { htmlToMarkdown, detectFormat } from "./editor.utils";
import { mergeExtensions } from "../ContentRenderer/extensions";
import { ContentRenderer } from "../ContentRenderer/ContentRenderer";
import { useFieldMode } from "../inputs/mode/FieldMode.context";
import type { EditorProps } from "./Editor.types";

function toHtml(
  value: string,
  outputFormat: "html" | "markdown",
  unsafe: boolean,
  valueFormat: "markdown" | "html" | "auto" = "auto",
): string {
  if (!value) return "";
  const raw = (() => {
    // An explicit valueFormat is authoritative — the sniff misclassifies
    // markdown that merely MENTIONS HTML-ish snippets (`<code>`, `<table`),
    // collapsing it into an innerHTML wall of text (#10).
    const format =
      valueFormat !== "auto"
        ? valueFormat
        : outputFormat === "html"
          ? "html"
          : detectFormat(value);
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
  valueFormat = "auto",
  lineSpacing = 1.6,
  placeholder,
  mode: modeProp,
  extensions: instanceExtensions,
  unsafe = false,
  showSource: showSourceProp,
  defaultShowSource = false,
  onShowSourceChange,
}: EditorProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useControllableState(controlledValue, defaultValue, onChange);
  const [showSource, setShowSource] = useControllableState(
    showSourceProp,
    defaultShowSource,
    onShowSourceChange,
  );
  // View/edit mode — same resolution as the inputs: prop → <Form> context → "edit".
  const mode = useFieldMode(modeProp);
  const isView = mode === "view";

  const initialHtml = useMemo(
    () => toHtml(value, outputFormat, unsafe, valueFormat),
    // Seed the contentEditable from the LIVE value when (re)entering edit mode —
    // and when returning from the raw-source view, which may have rewritten the
    // value out from under the rich-text surface. EditorContent re-seeds when
    // this recomputes; it does NOT re-run on every keystroke (`value` is not a
    // dep, so typing in the rich-text surface never re-seeds it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isView, outputFormat, unsafe, valueFormat, showSource],
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

  // The source textarea edits `value` directly — it is already the canonical
  // source in `outputFormat` (html or markdown), so no conversion round-trip.
  const handleSourceInput = useCallback(
    (next: string) => {
      setValue(next);
    },
    [setValue],
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
    showSource,
    setShowSource,
    _initialHtml: initialHtml,
    _onInput: handleInput,
    _sourceValue: value,
    _onSourceInput: handleSourceInput,
  };

  // View mode — render the value read-only through ContentRenderer, matching the
  // editor's own format (markdown/html), instead of the editable toolbar+content
  // tree. Driven by `mode` / a `<Form mode="view">`, exactly like the inputs.
  if (isView) {
    return (
      <div
        data-react-fancy-editor=""
        data-mode="view"
        className={cn(
          "overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
          className,
        )}
      >
        <ContentRenderer
          value={value}
          format={valueFormat !== "auto" ? valueFormat : outputFormat}
          lineSpacing={lineSpacing}
          extensions={instanceExtensions}
          unsafe={unsafe}
          className="px-4 py-3"
        />
      </div>
    );
  }

  return (
    <EditorContext.Provider value={contextValue}>
      <div
        data-react-fancy-editor=""
        data-mode="edit"
        className={cn(
          "flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
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
  SourceToggle: EditorSourceToggle,
});

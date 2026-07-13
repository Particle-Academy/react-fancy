import { useEffect, useMemo, useRef } from "react";
import { cn } from "../../utils/cn";
import { useEditor } from "./Editor.context";
import { proseClasses, extensionEditorClasses } from "./editor.utils";
import type { EditorContentProps } from "./Editor.types";

export function EditorContent({ className, maxHeight, sourceClassName }: EditorContentProps) {
  const {
    contentRef,
    lineSpacing,
    placeholder,
    extensions,
    outputFormat,
    showSource,
    _initialHtml,
    _onInput,
    _sourceValue,
    _onSourceInput,
  } = useEditor();
  // Tracks which seed HTML is currently in the contentEditable. Seeding on the
  // seed VALUE (not a one-shot boolean) re-seeds when the source view rewrites
  // `value`, while still never re-seeding on plain keystrokes — typing leaves
  // `_initialHtml` untouched, so `seededHtml.current === _initialHtml` holds.
  const seededHtml = useRef<string | null>(null);

  useEffect(() => {
    // Source view replaces the contentEditable in the tree, so it unmounts.
    // Forget what we seeded — the div that returns is a fresh, empty one and
    // must always be re-seeded, even if `value` was left untouched.
    if (showSource) {
      seededHtml.current = null;
      return;
    }
    const el = contentRef.current;
    if (el && seededHtml.current !== _initialHtml) {
      el.innerHTML = _initialHtml;
      seededHtml.current = _initialHtml;
    }
  }, [contentRef, _initialHtml, showSource]);

  const extClasses = useMemo(
    () => extensionEditorClasses(extensions),
    [extensions],
  );

  if (showSource) {
    return (
      <textarea
        data-react-fancy-editor-source=""
        value={_sourceValue}
        onChange={(e) => _onSourceInput(e.target.value)}
        spellCheck={false}
        placeholder={placeholder}
        aria-label={`${outputFormat === "markdown" ? "Markdown" : "HTML"} source`}
        style={{
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
        className={cn(
          "block min-h-[120px] w-full resize-y px-4 py-3 font-mono text-xs leading-relaxed outline-none",
          "bg-zinc-50 text-zinc-800 focus:outline-none dark:bg-zinc-900 dark:text-zinc-200",
          "placeholder:text-zinc-400",
          maxHeight && "overflow-y-auto",
          sourceClassName,
        )}
      />
    );
  }

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      data-react-fancy-editor-content=""
      data-placeholder={placeholder}
      onInput={_onInput}
      style={{
        lineHeight: lineSpacing,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
      }}
      className={cn(
        "min-h-[120px] px-4 py-3 text-sm outline-none",
        "focus:outline-none",
        maxHeight && "overflow-y-auto",
        proseClasses,
        extClasses,
        "empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none",
        className,
      )}
    />
  );
}

EditorContent.displayName = "EditorContent";

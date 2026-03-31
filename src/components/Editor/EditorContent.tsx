import { useEffect, useMemo, useRef } from "react";
import { cn } from "../../utils/cn";
import { useEditor } from "./Editor.context";
import { proseClasses, extensionEditorClasses } from "./editor.utils";
import type { EditorContentProps } from "./Editor.types";

export function EditorContent({ className }: EditorContentProps) {
  const { contentRef, lineSpacing, placeholder, extensions, _initialHtml, _onInput } = useEditor();
  const initialized = useRef(false);

  useEffect(() => {
    const el = contentRef.current;
    if (el && _initialHtml && !initialized.current) {
      el.innerHTML = _initialHtml;
      initialized.current = true;
    }
  }, [contentRef, _initialHtml]);

  const extClasses = useMemo(
    () => extensionEditorClasses(extensions),
    [extensions],
  );

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      data-react-fancy-editor-content=""
      data-placeholder={placeholder}
      onInput={_onInput}
      style={{ lineHeight: lineSpacing }}
      className={cn(
        "min-h-[120px] px-4 py-3 text-sm outline-none",
        "focus:outline-none",
        proseClasses,
        extClasses,
        "empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none",
        className,
      )}
    />
  );
}

EditorContent.displayName = "EditorContent";

import { cn } from "../../utils/cn";
import { useEditor } from "./Editor.context";
import type { EditorSourceToggleProps } from "./Editor.types";

/**
 * Toolbar button that reveals the raw HTML/Markdown behind the editor. Reads
 * `showSource` / `setShowSource` from context, so it works in the default
 * toolbar and in any custom toolbar composed with `useEditor()`.
 */
export function EditorSourceToggle({
  className,
  icon = "</>",
  title = "Source",
  activeTitle = "Rich text",
}: EditorSourceToggleProps) {
  const { showSource, setShowSource } = useEditor();

  return (
    <button
      type="button"
      onClick={() => setShowSource(!showSource)}
      title={showSource ? activeTitle : title}
      aria-pressed={showSource}
      data-react-fancy-editor-source-toggle=""
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md px-2 font-mono text-xs transition-colors",
        showSource
          ? "bg-zinc-200 dark:bg-zinc-700"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
        className,
      )}
    >
      {icon}
    </button>
  );
}

EditorSourceToggle.displayName = "EditorSourceToggle";

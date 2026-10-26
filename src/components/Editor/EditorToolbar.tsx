import { cn } from "../../utils/cn";
import { useEditor } from "./Editor.context";
import { EditorSourceToggle } from "./EditorSourceToggle";
import { EditorFullScreenToggle } from "./EditorFullScreenToggle";
import type { EditorToolbarProps } from "./Editor.types";

const DEFAULT_ACTIONS = [
  { icon: "B", label: "Bold", command: "bold" },
  { icon: "I", label: "Italic", command: "italic" },
  { icon: "U", label: "Underline", command: "underline" },
  { icon: "S", label: "Strikethrough", command: "strikeThrough" },
];

export function EditorToolbar({
  actions = DEFAULT_ACTIONS,
  onAction,
  children,
  className,
  showSourceToggle = true,
  showFullScreenToggle = false,
}: EditorToolbarProps) {
  const { exec, showSource } = useEditor();

  return (
    <div
      data-react-fancy-editor-toolbar=""
      className={cn(
        "flex shrink-0 items-center gap-0.5 border-b border-[color:var(--fancy-border,var(--color-zinc-200))] px-2 py-1.5 dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
        className,
      )}
    >
      {children ?? (
        <>
          {actions.map((action) => (
            <button
              key={`${action.command}-${action.commandArg ?? ""}`}
              type="button"
              // Rich-text commands don't apply to the raw-source textarea.
              disabled={showSource}
              onClick={() => {
                if (onAction) {
                  onAction(action.command);
                } else {
                  exec(action.command, action.commandArg);
                }
              }}
              title={action.label}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                action.active
                  ? "bg-[color:var(--fancy-border,var(--color-zinc-200))] dark:bg-[color:var(--fancy-border-dark,var(--color-zinc-700))]"
                  : "hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
                showSource && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              {action.icon}
            </button>
          ))}
          {showSourceToggle && <EditorSourceToggle className="ml-auto" />}
          {showFullScreenToggle && <EditorFullScreenToggle className={showSourceToggle ? undefined : "ml-auto"} />}
        </>
      )}
    </div>
  );
}

EditorToolbar.displayName = "EditorToolbar";

import { cn } from "../../utils/cn";
import { useEditor } from "./Editor.context";
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
}: EditorToolbarProps) {
  const { exec } = useEditor();

  return (
    <div
      data-react-fancy-editor-toolbar=""
      className={cn(
        "flex items-center gap-0.5 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-700",
        className,
      )}
    >
      {children ??
        actions.map((action) => (
          <button
            key={`${action.command}-${action.commandArg ?? ""}`}
            type="button"
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
                ? "bg-zinc-200 dark:bg-zinc-700"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
            )}
          >
            {action.icon}
          </button>
        ))}
    </div>
  );
}

EditorToolbar.displayName = "EditorToolbar";

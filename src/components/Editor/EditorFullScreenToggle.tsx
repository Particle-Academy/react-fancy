import { cn } from "../../utils/cn";
import { FullScreenToggle } from "../FullScreen/FullScreenToggle";
import type { EditorFullScreenToggleProps } from "./Editor.types";

/**
 * Toolbar button that takes the editor full screen and back. The shared
 * `FullScreen.Toggle`, styled for the editor toolbar and carrying the editor's
 * own handle (`data-react-fancy-editor-fullscreen-toggle`) next to the shared
 * one (`data-react-fancy-fullscreen-toggle`).
 */
export function EditorFullScreenToggle({ className, enterIcon, exitIcon }: EditorFullScreenToggleProps) {
  return (
    <FullScreenToggle
      data-react-fancy-editor-fullscreen-toggle=""
      enterIcon={enterIcon}
      exitIcon={exitIcon}
      className={cn(className)}
    />
  );
}

EditorFullScreenToggle.displayName = "EditorFullScreenToggle";

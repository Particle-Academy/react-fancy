import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Icon } from "../Icon";
import { useFullScreenContext } from "./FullScreen.context";

export interface FullScreenToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "children"> {
  /** Lucide name shown while NOT full screen. @default "maximize-2" */
  enterIcon?: string;
  /** Lucide name shown while full screen. @default "minimize-2" */
  exitIcon?: string;
  /** Replace the icon entirely. Receives the current state. */
  children?: ReactNode | ((fullScreen: boolean) => ReactNode);
}

/**
 * The toggle for the nearest `<FullScreen>` / `<FullScreenProvider>`. Renders
 * nothing outside one, so a shared toolbar can include it unconditionally.
 */
export function FullScreenToggle({
  enterIcon = "maximize-2",
  exitIcon = "minimize-2",
  children,
  className,
  ...rest
}: FullScreenToggleProps) {
  const fs = useFullScreenContext();
  if (!fs) return null;

  const content =
    typeof children === "function"
      ? children(fs.fullScreen)
      : children ?? <Icon name={fs.fullScreen ? exitIcon : enterIcon} size="sm" />;

  return (
    <button
      {...rest}
      {...fs.toggleProps}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
        "hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand,var(--color-blue-500))]",
        className,
      )}
    >
      {content}
    </button>
  );
}

FullScreenToggle.displayName = "FullScreenToggle";

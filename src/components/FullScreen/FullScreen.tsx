import type { HTMLAttributes, ReactNode } from "react";
import { useFullScreen, type UseFullScreenOptions } from "../../hooks/use-full-screen";
import { FullScreenProvider } from "./FullScreen.context";
import { FullScreenToggle } from "./FullScreenToggle";

export interface FullScreenProps
  extends UseFullScreenOptions,
    Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
}

/**
 * A box that can take over the viewport. Controlled with `fullScreen` +
 * `onFullScreenChange`, or uncontrolled with `defaultFullScreen`; put a
 * `<FullScreen.Toggle />` anywhere inside.
 *
 * Give it a background: while active it covers the page, and in `native` mode
 * the browser paints black behind anything transparent.
 */
function FullScreenRoot({
  children,
  fullScreen,
  defaultFullScreen,
  onFullScreenChange,
  mode,
  closeOnEscape,
  lockScroll,
  zIndex,
  labels,
  style,
  onKeyDown,
  ...rest
}: FullScreenProps) {
  const fs = useFullScreen<HTMLDivElement>({
    fullScreen,
    defaultFullScreen,
    onFullScreenChange,
    mode,
    closeOnEscape,
    lockScroll,
    zIndex,
    labels,
  });
  const { style: overlayStyle, onKeyDown: fsKeyDown, ...target } = fs.targetProps;

  return (
    <FullScreenProvider value={fs}>
      <div
        data-react-fancy-fullscreen=""
        {...rest}
        {...target}
        style={overlayStyle ? { ...style, ...overlayStyle } : style}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          fsKeyDown(e);
        }}
      >
        {children}
      </div>
    </FullScreenProvider>
  );
}

export const FullScreen = Object.assign(FullScreenRoot, {
  Toggle: FullScreenToggle,
});

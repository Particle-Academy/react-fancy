import { cn } from "../../utils/cn";
import type { DrawerContainerProps } from "./Drawer.types";

/**
 * The anchor for `<Drawer attach="container">`.
 *
 * A container-attached drawer positions itself `absolute`, which resolves
 * against the nearest *positioned* ancestor — so without `relative` somewhere
 * above it, the drawer silently escapes to the viewport and looks like it
 * ignored `attach` entirely. This wrapper supplies `relative` + `overflow-hidden`
 * so the panel slides within the box rather than out of it.
 *
 *   <Drawer.Container className="h-80 rounded-xl border">
 *     <YourContent />
 *     <Drawer attach="container" side="bottom" open={open} onClose={close}>
 *       <Drawer.Body>Filters</Drawer.Body>
 *     </Drawer>
 *   </Drawer.Container>
 *
 * Any element works as long as it is positioned — this is the shortcut, not a
 * requirement. Wrapping a Card, a layout pane, or a prompt-input shell in
 * `relative overflow-hidden` does the same job.
 */
export function DrawerContainer({ children, className, ...rest }: DrawerContainerProps) {
  return (
    <div
      data-react-fancy-drawer-container=""
      {...rest}
      className={cn("relative overflow-hidden", className)}
    >
      {children}
    </div>
  );
}

DrawerContainer.displayName = "DrawerContainer";

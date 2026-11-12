import type { ReactNode, ReactElement } from "react";
import type { Placement } from "../../utils/types";

export interface TooltipProps {
  children: ReactElement;
  content: ReactNode;
  placement?: Placement;
  delay?: number;
  offset?: number;
  className?: string;
  /**
   * Name the tooltip in the trigger's `aria-describedby` while it is shown.
   * Default `true`. Turn it off only when the tooltip repeats words the
   * trigger's accessible name already carries, so they are not read twice.
   */
  describe?: boolean;
}

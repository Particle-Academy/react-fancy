import type { ReactNode, ReactElement } from "react";
import type { Placement } from "../../utils/types";

export interface TooltipProps {
  children: ReactElement;
  content: ReactNode;
  placement?: Placement;
  delay?: number;
  offset?: number;
  className?: string;
}

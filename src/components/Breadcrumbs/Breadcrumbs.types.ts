import type { ReactNode } from "react";

export interface BreadcrumbsProps {
  children: ReactNode;
  separator?: ReactNode;
  shrink?: boolean;
  className?: string;
}

export interface BreadcrumbsItemProps {
  children: ReactNode;
  href?: string;
  active?: boolean;
  className?: string;
}

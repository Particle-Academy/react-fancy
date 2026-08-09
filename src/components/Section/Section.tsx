import { forwardRef } from "react";
import type * as React from "react";
import { cn } from "../../utils/cn";
import type { SectionProps } from "./Section.types";

const SPACE = { sm: "py-8", md: "py-16", lg: "py-24" } as const;

/**
 * Vertical rhythm between page sections, with the optional opening hairline.
 *
 * Pairs with `Eyebrow`, which is what usually sits at the top of one. The rule
 * is a prop rather than a caller-drawn border because half the gallery styles
 * drew it and half forgot, and an inconsistent rule reads as a bug.
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ children, space = "md", divider = false, as: Tag = "section", className, ...props }, ref) => {
    const Component = Tag as "section";

    return (
      <Component
        ref={ref as React.Ref<HTMLElement>}
        {...props}
        data-react-fancy-section=""
        data-space={space}
        className={cn(
          SPACE[space],
          divider && "border-t border-zinc-200 dark:border-zinc-800",
          className,
        )}
      >
        {children}
      </Component>
    );
  },
);

Section.displayName = "Section";

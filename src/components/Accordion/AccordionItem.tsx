import { cn } from "../../utils/cn";
import { AccordionItemContext } from "./Accordion.context";
import type { AccordionItemProps } from "./Accordion.types";

export function AccordionItem({
  children,
  value,
  className,
}: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div
        data-react-fancy-accordion-item=""
        className={cn(
          "border-b border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]",
          className,
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

AccordionItem.displayName = "AccordionItem";

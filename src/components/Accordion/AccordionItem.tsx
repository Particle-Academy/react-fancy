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
          "border-b border-zinc-200 dark:border-zinc-700",
          className,
        )}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

AccordionItem.displayName = "AccordionItem";

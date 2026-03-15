import { cn } from "../../utils/cn";
import { useAccordion, useAccordionItem } from "./Accordion.context";
import type { AccordionContentProps } from "./Accordion.types";

export function AccordionContent({
  children,
  className,
}: AccordionContentProps) {
  const { openItems } = useAccordion();
  const value = useAccordionItem();
  const isOpen = openItems.includes(value);

  return (
    <div
      data-react-fancy-accordion-content=""
      className={cn(
        "grid transition-all duration-200",
        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className={cn("pb-4 text-sm text-zinc-600 dark:text-zinc-400", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}

AccordionContent.displayName = "AccordionContent";

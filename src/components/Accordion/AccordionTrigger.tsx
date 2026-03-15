import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { useAccordion, useAccordionItem } from "./Accordion.context";
import type { AccordionTriggerProps } from "./Accordion.types";

export function AccordionTrigger({
  children,
  className,
}: AccordionTriggerProps) {
  const { openItems, toggle } = useAccordion();
  const value = useAccordionItem();
  const isOpen = openItems.includes(value);

  return (
    <button
      data-react-fancy-accordion-trigger=""
      type="button"
      onClick={() => toggle(value)}
      aria-expanded={isOpen}
      className={cn(
        "flex w-full items-center justify-between py-4 text-left text-sm font-medium transition-colors hover:text-zinc-600 dark:hover:text-zinc-300",
        className,
      )}
    >
      {children}
      <ChevronDown size={16} className={cn("shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
    </button>
  );
}

AccordionTrigger.displayName = "AccordionTrigger";

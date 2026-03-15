import { useCallback, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { AccordionContext } from "./Accordion.context";
import { AccordionItem } from "./AccordionItem";
import { AccordionTrigger } from "./AccordionTrigger";
import { AccordionContent } from "./AccordionContent";
import type { AccordionProps } from "./Accordion.types";

function AccordionRoot({
  children,
  type = "single",
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);
  const multiple = type === "multiple";

  const toggle = useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        return multiple ? [...prev, value] : [value];
      });
    },
    [multiple],
  );

  const ctx = useMemo(
    () => ({ openItems, toggle, multiple }),
    [openItems, toggle, multiple],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div data-react-fancy-accordion="" className={cn(className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});

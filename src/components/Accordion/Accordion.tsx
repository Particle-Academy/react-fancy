import { useCallback, useMemo } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { AccordionContext } from "./Accordion.context";
import { AccordionItem } from "./AccordionItem";
import { AccordionTrigger } from "./AccordionTrigger";
import { AccordionContent } from "./AccordionContent";
import type { AccordionProps } from "./Accordion.types";

/** `string | null | string[] | undefined` -> the open items, or undefined when absent. */
function toOpen(value: string | null | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function AccordionRoot(props: AccordionProps) {
  const { children, type = "single", defaultOpen = [], className } = props;
  const multiple = type === "multiple";

  // Internally always the list of open items; `value` / `onChange` speak the
  // shape `type` promises (`string | null` single, `string[]` multiple).
  const onChange = props.onChange as ((value: string | null | string[]) => void) | undefined;
  const report = useMemo(
    () =>
      onChange
        ? (open: string[]) => onChange(multiple ? open : (open[0] ?? null))
        : undefined,
    [onChange, multiple],
  );

  const [openItems, setOpenItems] = useControllableState<string[]>(
    toOpen(props.value),
    toOpen(props.defaultValue) ?? defaultOpen,
    report,
  );

  const toggle = useCallback(
    (value: string) => {
      setOpenItems((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        return multiple ? [...prev, value] : [value];
      });
    },
    [multiple, setOpenItems],
  );

  const ctx = useMemo(
    () => ({ openItems, toggle, multiple }),
    [openItems, toggle, multiple],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div
        data-react-fancy-accordion=""
        data-type={multiple ? "multiple" : "single"}
        className={cn(className)}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});

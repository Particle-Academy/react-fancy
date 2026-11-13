import {
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { cn } from "./cn";
import { composeRefs } from "./compose-refs";

/**
 * How a popup trigger (Dropdown.Trigger, Popover.Trigger) treats its child.
 *
 * The ARIA that says "this opens a popup" (`aria-haspopup`, `aria-expanded`,
 * `aria-controls`) belongs on the element a screen reader focuses. Before
 * 6.22.2 both triggers put it on a role-less wrapper `<span>`, where axe flags
 * it (`aria-allowed-attr`, critical) and no screen reader announces it.
 *
 * - `clone`: the child is one element that is, or renders, the focusable
 *   control. The trigger merges its props onto it (the asChild pattern) and
 *   renders no wrapper. `aria` is false when the child's explicit role cannot
 *   carry popup ARIA (a `role="img"` preview pill); `role` is set when a
 *   focusable host element has no role of its own (`<span tabIndex={0}>`), so
 *   the ARIA lands on a `button` rather than on another role-less element.
 * - `wrap`: the child is text, several nodes, a fragment, or a host element
 *   nothing can focus. The trigger renders its own element around it.
 */
export type TriggerChild =
  | { mode: "clone"; element: ReactElement<Record<string, unknown>>; aria: boolean; role?: "button" }
  | { mode: "wrap" };

/** The `aria-haspopup` values that name a kind of popup (WAI-ARIA 1.2). */
export type PopupKind = "menu" | "listbox" | "tree" | "grid" | "dialog";

/**
 * The ARIA a popup trigger carries: what it opens, whether it is open, and,
 * while it is, the id of the popup (which exists in the DOM only then).
 */
export function popupTriggerAria(kind: PopupKind, open: boolean, popupId: string) {
  return {
    "aria-haspopup": kind,
    ...disclosureAria(open, popupId),
  };
}

/**
 * The ARIA of a disclosure button: whether the region it shows is open and,
 * while it is, that region's id. No `aria-haspopup`, which would promise a
 * menu, listbox or dialog the region is not (a plain panel of links).
 */
export function disclosureAria(open: boolean, regionId: string) {
  return {
    "aria-expanded": open,
    "aria-controls": open ? regionId : undefined,
  };
}

/** Roles that allow both `aria-expanded` and `aria-haspopup` (WAI-ARIA 1.2). */
const POPUP_ROLES = new Set([
  "button",
  "combobox",
  "gridcell",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tab",
  "treeitem",
]);

const BUTTON_INPUTS = new Set(["button", "submit", "reset", "image"]);

export function classifyTriggerChild(children: ReactNode): TriggerChild {
  if (!isValidElement(children) || children.type === Fragment) return { mode: "wrap" };
  const element = children as ReactElement<Record<string, unknown>>;
  const props = element.props;
  const role = typeof props.role === "string" ? props.role : undefined;

  // A component (Button, a consumer's own): it renders the focusable control
  // and is expected to forward its props and ref onto it.
  if (typeof element.type !== "string") {
    return { mode: "clone", element, aria: role === undefined || POPUP_ROLES.has(role) };
  }

  const tag = element.type;
  const tabIndex = props.tabIndex === undefined ? undefined : Number(props.tabIndex);
  let native: "popup" | "other" | null = null;
  if (tag === "button" || tag === "summary" || tag === "select") native = "popup";
  else if (tag === "a" && props.href !== undefined) native = "popup";
  else if (tag === "input" && props.type !== "hidden") {
    native = BUTTON_INPUTS.has(String(props.type)) ? "popup" : "other";
  } else if (tag === "textarea") native = "other";

  const focusable = native !== null || (tabIndex !== undefined && tabIndex >= 0);
  if (!focusable) return { mode: "wrap" };

  if (role !== undefined) return { mode: "clone", element, aria: POPUP_ROLES.has(role) };
  if (native === "popup") return { mode: "clone", element, aria: true };
  if (native === "other") return { mode: "clone", element, aria: false };
  return { mode: "clone", element, aria: true, role: "button" };
}

/** The child's own ref (React 19 passes it as a prop). */
export function triggerChildRef(target: TriggerChild): Ref<HTMLElement> | undefined {
  return target.mode === "clone" ? (target.element.props.ref as Ref<HTMLElement> | undefined) : undefined;
}

/**
 * Merge a trigger's props onto its child.
 *
 * `owned` always applies: the popup's ARIA, its stable handle, its handlers.
 * A handler the child already has runs first, then the trigger's, so a child
 * that calls `preventDefault()` still opts out. `fallback` (props forwarded to
 * the trigger by its caller) fills only what the child leaves unset, except
 * `className`, which is joined. `ref` should already include the child's own.
 */
export function cloneTriggerChild(
  element: ReactElement<Record<string, unknown>>,
  {
    owned,
    fallback = {},
    ref,
  }: { owned: Record<string, unknown>; fallback?: Record<string, unknown>; ref: Ref<HTMLElement> },
): ReactElement {
  const own = element.props;
  const merged: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(fallback)) {
    if (k === "className") continue;
    if (own[k] === undefined) merged[k] = v;
  }
  if (fallback.className !== undefined) {
    // A child whose `className` styles something other than the element it
    // renders (Tooltip: the bubble) names the prop that reaches that element.
    const key = triggerClassNameProp(element.type) ?? "className";
    merged[key] = cn(fallback.className as string, own[key] as string | undefined);
  }

  for (const [k, v] of Object.entries(owned)) {
    const mine = own[k] ?? merged[k];
    if (/^on[A-Z]/.test(k) && typeof v === "function" && typeof mine === "function") {
      merged[k] = (...args: unknown[]) => {
        (mine as (...a: unknown[]) => void)(...args);
        (v as (...a: unknown[]) => void)(...args);
      };
    } else {
      merged[k] = v;
    }
  }

  merged.ref = ref;
  return cloneElement(element, merged);
}

/**
 * Static a component sets when its `className` does NOT style the element it
 * renders, naming the prop that does. Tooltip sets it to `"triggerClassName"`:
 * its `className` styles the bubble, so a trigger's classes go to its child.
 */
export const TRIGGER_CLASS_NAME_PROP = Symbol.for("react-fancy.triggerClassNameProp");

function triggerClassNameProp(type: unknown): string | undefined {
  if ((typeof type !== "function" && typeof type !== "object") || type === null) return undefined;
  const value = (type as Record<symbol, unknown>)[TRIGGER_CLASS_NAME_PROP];
  return typeof value === "string" ? value : undefined;
}

// Bundlers replace `process.env.NODE_ENV` textually; without one, the
// reference throws and we read that as production.
declare const process: { env: Record<string, string | undefined> };

function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

/**
 * Development only: warn once when a trigger's `className` did not reach the
 * element the trigger anchors to. The trigger merges `className` onto its
 * child, and a child component decides where that goes; one that styles an
 * inner or portalled element with it (a bubble, a label) leaves the control
 * without the class, which fails silently. "None of the classes are on the
 * element" is the test, so a class that tailwind-merge drops in favour of the
 * child's own conflicting one does not trip it.
 */
export function useTriggerClassNameCheck(
  anchorRef: RefObject<HTMLElement | null>,
  className: string | undefined,
  name: string,
): void {
  const warned = useRef(false);
  useEffect(() => {
    if (warned.current || !className || !isDev()) return;
    const el = anchorRef.current;
    if (!el) return;
    const tokens = className.split(/\s+/).filter(Boolean);
    if (tokens.length === 0 || tokens.some((t) => el.classList.contains(t))) return;
    warned.current = true;
    console.warn(
      `[react-fancy] ${name} className="${className}" did not reach the element it anchors to ` +
        `(<${el.tagName.toLowerCase()}>). The trigger merges className onto its child, and this child ` +
        "styles something else with it. Put the classes on the child's own element instead.",
    );
  });
}

export { composeRefs };

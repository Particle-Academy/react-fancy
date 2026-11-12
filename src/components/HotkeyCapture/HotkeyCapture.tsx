import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { fillLabel } from "../../utils/label-template";
import { visuallyHidden } from "../../utils/visually-hidden";
import { browserPlatformHints, detectPlatform, type FancyPlatform } from "../../utils/platform";
import { useControllableState } from "../../hooks/use-controllable-state";
import { Kbd } from "../Kbd";
import {
  APPLE_KEY_NAMES,
  comboFromEvent,
  DEFAULT_KEY_NAMES,
  formatHotkey,
  hotkeyCaps as capsFor,
  parseHotkey,
  type HotkeyCombo,
} from "./hotkey";
import type { HotkeyCaptureLabels, HotkeyCaptureProps } from "./HotkeyCapture.types";

const DEFAULT_LABELS: Required<Omit<HotkeyCaptureLabels, "keys">> = {
  label: "Keyboard shortcut",
  empty: "Not set",
  prompt: "Press the keys…",
  captured: "Shortcut set to {combo}",
  cancelled: "Cancelled",
  cleared: "Shortcut cleared",
  clear: "Clear shortcut",
  trigger: "{label}: {combo}",
};

/**
 * HotkeyCapture — records a keyboard shortcut (CC-fancy-0022).
 *
 * Click it (or press Enter or Space on it) and it captures the next key
 * combination. A modifier pressed alone only shows as held; the first
 * non-modifier key commits. Escape, or moving focus away, cancels and leaves
 * the previous value untouched — nothing is written until a capture commits,
 * so "restore" is simply not having changed it.
 *
 * The value is a normalised string, `"ctrl+shift+k"`; see `parseHotkey`.
 */
export const HotkeyCapture = forwardRef<HTMLDivElement, HotkeyCaptureProps>(function HotkeyCapture(
  {
    value: controlledValue,
    defaultValue = "",
    onChange,
    label,
    clearable = true,
    disabled = false,
    name,
    platform,
    labels,
    size = "sm",
    className,
    ...rest
  },
  ref,
) {
  const [value, setValue] = useControllableState(controlledValue, defaultValue, onChange);
  const [capturing, setCapturing] = useState(false);
  const [held, setHeld] = useState<Partial<HotkeyCombo>>({});
  const [announcement, setAnnouncement] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Resolved after mount, never during render, so the server's HTML and the
  // first client render agree. The default names keys every keyboard has.
  const [detected, setDetected] = useState<FancyPlatform>("generic");
  useEffect(() => {
    if (platform) return;
    setDetected(detectPlatform(browserPlatformHints()));
  }, [platform]);
  const apple = (platform ?? detected) === "apple";

  const words = { ...DEFAULT_LABELS, ...labels };
  const names: Record<string, string> = {
    ...DEFAULT_KEY_NAMES,
    ...(apple ? APPLE_KEY_NAMES : {}),
    ...(labels?.keys as Record<string, string> | undefined),
  };

  const combo = parseHotkey(value);
  const normalised = formatHotkey(combo);
  const caps = combo ? capsFor(combo, names) : [];
  const spoken = caps.join("+");
  const heldCaps = capsFor(held, names);

  const start = () => {
    if (disabled) return;
    setHeld({});
    setCapturing(true);
  };

  const stop = (message: string) => {
    setCapturing(false);
    setHeld({});
    setAnnouncement(message);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!capturing) {
      if (e.key === "Enter" || e.key === " ") {
        // Claimed here so the button's own activation does not toggle it twice.
        e.preventDefault();
        start();
      }
      return;
    }

    // While capturing, every key belongs to the capture: nothing else on the
    // page (a palette, a modal's Escape) should act on it.
    e.preventDefault();
    e.stopPropagation();

    if (e.key === "Escape" && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      stop(words.cancelled);
      return;
    }

    const next = comboFromEvent(e);
    if (!next) {
      setHeld({ ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
      return;
    }

    setValue(formatHotkey(next));
    stop(fillLabel(words.captured, { combo: capsFor(next, names).join("+") }));
    // A button activates on Space's keyup: without this, capturing Space would
    // start a fresh capture the moment the key comes back up.
    swallowKeyUp.current = true;
  };

  const swallowKeyUp = useRef(false);
  const onKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (capturing || swallowKeyUp.current) e.preventDefault();
    swallowKeyUp.current = false;
  };

  const shown = capturing ? words.prompt : spoken || words.empty;

  return (
    <div
      ref={ref}
      data-react-fancy-hotkey-capture=""
      data-state={capturing ? "capturing" : "idle"}
      data-value={normalised}
      className={cn("relative inline-flex items-center gap-1.5", className)}
      {...rest}
    >
      <button
        ref={triggerRef}
        type="button"
        data-react-fancy-hotkey-capture-trigger=""
        disabled={disabled}
        aria-pressed={capturing}
        aria-label={fillLabel(words.trigger, { label: label ?? words.label, combo: shown })}
        onClick={() => (capturing ? undefined : start())}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={() => {
          if (capturing) stop(words.cancelled);
        }}
        className={cn(
          "inline-flex min-h-8 min-w-[6rem] items-center gap-1.5 rounded-md border px-2 py-1 text-sm transition",
          "border-[color:var(--fancy-border-strong,var(--color-zinc-500))] bg-[color:var(--fancy-surface,var(--color-white))]",
          "text-[color:var(--fancy-text-soft,var(--color-zinc-700))]",
          "dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]",
          "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          capturing && "border-[color:var(--fancy-focus,var(--color-blue-500))] dark:border-[color:var(--fancy-focus-dark,var(--color-blue-400))]",
        )}
      >
        {capturing ? (
          <>
            {heldCaps.length > 0 && <Kbd keys={heldCaps} size={size} />}
            <span data-react-fancy-hotkey-capture-prompt="">{words.prompt}</span>
          </>
        ) : caps.length > 0 ? (
          <Kbd keys={caps} size={size} />
        ) : (
          <span data-react-fancy-hotkey-capture-empty="">{words.empty}</span>
        )}
      </button>
      {clearable && combo && !capturing && !disabled && (
        <button
          type="button"
          data-react-fancy-hotkey-capture-clear=""
          aria-label={words.clear}
          onClick={() => {
            setValue("");
            setAnnouncement(words.cleared);
            triggerRef.current?.focus();
          }}
          className="inline-grid h-6 w-6 place-items-center rounded text-[color:var(--fancy-text-muted,var(--color-zinc-500))] hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
      {name && <input type="hidden" name={name} value={normalised} />}
      <span
        data-react-fancy-hotkey-capture-status=""
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={visuallyHidden}
      >
        {announcement}
      </span>
    </div>
  );
});

HotkeyCapture.displayName = "HotkeyCapture";

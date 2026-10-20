import { useEffect, useRef, useState } from "react";

interface UseAnimationOptions {
  open: boolean;
  enterClass: string;
  exitClass: string;
}

interface UseAnimationReturn {
  mounted: boolean;
  className: string;
  ref: React.RefObject<HTMLElement | null>;
}

/** Slack on top of the measured exit, so the fallback never cuts a real animation short. */
const FALLBACK_GRACE_MS = 50;

/** `"0.2s, 150ms"` -> `[200, 150]`. Unparseable entries count as 0. */
function toMs(list: string | undefined): number[] {
  if (!list) return [0];
  return list.split(",").map((part) => {
    const v = part.trim();
    const n = parseFloat(v);
    if (Number.isNaN(n)) return 0;
    return v.endsWith("ms") ? n : n * 1000;
  });
}

/** The longest duration + delay pair, CSS-style (the shorter list repeats). */
function longest(durations: string | undefined, delays: string | undefined): number {
  const d = toMs(durations);
  const l = toMs(delays);
  let max = 0;
  for (let i = 0; i < Math.max(d.length, l.length); i++) {
    max = Math.max(max, d[i % d.length]! + l[i % l.length]!);
  }
  return max;
}

/**
 * How long the element's exit will take, in ms. 0 means nothing is running, so
 * there is no `animationend` to wait for.
 *
 * `getAnimations()` is asked first where it exists: it is the engine's own answer
 * and covers transitions too. Where it does not (jsdom, older engines) the
 * computed style is read instead — an `animation-name` of `none` (or none at all,
 * which is what an app without Fancy's stylesheet gets) means no animation.
 */
function exitDuration(el: HTMLElement): number {
  if (typeof el.getAnimations === "function" && el.getAnimations().length === 0) return 0;
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return 0;

  const style = window.getComputedStyle(el);
  const name = style.animationName;
  const animation =
    name && name !== "none" ? longest(style.animationDuration, style.animationDelay) : 0;
  const transition = longest(style.transitionDuration, style.transitionDelay);

  return Math.max(animation, transition);
}

/**
 * Mount on open, play `exitClass` on close, then unmount.
 *
 * The unmount used to happen ONLY on `animationend`. With no animation running —
 * an app that does not load Fancy's stylesheet, jsdom, an `exitClass` that
 * resolves to nothing — the event never fires and the closed panel stayed in the
 * DOM forever. So the exit is measured: nothing running unmounts at once,
 * something running unmounts on its own `animationend` or after its measured
 * duration, whichever comes first.
 */
export function useAnimation({
  open,
  enterClass,
  exitClass,
}: UseAnimationOptions): UseAnimationReturn {
  const [mounted, setMounted] = useState(open);
  const [animClass, setAnimClass] = useState(open ? enterClass : "");
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setAnimClass(enterClass);
    } else if (mounted) {
      setAnimClass(exitClass);
    }
  }, [open, enterClass, exitClass, mounted]);

  // Runs once the exit class is on the element, so the measurement sees it.
  const exiting = !open && mounted && animClass === exitClass;

  useEffect(() => {
    if (!exiting) return;

    const finish = () => {
      setMounted(false);
      setAnimClass("");
    };

    const el = ref.current;
    const wait = el ? exitDuration(el) : 0;
    if (!el || wait <= 0) {
      finish();
      return;
    }

    // Only the element's OWN animation: a child's `animationend` bubbles here
    // too, and must not cut the exit short.
    const onEnd = (e: Event) => {
      if (e.target === el) finish();
    };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, wait + FALLBACK_GRACE_MS);

    return () => {
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
    };
  }, [exiting]);

  return { mounted, className: animClass, ref };
}

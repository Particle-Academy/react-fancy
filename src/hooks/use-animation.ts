import { useCallback, useEffect, useRef, useState } from "react";

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

  const handleAnimationEnd = useCallback(() => {
    if (!open) {
      setMounted(false);
      setAnimClass("");
    }
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener("animationend", handleAnimationEnd);
    return () => el.removeEventListener("animationend", handleAnimationEnd);
  }, [handleAnimationEnd, mounted]);

  return { mounted, className: animClass, ref };
}

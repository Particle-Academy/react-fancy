import { useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Portal } from "../Portal";
import { ToastContext } from "./Toast.context";
import { ToastItem } from "./ToastItem";
import type { ToastData, ToastProviderProps } from "./Toast.types";

const POSITION_STYLES = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
} as const;

function ToastProvider({
  children,
  position = "bottom-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const idCounter = useRef(0);

  const toast = useCallback(
    (data: Omit<ToastData, "id">) => {
      const id = `toast-${++idCounter.current}`;
      setToasts((prev) => [...prev.slice(-(maxToasts - 1)), { ...data, id }]);
      return id;
    },
    [maxToasts],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx = useMemo(() => ({ toasts, toast, dismiss }), [toasts, toast, dismiss]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <Portal>
        <div
          data-react-fancy-toast=""
          className={cn(
            "fixed z-[100] flex flex-col gap-2 pointer-events-none",
            POSITION_STYLES[position],
          )}
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} data={t} onDismiss={dismiss} />
          ))}
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

export const Toast = {
  Provider: ToastProvider,
};

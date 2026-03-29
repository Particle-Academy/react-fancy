import { forwardRef, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { useTimeline } from "./Timeline.context";
import type { TimelineItemProps } from "./Timeline.types";
import type { Color } from "../../utils/types";

const dotColorClasses: Record<Color, string> = {
  red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500",
  yellow: "bg-yellow-500", lime: "bg-lime-500", green: "bg-green-500",
  emerald: "bg-emerald-500", teal: "bg-teal-500", cyan: "bg-cyan-500",
  sky: "bg-sky-500", blue: "bg-blue-500", indigo: "bg-indigo-500",
  violet: "bg-violet-500", purple: "bg-purple-500", fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500", rose: "bg-rose-500", zinc: "bg-zinc-300 dark:bg-zinc-600",
};

const ringColorClasses: Record<Color, string> = {
  red: "ring-red-500/30", orange: "ring-orange-500/30", amber: "ring-amber-500/30",
  yellow: "ring-yellow-500/30", lime: "ring-lime-500/30", green: "ring-green-500/30",
  emerald: "ring-emerald-500/30", teal: "ring-teal-500/30", cyan: "ring-cyan-500/30",
  sky: "ring-sky-500/30", blue: "ring-blue-500/30", indigo: "ring-indigo-500/30",
  violet: "ring-violet-500/30", purple: "ring-purple-500/30", fuchsia: "ring-fuchsia-500/30",
  pink: "ring-pink-500/30", rose: "ring-rose-500/30", zinc: "ring-zinc-400/30 dark:ring-zinc-500/30",
};

function Dot({ icon, emoji, color, active }: Pick<TimelineItemProps, "icon" | "emoji" | "color" | "active">) {
  const c = color ?? "zinc";

  if (emoji) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
        <span className="text-sm">{emoji}</span>
      </span>
    );
  }

  if (icon) {
    return (
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
          dotColorClasses[c],
          active && "ring-4",
          active && ringColorClasses[c],
        )}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "h-3 w-3 shrink-0 rounded-full",
        dotColorClasses[c],
        active && "ring-4",
        active && ringColorClasses[c],
      )}
    />
  );
}

function useIntersectionReveal(animated: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!animated);

  useEffect(() => {
    if (!animated || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animated]);

  return { ref, visible };
}

export const TimelineItem = forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ children, icon, emoji, date, color = "zinc", active = false, className }, _ref) => {
    const { variant, index, total, animated } = useTimeline();
    const { ref, visible } = useIntersectionReveal(animated);
    const isLast = index === total - 1;
    const isLargeDot = !!icon || !!emoji;
    const isEven = index % 2 === 0;

    // ── Horizontal ────────────────────────────────────────
    if (variant === "horizontal") {
      return (
        <div
          ref={ref}
          data-react-fancy-timeline-item=""
          className={cn(
            "flex flex-col items-center",
            !isLast && "min-w-40",
            animated && "transition duration-500 ease-out",
            animated && (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"),
            className,
          )}
        >
          {/* Dot + horizontal line (fixed height for alignment) */}
          <div className="flex h-8 w-full items-center">
            {index > 0
              ? <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              : <div className="flex-1" />}
            <Dot icon={icon} emoji={emoji} color={color} active={active} />
            {!isLast
              ? <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
              : <div className="flex-1" />}
          </div>

          {/* Content below */}
          <div className="mt-3 max-w-40 px-2 text-center">
            {date && <time className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{date}</time>}
            {children}
          </div>
        </div>
      );
    }

    // ── Alternating ───────────────────────────────────────
    if (variant === "alternating") {
      return (
        <div
          ref={ref}
          data-react-fancy-timeline-item=""
          className={cn(
            "relative flex gap-x-4 md:grid md:grid-cols-[1fr_1.5rem_1fr] md:gap-x-6",
            animated && "transition duration-500 ease-out",
            animated && (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"),
            className,
          )}
        >
          {/* Dot (sits on top of the background line) */}
          <div className="relative z-10 flex w-8 shrink-0 justify-center md:col-start-2 md:row-start-1 md:w-auto md:justify-center">
            {!isLargeDot ? <div className="mt-1.5"><Dot icon={icon} emoji={emoji} color={color} active={active} /></div> : <Dot icon={icon} emoji={emoji} color={color} active={active} />}
          </div>

          {/* Content */}
          <div className={cn(
            "min-w-0 flex-1",
            !isLast && "pb-8",
            isLargeDot && "pt-1",
            isEven ? "md:col-start-1 md:row-start-1 md:text-right" : "md:col-start-3",
          )}>
            {date && <time className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{date}</time>}
            {children}
          </div>
        </div>
      );
    }

    // ── Stacked (default) ─────────────────────────────────
    return (
      <div
        ref={ref}
        data-react-fancy-timeline-item=""
        className={cn(
          "relative flex gap-x-4",
          animated && "transition duration-500 ease-out",
          animated && (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"),
          className,
        )}
      >
        {/* Dot (sits on top of the background line) */}
        <div className="relative z-10 flex w-8 shrink-0 justify-center">
          {!isLargeDot
            ? <div className="mt-1.5"><Dot icon={icon} emoji={emoji} color={color} active={active} /></div>
            : <Dot icon={icon} emoji={emoji} color={color} active={active} />}
        </div>

        {/* Content */}
        <div className={cn("min-w-0 flex-1", !isLast && "pb-8", isLargeDot && "pt-1")}>
          {date && <time className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{date}</time>}
          {children}
        </div>
      </div>
    );
  },
);

TimelineItem.displayName = "TimelineItem";

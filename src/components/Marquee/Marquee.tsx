import {
  Children,
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import type { MarqueeProps } from "./Marquee.types";

function toLength(value: string | number): string {
  return typeof value === "number" ? `${value}px` : value;
}

export const Marquee = forwardRef<HTMLDivElement, MarqueeProps>(
  (
    {
      children,
      items,
      speed = 40,
      duration,
      direction = "left",
      pauseOnHover = false,
      paused = false,
      gap = 40,
      fade = true,
      separator,
      angle = 0,
      decorative = true,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const unitRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    // copies = how many times the item sequence repeats inside ONE loop copy,
    // so short content still fills the strip edge-to-edge (no blank wrap).
    const [copies, setCopies] = useState(1);
    const [measuredDuration, setMeasuredDuration] = useState<number | null>(null);

    // Measure one content unit (incl. its trailing gap) + the container:
    //  - auto-fill: repeat the unit until one loop copy covers the container
    //  - px/s mode: derive the loop duration from the loop distance so the
    //    perceived speed stays constant regardless of content width.
    // Browser-only (effect) — SSR renders one unit at the fallback pace.
    useEffect(() => {
      const root = rootRef.current;
      const unit = unitRef.current;
      if (!root || !unit || typeof ResizeObserver === "undefined") return;
      const update = () => {
        const unitWidth = unit.getBoundingClientRect().width;
        const containerWidth = root.clientWidth;
        if (unitWidth <= 0) return;
        const nextCopies = Math.max(1, Math.ceil(containerWidth / unitWidth));
        setCopies(nextCopies);
        if (duration === undefined) {
          setMeasuredDuration((unitWidth * nextCopies) / Math.max(speed, 1));
        }
      };
      update();
      const observer = new ResizeObserver(update);
      observer.observe(root);
      observer.observe(unit);
      return () => observer.disconnect();
    }, [duration, speed]);

    const loopSeconds = duration ?? measuredDuration ?? 40;
    const itemNodes: ReactNode[] = items ?? Children.toArray(children);
    const hasSeparator = separator !== undefined && separator !== null;

    // One unit = the item sequence once (separator after every item so the
    // wrap point looks identical to any other joint).
    const renderUnit = (duplicate: boolean, unitElRef?: React.Ref<HTMLDivElement>) => (
      <div
        ref={unitElRef}
        className="fancy-marquee__unit"
        aria-hidden={duplicate || undefined}
      >
        {itemNodes.map((node, i) => (
          <Fragment key={i}>
            <div className="fancy-marquee__item" data-react-fancy-marquee-item="" data-index={i}>
              {node}
            </div>
            {hasSeparator && (
              <div
                className="fancy-marquee__separator"
                data-react-fancy-marquee-separator=""
                aria-hidden="true"
              >
                {separator}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    );

    // Two identical groups + translateX(-50%) keyframes = seamless wrap. Only
    // the very first unit is exposed to AT; every repeat is aria-hidden.
    const renderGroup = (duplicate: boolean) => (
      <div
        className="fancy-marquee__group"
        data-react-fancy-marquee-group=""
        aria-hidden={duplicate || undefined}
      >
        {Array.from({ length: copies }, (_, c) =>
          <Fragment key={c}>
            {renderUnit(duplicate || c > 0, !duplicate && c === 0 ? unitRef : undefined)}
          </Fragment>,
        )}
      </div>
    );

    const cssVars: CSSProperties = {
      "--fancy-marquee-duration": `${loopSeconds}s`,
      "--fancy-marquee-gap": toLength(gap),
      ...(fade !== false && {
        "--fancy-marquee-fade": fade === true ? "48px" : toLength(fade),
      }),
    } as CSSProperties;

    // Tilted strips widen slightly (the classic 102% / -1% trick) so the
    // rotation never exposes the page background at the edges.
    const angleStyle: CSSProperties = angle
      ? { transform: `rotate(${angle}deg)`, width: "102%", marginLeft: "-1%" }
      : {};

    return (
      <div
        ref={rootRef}
        data-react-fancy-marquee=""
        data-direction={direction}
        data-paused={paused ? "" : undefined}
        aria-hidden={decorative || undefined}
        className={cn(
          "fancy-marquee",
          fade !== false && "fancy-marquee--fade",
          pauseOnHover && "fancy-marquee--pause-hover",
          className,
        )}
        style={{ ...cssVars, ...angleStyle, ...style }}
        {...rest}
      >
        <div className="fancy-marquee__track" data-react-fancy-marquee-track="">
          {renderGroup(false)}
          {renderGroup(true)}
        </div>
      </div>
    );
  },
);

Marquee.displayName = "Marquee";

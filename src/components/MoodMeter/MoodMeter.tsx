import { useCallback, useRef, useState } from "react";

/**
 * MoodMeter — a 2D draggable pad that captures a value AND the
 * confidence in that value on the same handle.
 *
 *   <MoodMeter
 *     min={0} max={1}
 *     value={value} confidence={confidence}
 *     onChange={(v, c) => { setValue(v); setConfidence(c); }}
 *   />
 *
 *   • x-axis maps to [min..max]
 *   • y-axis maps to [0..1] confidence (top = sure)
 *   • the halo around the handle scales inversely with confidence —
 *     uncertain readings literally look fuzzier
 *
 * Why pair them in one control? When AIs post a number, humans
 * immediately ask "how sure are you?". Making confidence an explicit
 * sibling of value — and letting the user drag either independently —
 * turns vague "AI suggestion" UX into something you can argue with
 * precisely.
 *
 * The agent's posted value/confidence renders as a dashed ghost
 * handle alongside the live user handle, so the human can see where
 * the agent landed and how far they've drifted.
 */
export interface MoodMeterProps {
  /** Range minimum. */
  min: number;
  /** Range maximum. */
  max: number;
  /** Step for value snapping. Defaults to (max-min)/100. */
  step?: number;
  /** Current value (controlled). */
  value: number;
  /** Current confidence 0..1 (controlled). */
  confidence: number;
  /** Called with (value, confidence) on drag / pointer events. */
  onChange: (value: number, confidence: number) => void;
  /** Optional agent post — renders as a dashed ghost handle. */
  posted?: { value: number; confidence: number };
  /** Pixel width of the pad. Defaults to 320. */
  width?: number;
  /** Pixel height of the pad. Defaults to 220. */
  height?: number;
  /** Show the grid + axis labels. Defaults to true. */
  showGrid?: boolean;
  /** Color of the user handle. Defaults to sky blue. */
  color?: string;
  /** Color of the posted-ghost handle. Defaults to violet. */
  postedColor?: string;
  /** Optional prefix for the value label (e.g. "$"). */
  prefix?: string;
  /** Optional suffix for the value label (e.g. "k", "%"). */
  suffix?: string;
  /** Optional label text override. Falls back to formatted value. */
  formatValue?: (v: number) => string;
  /** Optional className applied to the outer pad. */
  className?: string;
}

export function MoodMeter({
  min,
  max,
  step,
  value,
  confidence,
  onChange,
  posted,
  width = 320,
  height = 220,
  showGrid = true,
  color = "#0ea5e9",
  postedColor = "#a855f7",
  prefix = "",
  suffix = "",
  formatValue,
  className,
}: MoodMeterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const snapStep = step ?? (max - min) / 100;

  const fmt = useCallback(
    (v: number) => {
      if (formatValue) return formatValue(v);
      const num = snapStep < 1 ? v.toFixed(2) : Math.round(v).toString();
      return `${prefix}${num}${suffix}`;
    },
    [formatValue, snapStep, prefix, suffix],
  );

  const set = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);
      const raw = min + x * (max - min);
      const snapped = round(raw, snapStep, min);
      const c = clamp(1 - y, 0, 1);
      onChange(snapped, Math.round(c * 100) / 100);
    },
    [min, max, snapStep, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    set(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    set(e.clientX, e.clientY);
  };
  const onPointerUp = () => setDragging(false);

  const xPct = ((value - min) / (max - min)) * 100;
  const yPct = (1 - confidence) * 100;
  const haloR = 18 + (1 - confidence) * 70;

  const pxPct = posted ? ((posted.value - min) / (max - min)) * 100 : 0;
  const pyPct = posted ? (1 - posted.confidence) * 100 : 0;
  const pHaloR = posted ? 16 + (1 - posted.confidence) * 60 : 0;

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative cursor-crosshair touch-none select-none overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 ${className ?? ""}`}
      style={{ width, height }}
    >
      {showGrid && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {[0.25, 0.5, 0.75].map((p, i) => (
            <line
              key={`v${i}`}
              x1={`${p * 100}%`}
              x2={`${p * 100}%`}
              y1="0"
              y2="100%"
              stroke="#a1a1aa"
              strokeOpacity={0.18}
              strokeDasharray="3 4"
            />
          ))}
          {[0.25, 0.5, 0.75].map((p, i) => (
            <line
              key={`h${i}`}
              x1="0"
              x2="100%"
              y1={`${p * 100}%`}
              y2={`${p * 100}%`}
              stroke="#a1a1aa"
              strokeOpacity={0.18}
              strokeDasharray="3 4"
            />
          ))}
        </svg>
      )}

      {showGrid && (
        <>
          <div className="pointer-events-none absolute left-1.5 top-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
            ↑ sure
          </div>
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
            ↓ unsure
          </div>
          <div className="pointer-events-none absolute right-1.5 top-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
            {fmt(max)} →
          </div>
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
            ← {fmt(min)}
          </div>
        </>
      )}

      {posted && (
        <Handle
          xPct={pxPct}
          yPct={pyPct}
          haloR={pHaloR}
          color={postedColor}
          dashed
          label="agent"
        />
      )}
      <Handle
        xPct={xPct}
        yPct={yPct}
        haloR={haloR}
        color={color}
        label={fmt(value)}
      />
    </div>
  );
}

function Handle({
  xPct,
  yPct,
  haloR,
  color,
  dashed = false,
  label,
}: {
  xPct: number;
  yPct: number;
  haloR: number;
  color: string;
  dashed?: boolean;
  label: string;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${xPct}%`,
          top: `${yPct}%`,
          width: haloR * 2,
          height: haloR * 2,
          background: color + (dashed ? "11" : "22"),
          border: dashed ? `1px dashed ${color}` : "none",
        }}
      />
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-zinc-900"
        style={{
          left: `${xPct}%`,
          top: `${yPct}%`,
          width: 14,
          height: 14,
          background: color,
          opacity: dashed ? 0.6 : 1,
        }}
      />
      <div
        className="pointer-events-none absolute -translate-x-1/2 rounded px-1.5 py-0.5 font-mono text-[10px]"
        style={{
          left: `${xPct}%`,
          top: `calc(${yPct}% + 14px)`,
          color,
        }}
      >
        {label}
      </div>
    </>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function round(n: number, step: number, min: number) {
  if (step >= 1) return Math.round(n);
  return Math.round((n - min) / step) * step + min;
}

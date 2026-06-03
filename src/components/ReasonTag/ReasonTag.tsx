import { Popover } from "../Popover";
import { Button } from "../Button";

/**
 * ReasonTag — wraps any value with a small affordance that reveals the
 * agent's reasoning, sources, and confidence on hover or click.
 *
 *   <ReasonTag
 *     value="$1.4M"
 *     reason="Projected Q3 ARR after stacking renewals."
 *     confidence={0.91}
 *     sources={[{ label: "Q2 actuals · CRM export" }]}
 *     by="Forecaster"
 *   />
 *
 * Three visual styles:
 *   • "dot"       — value with a tiny coloured dot (default, subtle)
 *   • "underline" — dotted underline + trailing "?"
 *   • "chip"      — full coloured pill (loud)
 *
 * Confidence drives the colour via three tiers (high / medium / low),
 * so a quick visual scan tells the human which suggestions deserve a
 * second look without opening any tooltips.
 *
 * `pinned` swaps the popover for an inline annotation slot — useful
 * when explainability should always be visible, not buried in a hover.
 */
export type ReasonTagSource = { label: string; href?: string };

export type ReasonTagTheme = "dot" | "underline" | "chip";

export interface ReasonTagProps {
  /** The value the tag wraps — usually a number, label, or short phrase. */
  value: React.ReactNode;
  /** Free-text rationale shown in the popover / inline annotation. */
  reason: string;
  /** 0..1 confidence. Drives the tier colour. Defaults to 1. */
  confidence?: number;
  /** Optional list of sources (label + optional href). */
  sources?: ReasonTagSource[];
  /** Optional author / agent name shown in the popover header. */
  by?: string;
  /** Visual treatment for the trigger. */
  theme?: ReasonTagTheme;
  /**
   * When true, the popover is replaced with an always-visible inline
   * annotation below the value.
   */
  pinned?: boolean;
  /** Called when the user hits the "ask follow-up" action. */
  onFollowUp?: () => void;
  /** Optional className applied to the trigger element. */
  className?: string;
}

const CONFIDENCE_TIERS: Array<{ min: number; color: string; label: string }> = [
  { min: 0.85, color: "#10b981", label: "high" },
  { min: 0.6, color: "#f59e0b", label: "medium" },
  { min: 0, color: "#ef4444", label: "low" },
];

function tier(c: number) {
  return CONFIDENCE_TIERS.find((t) => c >= t.min) ?? CONFIDENCE_TIERS[2];
}

export function ReasonTag({
  value,
  reason,
  confidence = 1,
  sources = [],
  by,
  theme = "dot",
  pinned = false,
  onFollowUp,
  className,
}: ReasonTagProps) {
  const t = tier(confidence);

  const trigger =
    theme === "chip" ? (
      <span
        className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${className ?? ""}`}
        style={{ backgroundColor: t.color + "22", color: t.color }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: t.color }}
        />
        {value}
        <span className="text-[10px] opacity-70">?</span>
      </span>
    ) : theme === "underline" ? (
      <span
        className={`cursor-help underline decoration-dotted underline-offset-2 ${className ?? ""}`}
        style={{ textDecorationColor: t.color }}
      >
        {value}
        <span
          className="ml-0.5 font-mono text-[10px]"
          style={{ color: t.color }}
        >
          ?
        </span>
      </span>
    ) : (
      <span className={`inline-flex cursor-help items-baseline gap-1 ${className ?? ""}`}>
        <span className="font-medium">{value}</span>
        <span
          className="inline-block h-1.5 w-1.5 rounded-full align-middle"
          style={{ backgroundColor: t.color }}
          title="reason available"
        />
      </span>
    );

  if (pinned) {
    return (
      <span className="inline-flex flex-col items-start gap-0.5 align-top">
        {trigger}
        <span
          className="block max-w-[280px] rounded border-l-2 pl-2 text-[11px] leading-snug text-zinc-600 dark:text-zinc-300"
          style={{ borderColor: t.color }}
        >
          {reason}
        </span>
      </span>
    );
  }

  return (
    <Popover hover>
      <Popover.Trigger>{trigger}</Popover.Trigger>
      <Popover.Content>
        <div className="w-72 space-y-2 text-sm">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: t.color }}
            >
              {t.label} confidence · {(confidence * 100).toFixed(0)}%
            </span>
            {by && (
              <span className="ml-auto font-mono text-[10px] text-zinc-400">
                @{by}
              </span>
            )}
          </div>
          <p className="text-[13px] leading-snug text-zinc-700 dark:text-zinc-200">
            {reason}
          </p>
          {sources.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                sources
              </div>
              <ul className="mt-0.5 space-y-0.5 text-[12px]">
                {sources.map((s, i) => (
                  <li key={i}>
                    {s.href ? (
                      <a className="text-violet-600 hover:underline" href={s.href}>
                        {s.label}
                      </a>
                    ) : (
                      <span className="text-zinc-600 dark:text-zinc-300">
                        {s.label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onFollowUp && (
            <div className="flex justify-end pt-1">
              <Button size="sm" variant="ghost" onClick={onFollowUp}>
                ask follow-up
              </Button>
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}

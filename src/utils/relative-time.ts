/** A moment: epoch milliseconds, a `Date`, or a string `Date` can parse (ISO 8601). */
export type TimeInput = number | string | Date;

export interface RelativeTimeOptions {
  /** The moment to measure from. Default: `Date.now()` when called. */
  now?: TimeInput;
  /** BCP 47 locale(s) for the words. Default: the runtime's. */
  locale?: string | string[];
}

/** Epoch milliseconds, or `NaN` when the input is not a valid time. */
export function toTimestamp(time: TimeInput): number {
  if (time instanceof Date) return time.getTime();
  if (typeof time === "number") return time;
  return new Date(time).getTime();
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

/**
 * "5 minutes ago", "yesterday", "in 2 hours", in the given locale, through the
 * platform's `Intl.RelativeTimeFormat` (no dependency, no bundled strings).
 *
 * Under 45 seconds either way reads "now". Units step up at 45 minutes, 22
 * hours, 7 days, 30 days and 365 days, and the count is rounded, so 90 seconds
 * is "2 minutes ago". An invalid time renders as "" rather than "NaN".
 */
export function formatRelativeTime(time: TimeInput, { now = Date.now(), locale }: RelativeTimeOptions = {}): string {
  const at = toTimestamp(time);
  const from = toTimestamp(now);
  if (!Number.isFinite(at) || !Number.isFinite(from)) return "";

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = (at - from) / 1000;
  const abs = Math.abs(diff);
  const sign = diff < 0 ? -1 : 1;
  const step = (size: number) => sign * Math.round(abs / size);

  if (abs < 45) return rtf.format(0, "second");
  if (abs < 45 * MINUTE) return rtf.format(step(MINUTE), "minute");
  if (abs < 22 * HOUR) return rtf.format(step(HOUR), "hour");
  if (abs < 7 * DAY) return rtf.format(step(DAY), "day");
  if (abs < 30 * DAY) return rtf.format(step(7 * DAY), "week");
  if (abs < 365 * DAY) return rtf.format(step(30 * DAY), "month");
  return rtf.format(step(365 * DAY), "year");
}

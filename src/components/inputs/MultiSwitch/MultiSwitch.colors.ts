// Literal Tailwind class strings for every color in the v4 palette so the
// scanner can detect them in the published dist (template-built names are
// invisible to Tailwind's JIT). Shades follow badgeSolid: 600 / dark 500 for
// the thumb, with dark label text on the light hues (amber, yellow, lime).
import type { Color } from "../../../utils/types";

export type MultiSwitchColorClasses = {
  /** The selected thumb's fill. */
  thumb: string;
  /** The selected option's label, readable on the thumb. */
  text: string;
  /** The container border while this option is selected. */
  border: string;
};

export const multiSwitchColorClasses: Record<Color, MultiSwitchColorClasses> = {
  // The host's colour, from CSS variables -- no dark: variant, because a
  // host that themes per mode scopes the variables themselves.
  brand: { thumb: "bg-brand", text: "text-brand-contrast", border: "border-brand" },
  slate: { thumb: "bg-slate-600 dark:bg-slate-500", text: "text-white", border: "border-slate-500 dark:border-slate-400" },
  gray: { thumb: "bg-gray-600 dark:bg-gray-500", text: "text-white", border: "border-gray-500 dark:border-gray-400" },
  zinc: { thumb: "bg-zinc-600 dark:bg-zinc-500", text: "text-white", border: "border-zinc-500 dark:border-zinc-400" },
  neutral: { thumb: "bg-neutral-600 dark:bg-neutral-500", text: "text-white", border: "border-neutral-500 dark:border-neutral-400" },
  stone: { thumb: "bg-stone-600 dark:bg-stone-500", text: "text-white", border: "border-stone-500 dark:border-stone-400" },
  red: { thumb: "bg-red-600 dark:bg-red-500", text: "text-white", border: "border-red-500 dark:border-red-400" },
  orange: { thumb: "bg-orange-600 dark:bg-orange-500", text: "text-white", border: "border-orange-500 dark:border-orange-400" },
  amber: { thumb: "bg-amber-400 dark:bg-amber-300", text: "text-amber-950", border: "border-amber-500 dark:border-amber-400" },
  yellow: { thumb: "bg-yellow-400 dark:bg-yellow-300", text: "text-yellow-950", border: "border-yellow-500 dark:border-yellow-400" },
  lime: { thumb: "bg-lime-400 dark:bg-lime-300", text: "text-lime-950", border: "border-lime-500 dark:border-lime-400" },
  green: { thumb: "bg-green-600 dark:bg-green-500", text: "text-white", border: "border-green-500 dark:border-green-400" },
  emerald: { thumb: "bg-emerald-600 dark:bg-emerald-500", text: "text-white", border: "border-emerald-500 dark:border-emerald-400" },
  teal: { thumb: "bg-teal-600 dark:bg-teal-500", text: "text-white", border: "border-teal-500 dark:border-teal-400" },
  cyan: { thumb: "bg-cyan-600 dark:bg-cyan-500", text: "text-white", border: "border-cyan-500 dark:border-cyan-400" },
  sky: { thumb: "bg-sky-600 dark:bg-sky-500", text: "text-white", border: "border-sky-500 dark:border-sky-400" },
  blue: { thumb: "bg-blue-600 dark:bg-blue-500", text: "text-white", border: "border-blue-500 dark:border-blue-400" },
  indigo: { thumb: "bg-indigo-600 dark:bg-indigo-500", text: "text-white", border: "border-indigo-500 dark:border-indigo-400" },
  violet: { thumb: "bg-violet-600 dark:bg-violet-500", text: "text-white", border: "border-violet-500 dark:border-violet-400" },
  purple: { thumb: "bg-purple-600 dark:bg-purple-500", text: "text-white", border: "border-purple-500 dark:border-purple-400" },
  fuchsia: { thumb: "bg-fuchsia-600 dark:bg-fuchsia-500", text: "text-white", border: "border-fuchsia-500 dark:border-fuchsia-400" },
  pink: { thumb: "bg-pink-600 dark:bg-pink-500", text: "text-white", border: "border-pink-500 dark:border-pink-400" },
  rose: { thumb: "bg-rose-600 dark:bg-rose-500", text: "text-white", border: "border-rose-500 dark:border-rose-400" },
};

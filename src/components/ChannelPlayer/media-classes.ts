/**
 * Token classes the channel components share. Every colour goes through a
 * `--fancy-*` token whose fallback is the kit default, so a host palette
 * reaches all of them (theme-tokens.test.tsx).
 */

export const SURFACE =
  "border-[color:var(--fancy-border,var(--color-zinc-200))] bg-[color:var(--fancy-surface,var(--color-white))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]";

export const TEXT =
  "text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

export const TEXT_SOFT =
  "text-[color:var(--fancy-text-soft,var(--color-zinc-700))] dark:text-[color:var(--fancy-text-soft-dark,var(--color-zinc-300))]";

export const TEXT_MUTED =
  "text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]";

/** The current row (a track, a channel): the muted surface. */
export const ACTIVE_ROW =
  "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]";

export const HOVER_ROW =
  "hover:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:hover:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))] dark:focus-visible:ring-[color:var(--fancy-focus-dark,var(--color-blue-400))]";

/** Player controls rest on the strong border, like every form control (WCAG 1.4.11). */
export const CONTROL_OUTLINE =
  "border-[color:var(--fancy-border-strong,var(--color-zinc-500))] dark:border-[color:var(--fancy-border-strong-dark,var(--color-zinc-500))]";


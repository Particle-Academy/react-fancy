/**
 * The positive / accept fill, as theme tokens: `--fancy-success` (the fill) and
 * `--fancy-on-success` (the text on it), each with a `-dark` twin.
 *
 * Passed as a `className` beside `color="emerald"` on a `Button`, so it wins the
 * merge over the emerald fill, text, border and hover. Every fallback is the
 * colour the emerald button painted, so a host that sets nothing sees no change.
 *
 * The border and the hover read the FILL token but keep emerald-800 / emerald-700
 * as their fallbacks (today's border and hover). With a host fill set they take
 * that fill: one colour, no second shade the host never chose.
 */
export const SUCCESS_FILL =
  "bg-[color:var(--fancy-success,var(--color-emerald-700))] text-[color:var(--fancy-on-success,var(--color-white))] border-[color:var(--fancy-success,var(--color-emerald-800))] hover:bg-[color:var(--fancy-success,var(--color-emerald-800))] dark:bg-[color:var(--fancy-success-dark,var(--color-emerald-800))] dark:text-[color:var(--fancy-on-success-dark,var(--color-white))] dark:border-[color:var(--fancy-success-dark,var(--color-emerald-700))] dark:hover:bg-[color:var(--fancy-success-dark,var(--color-emerald-700))]";

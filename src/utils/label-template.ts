/**
 * Fill a label template's `{name}` slots: `"Digit {n} of {total}"`,
 * `"Open {host}"`. Single braces, for translatable labels only; a slot with no
 * value stays as written. Literal replacement, never evaluated.
 */
export function fillLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole: string, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole,
  );
}

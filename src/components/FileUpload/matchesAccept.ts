/**
 * Does a file satisfy an `accept` string?
 *
 * The browser enforces `accept` in the FILE PICKER only. A drag-and-drop never
 * opens a picker, so on the drop path this is the only thing standing between an
 * image-only dropzone and a dropped executable. Forwarding the attribute to the
 * hidden input is half the job; this is the other half.
 *
 * Follows the HTML `accept` grammar: a comma-separated list of extensions
 * (`.csv`), exact MIME types (`text/plain`) and type wildcards (`image/*`).
 * Matching is case-insensitive, because a drop reports whatever the OS says and
 * `TEXT/PLAIN` is a real thing to receive.
 *
 * A dropped file often carries an EMPTY `type` — the OS may not know it and
 * `File.type` is a hint, never a guarantee. That is why extension rules are
 * checked against the name and not the type: an `accept=".csv"` zone has to work
 * for a .csv whose type is `""`, which is the common case rather than the edge.
 */
export function matchesAccept(file: File, accept: string): boolean {
  const rules = accept
    .split(",")
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  // An accept string that lists nothing constrains nothing. Failing closed here
  // would turn `accept=""` into a dropzone that silently swallows every file.
  if (rules.length === 0) return true;

  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

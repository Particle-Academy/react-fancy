/**
 * `{{name}}` placeholder filling for SetupWizard.
 *
 * Literal string replacement and nothing else: the result is rendered as a
 * React text node (or as CodeBlock's escaped code), never as HTML, and a token
 * value is never evaluated. The replacer is a FUNCTION on purpose, so a value
 * containing `$&` or `$1` is inserted as written rather than read as a
 * `String.prototype.replace` pattern.
 */

const PLACEHOLDER = /\{\{([A-Za-z0-9_.-]+)\}\}/g;

/** Fill `text`, pushing the name of each placeholder with no token onto `unknown`. */
export function fillTokens(
  text: string,
  tokens: Record<string, string> | undefined,
  unknown: string[],
): string {
  return text.replace(PLACEHOLDER, (whole: string, name: string) => {
    if (tokens && Object.prototype.hasOwnProperty.call(tokens, name)) return String(tokens[name]);
    unknown.push(name);
    return whole;
  });
}

// Bundlers replace `process.env.NODE_ENV` textually; without one, the
// reference throws and we read that as production.
declare const process: { env: Record<string, string | undefined> };

function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

const warned = new Set<string>();

/** One `console.warn` per distinct unknown token name, for the life of the page. Dev only. */
export function warnUnknownTokens(names: string[]): void {
  if (!isDev()) return;
  for (const name of names) {
    if (warned.has(name)) continue;
    warned.add(name);
    console.warn(
      `[react-fancy] SetupWizard: no token named "${name}", so "{{${name}}}" is shown as written. Pass it in \`tokens\`.`,
    );
  }
}

/** Fill a label template's `{name}` slots (single braces, label-only). */
export function fillLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole: string, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

/**
 * The link for a step's `url`: absolute `http:` / `https:` only, with its host
 * for the button label. Uses the global `URL`, which exists on the server too.
 */
export function externalLink(url: string | undefined): { href: string; host: string } | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    if (!parsed.host) return undefined;
    return { href: trimmed, host: parsed.host };
  } catch {
    return undefined;
  }
}

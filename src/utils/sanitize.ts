/**
 * HTML and URL sanitization utilities.
 *
 * Hand-rolled (no third-party deps) using browser-native `DOMParser`. Designed
 * for the trust model "consumer passes user-generated markdown/HTML to a
 * react-fancy component" — strips script tags, event handlers, and dangerous
 * URI schemes from `href`/`src` attributes.
 *
 * For server-side rendering (no `window`), `sanitizeHtml` returns the input
 * unchanged. Consumers SSR-rendering untrusted content should sanitize on the
 * server with their own pipeline.
 */

const DANGEROUS_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "base",
  "form",
]);

const URL_ATTRS = new Set(["href", "src", "action", "formaction", "xlink:href"]);

const SAFE_PROTOCOL = /^(?:https?:|mailto:|tel:|sms:|ftp:|#|\/|\.\/|\.\.\/|[^:]*$)/i;

/**
 * Validate a URL/href against an allow-list of safe protocols. Returns the
 * input if safe, or `undefined` if it begins with a dangerous scheme like
 * `javascript:`, `data:`, or `vbscript:`. Relative URLs and fragment links
 * are allowed.
 */
export function sanitizeHref(href: string | undefined | null): string | undefined {
  if (href == null) return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  return SAFE_PROTOCOL.test(trimmed) ? trimmed : undefined;
}

function stripDangerousAttrs(el: Element): void {
  // Collect names first; mutating during iteration is awkward with NamedNodeMap.
  const names: string[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    names.push(el.attributes[i].name);
  }

  for (const name of names) {
    const lower = name.toLowerCase();

    // All on* event handlers
    if (lower.startsWith("on")) {
      el.removeAttribute(name);
      continue;
    }

    // URL attributes — protocol-filter
    if (URL_ATTRS.has(lower)) {
      const sanitized = sanitizeHref(el.getAttribute(name));
      if (sanitized === undefined) {
        el.removeAttribute(name);
      } else {
        el.setAttribute(name, sanitized);
      }
      continue;
    }

    // srcdoc executes JS in the iframe — drop wholesale
    if (lower === "srcdoc") {
      el.removeAttribute(name);
    }
  }
}

function walk(el: Element, removeQueue: Element[]): void {
  const tag = el.tagName.toLowerCase();

  if (DANGEROUS_TAGS.has(tag)) {
    removeQueue.push(el);
    return;
  }

  stripDangerousAttrs(el);

  const children = Array.from(el.children);
  for (const child of children) {
    walk(child, removeQueue);
  }
}

/**
 * Sanitize an HTML string by removing dangerous tags (script, iframe, etc.),
 * event-handler attributes (`onclick`, `onerror`, ...), and dangerous URI
 * schemes in `href`/`src` attributes.
 *
 * Uses the browser's `DOMParser`. In non-browser environments returns the
 * input unchanged — sanitize on the server in those cases.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;
  if (!body) return html;

  const removeQueue: Element[] = [];
  for (const child of Array.from(body.children)) {
    walk(child, removeQueue);
  }

  for (const el of removeQueue) {
    el.parentNode?.removeChild(el);
  }

  return body.innerHTML;
}

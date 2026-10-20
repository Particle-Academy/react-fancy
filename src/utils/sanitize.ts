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
  // A <title> anywhere in the document retitles the host's tab.
  "title",
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
 * Allowlist options for {@link sanitizeHtml}. Passing ANY options object
 * (even `{}`) switches from the default blocklist to allowlist mode, where
 * everything not listed is removed.
 */
export interface SanitizeHtmlOptions {
  /**
   * Tags to keep, e.g. `["p", "a", "strong"]`. A tag that is not listed is
   * removed but its text and (cleaned) children are kept. Default: none, so
   * only text survives.
   *
   * Some tags are removed WITH their content even when listed, because no
   * attribute filtering makes them safe: `script`, `style`, `iframe`, `frame`,
   * `frameset`, `object`, `embed`, `applet`, `link`, `meta`, `base`, `form`,
   * `title`, `template`, `noscript`, `noembed`, `noframes`, `xmp`,
   * `plaintext`, `svg` and `math`.
   */
  allowedTags?: readonly string[];
  /**
   * Attributes to keep. Either one list for every allowed tag, or a map from
   * tag name to its list, where the key `"*"` applies to every tag. A trailing
   * `*` matches a prefix (`"data-*"`, `"aria-*"`). Default: none.
   *
   * Never kept, even when listed: event handlers (`on*`), `srcdoc` and
   * `srcset`.
   */
  allowedAttributes?: readonly string[] | Readonly<Record<string, readonly string[]>>;
  /**
   * URL schemes allowed in URL attributes (`href`, `src`, `action`,
   * `formaction`, `cite`, `poster`, `background`, `ping`, `xlink:href`), with
   * the colon: `["https:", "mailto:"]`. A URL attribute whose scheme is not
   * listed is removed. Default: `["http:", "https:", "mailto:"]`.
   *
   * `javascript:` and `vbscript:` are never kept, even when listed.
   */
  allowedSchemes?: readonly string[];
  /**
   * Keep URLs with no scheme that stay on this site: `/x`, `x/y`, `../x`,
   * `?q`, `#frag`. Protocol-relative URLs (`//host/x`, and the backslash
   * spellings a browser treats the same way) leave the site and are always
   * removed. Default: `false`.
   */
  allowRelative?: boolean;
}

/** Removed with their content in allowlist mode, whatever the options say. */
const ALWAYS_REMOVED_TAGS = new Set([
  ...DANGEROUS_TAGS,
  "frame",
  "frameset",
  "applet",
  "template",
  "noscript",
  "noembed",
  "noframes",
  "xmp",
  "plaintext",
  // Foreign content: namespace confusion is how mutation XSS gets past
  // sanitisers that re-serialise, as this one does.
  "svg",
  "math",
]);

const ALLOWLIST_URL_ATTRS = new Set([
  "href",
  "src",
  "action",
  "formaction",
  "cite",
  "poster",
  "background",
  "ping",
  "xlink:href",
]);

const NEVER_ALLOWED_ATTRS = new Set(["srcdoc", "srcset"]);

const NEVER_ALLOWED_SCHEMES = new Set(["javascript:", "vbscript:"]);

const DEFAULT_SCHEMES = ["http:", "https:", "mailto:"];

const SCHEME = /^([a-z][a-z0-9+.-]*:)/i;

const SLASH = 47;
const BACKSLASH = 92;

interface Policy {
  tags: Set<string>;
  globalAttrs: string[];
  tagAttrs: Map<string, string[]>;
  schemes: Set<string>;
  allowRelative: boolean;
}

function lowerAll(list: readonly string[] | undefined): string[] {
  return (list ?? []).map((s) => s.toLowerCase());
}

function toPolicy(options: SanitizeHtmlOptions): Policy {
  const tagAttrs = new Map<string, string[]>();
  let globalAttrs: string[] = [];
  const attrs = options.allowedAttributes;
  if (Array.isArray(attrs)) {
    globalAttrs = lowerAll(attrs);
  } else if (attrs) {
    for (const [tag, list] of Object.entries(attrs as Record<string, readonly string[]>)) {
      if (tag === "*") globalAttrs = lowerAll(list);
      else tagAttrs.set(tag.toLowerCase(), lowerAll(list));
    }
  }
  return {
    tags: new Set(lowerAll(options.allowedTags)),
    globalAttrs,
    tagAttrs,
    schemes: new Set(lowerAll(options.allowedSchemes ?? DEFAULT_SCHEMES)),
    allowRelative: options.allowRelative === true,
  };
}

function attrListed(name: string, list: string[] | undefined): boolean {
  if (!list) return false;
  for (const entry of list) {
    if (entry === name) return true;
    if (entry.endsWith("*") && name.startsWith(entry.slice(0, -1))) return true;
  }
  return false;
}

/**
 * Browsers ignore ASCII whitespace and control characters inside a URL's
 * scheme (`java<TAB>script:` runs), so judge the URL with them removed.
 */
function stripControlAndSpace(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 32) out += value[i];
  }
  return out;
}

function urlAllowed(value: string, policy: Policy): boolean {
  const url = stripControlAndSpace(value);
  const match = SCHEME.exec(url);
  if (match) {
    const scheme = match[1].toLowerCase();
    return !NEVER_ALLOWED_SCHEMES.has(scheme) && policy.schemes.has(scheme);
  }
  if (!policy.allowRelative) return false;
  const a = url.charCodeAt(0);
  const b = url.charCodeAt(1);
  const isSlash = (c: number) => c === SLASH || c === BACKSLASH;
  // `//host`, and its backslash spellings, is another site.
  return !(isSlash(a) && isSlash(b));
}

function cleanAttributes(el: Element, tag: string, policy: Policy): void {
  const names: string[] = [];
  for (let i = 0; i < el.attributes.length; i++) {
    names.push(el.attributes[i].name);
  }
  for (const name of names) {
    const lower = name.toLowerCase();
    const keep =
      !lower.startsWith("on") &&
      !NEVER_ALLOWED_ATTRS.has(lower) &&
      (attrListed(lower, policy.globalAttrs) || attrListed(lower, policy.tagAttrs.get(tag))) &&
      (!ALLOWLIST_URL_ATTRS.has(lower) || urlAllowed(el.getAttribute(name) ?? "", policy));
    if (!keep) el.removeAttribute(name);
  }
}

function cleanChildren(parent: Node, policy: Policy): void {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === 3) continue; // text
    if (node.nodeType !== 1) {
      // comments, processing instructions, CDATA
      parent.removeChild(node);
      continue;
    }
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (ALWAYS_REMOVED_TAGS.has(tag)) {
      parent.removeChild(el);
      continue;
    }
    cleanChildren(el, policy);
    if (!policy.tags.has(tag)) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      continue;
    }
    cleanAttributes(el, tag, policy);
  }
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeAllowlist(html: string, options: SanitizeHtmlOptions): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // Fail closed: with no parser we cannot tell markup from text, so the
    // whole input is returned as escaped text rather than passed through.
    return escapeText(html);
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const body = doc.body;
  if (!body) return "";
  cleanChildren(body, toPolicy(options));
  return body.innerHTML;
}

/**
 * Sanitize an HTML string.
 *
 * **With no options** (the default blocklist): removes dangerous tags (script,
 * iframe, etc.), event-handler attributes (`onclick`, `onerror`, ...), and
 * dangerous URI schemes in `href`/`src` attributes. Everything else is kept.
 * In non-browser environments returns the input unchanged — sanitize on the
 * server in those cases.
 *
 * **With options** (allowlist mode): keeps ONLY the listed tags, attributes and
 * URL schemes; see {@link SanitizeHtmlOptions}. The allowlist can only narrow:
 * event handlers, `javascript:` URLs and script-capable tags never survive,
 * even when listed. In non-browser environments the input is returned as
 * escaped text (fail closed).
 *
 * Uses the browser's `DOMParser`.
 */
export function sanitizeHtml(html: string, options?: SanitizeHtmlOptions): string {
  if (options !== undefined && options !== null) {
    return sanitizeAllowlist(html, options);
  }
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

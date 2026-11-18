/**
 * Atomic inline tokens ("chips") inside the Editor's rich-text surface.
 *
 * A token is one `<span data-react-fancy-editor-token="<id>" contenteditable="false">`
 * holding its label as TEXT. It is atomic: the caret steps over it in one arrow
 * press and Backspace / Delete remove it whole. The id is the host's (a field
 * path, a mention id); the editor never interprets it.
 *
 * Handled here rather than left to the browser because browsers disagree on
 * caret movement around `contenteditable="false"` islands, and some delete a
 * chip one character at a time.
 */

export const TOKEN_ATTR = "data-react-fancy-editor-token";

export interface EditorToken {
  /** Host id carried on the chip, e.g. a field path `customer.name`. */
  id: string;
  /** Text shown in the chip. Always rendered as text, never as markup. */
  label: string;
}

/**
 * Chip styling, applied from the editing surface (descendant selectors) so no
 * class lands on the chip itself and the emitted value stays canonical.
 */
export const TOKEN_SURFACE_CLASSES =
  "[&_[data-react-fancy-editor-token]]:mx-0.5 [&_[data-react-fancy-editor-token]]:inline-block [&_[data-react-fancy-editor-token]]:rounded-md [&_[data-react-fancy-editor-token]]:px-1.5 [&_[data-react-fancy-editor-token]]:font-medium [&_[data-react-fancy-editor-token]]:select-all [&_[data-react-fancy-editor-token]]:bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] [&_[data-react-fancy-editor-token]]:text-[color:var(--fancy-text,var(--color-zinc-900))] dark:[&_[data-react-fancy-editor-token]]:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))] dark:[&_[data-react-fancy-editor-token]]:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}

/**
 * The canonical HTML for a token, for hosts that build an Editor `value`
 * themselves. Id and label are escaped.
 */
export function editorTokenHtml(token: EditorToken): string {
  return `<span ${TOKEN_ATTR}="${escapeAttr(token.id)}" contenteditable="false">${escapeText(token.label)}</span>`;
}

export function isToken(node: Node | null | undefined): node is HTMLElement {
  return !!node && node.nodeType === 1 && (node as Element).hasAttribute(TOKEN_ATTR);
}

/** Make every chip under `root` atomic. Idempotent. */
export function normalizeTokens(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(`[${TOKEN_ATTR}]`).forEach((el) => {
    if (el.getAttribute("contenteditable") !== "false") el.setAttribute("contenteditable", "false");
  });
}

export function createTokenElement(doc: Document, token: EditorToken): HTMLElement {
  const el = doc.createElement("span");
  el.setAttribute(TOKEN_ATTR, token.id);
  el.setAttribute("contenteditable", "false");
  el.textContent = token.label;
  return el;
}

/**
 * Insert a chip at the caret when the caret is inside `root`, else at the end
 * of `root`'s last block. Leaves the caret just after the chip.
 */
export function insertTokenAt(root: HTMLElement, token: EditorToken): HTMLElement {
  const doc = root.ownerDocument;
  const chip = createTokenElement(doc, token);
  const sel = doc.getSelection();
  let range: Range | null = null;
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (root.contains(r.startContainer)) range = r;
  }
  if (range) {
    range.deleteContents();
    range.insertNode(chip);
  } else {
    let target: HTMLElement = root;
    const last = root.lastElementChild as HTMLElement | null;
    if (last && /^(P|DIV|H[1-6]|LI)$/.test(last.tagName)) target = last;
    target.appendChild(chip);
  }
  if (sel) {
    const after = doc.createRange();
    after.setStartAfter(chip);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
  return chip;
}

/** The token directly before (`-1`) or after (`1`) a collapsed caret, if any. */
function adjacentToken(container: Node, offset: number, dir: -1 | 1): HTMLElement | null {
  if (container.nodeType === 3) {
    const len = (container.textContent ?? "").length;
    if (dir === -1 && offset === 0) return isToken(container.previousSibling) ? container.previousSibling : null;
    if (dir === 1 && offset === len) return isToken(container.nextSibling) ? container.nextSibling : null;
    return null;
  }
  const kids = container.childNodes;
  const node = dir === -1 ? kids[offset - 1] : kids[offset];
  return isToken(node) ? node : null;
}

function placeCaret(doc: Document, chip: HTMLElement, side: "before" | "after"): void {
  const sel = doc.getSelection();
  if (!sel) return;
  const r = doc.createRange();
  if (side === "before") r.setStartBefore(chip);
  else r.setStartAfter(chip);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

/**
 * Keyboard handling for chips. Returns `true` when the key was handled (the
 * caller must `preventDefault`); `"changed"` when the content changed too.
 */
export function handleTokenKey(root: HTMLElement, key: string): false | "moved" | "changed" {
  if (key !== "Backspace" && key !== "Delete" && key !== "ArrowLeft" && key !== "ArrowRight") return false;
  const doc = root.ownerDocument;
  const sel = doc.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.startContainer)) return false;
  const dir: -1 | 1 = key === "Backspace" || key === "ArrowLeft" ? -1 : 1;
  const chip = adjacentToken(r.startContainer, r.startOffset, dir);
  if (!chip) return false;
  if (key === "ArrowLeft") {
    placeCaret(doc, chip, "before");
    return "moved";
  }
  if (key === "ArrowRight") {
    placeCaret(doc, chip, "after");
    return "moved";
  }
  const anchor = dir === -1 ? chip.previousSibling : chip.nextSibling;
  const parent = chip.parentNode!;
  const index = Array.prototype.indexOf.call(parent.childNodes, chip) as number;
  chip.remove();
  const caret = doc.createRange();
  if (anchor && anchor.nodeType === 3 && dir === -1) caret.setStart(anchor, (anchor.textContent ?? "").length);
  else caret.setStart(parent, Math.min(index, parent.childNodes.length));
  caret.collapse(true);
  sel.removeAllRanges();
  sel.addRange(caret);
  return "changed";
}

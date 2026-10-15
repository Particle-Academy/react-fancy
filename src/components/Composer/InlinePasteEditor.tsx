import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "../../utils/cn";
import { PILL_MARK, pasteMarker, segmentValue } from "./paste-markers";

/** The attribute on the placeholder span a pill is portalled into. */
export const HOST_ATTR = "data-react-fancy-composer-paste-host";

/** What a paste becomes, as decided by `Composer`. `block` pills get their own line. */
export interface PillToInsert {
  id: string;
  block: boolean;
}

export interface InlinePasteEditorHandle {
  focus(): void;
  /** Swap a pill for plain text, where it sits. */
  replacePill(id: string, text: string): void;
  /**
   * Replace the whole value and put the caret at `caret` (an offset into the
   * value). For a host that edits text itself — `PromptInput`'s `/` and `@`
   * pickers — where rebuilding from `value` alone would lose the caret.
   */
  setValue(value: string, caret: number): void;
}

interface InlinePasteEditorProps {
  value: string;
  /** Ids the composer holds. A marker for anything else stays text. */
  known: ReadonlySet<string>;
  /** `caret` is the caret's offset into `value`, or `value.length` if it is elsewhere. */
  onChange(value: string, caret: number): void;
  onSubmit(): void;
  /**
   * Which key sends. `"enter"` (default): Enter sends, Shift+Enter is a newline.
   * `"mod-enter"`: Ctrl/⌘+Enter sends and a plain Enter is a newline.
   */
  submitKey?: "enter" | "mod-enter";
  /** Runs BEFORE the editor's own key handling; `preventDefault()` to claim the key. */
  onKeyDown?(e: React.KeyboardEvent<HTMLDivElement>): void;
  placeholderClassName?: string;
  /** Height in px past which the input scrolls. Defaults to the class's max height. */
  maxHeight?: number;
  /** Return the pills a paste becomes, or null to insert its text as typed. */
  onPaste(data: DataTransfer | null): PillToInsert[] | null;
  /** Every pill placeholder currently in the editor, for the composer to portal into. */
  onHostsChange(hosts: ReadonlyMap<string, HTMLElement>): void;
  placeholder: string;
  disabled: boolean;
  className?: string;
}

/**
 * Walk a node's children back into a value string.
 *
 * `<br>` as the LAST child of its parent is filler — browsers put one in an empty
 * line, and this editor puts one after a trailing newline so the caret has a line
 * to sit on — so it counts for nothing. Block elements a browser invents count as
 * a line break before them. Non-breaking spaces become spaces: a browser inserts
 * them for typed spaces it fears would collapse, not because anyone asked.
 */
function serialize(parent: Node, keep: (id: string) => boolean): string {
  let out = "";
  const children = Array.from(parent.childNodes);

  children.forEach((node, i) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += (node.textContent ?? "").replace(/\u00A0/g, " ");
      return;
    }
    if (!(node instanceof HTMLElement)) return;

    const id = node.getAttribute(HOST_ATTR);
    if (id !== null) {
      if (keep(id)) out += pasteMarker(id);
      return;
    }
    if (node.tagName === "BR") {
      if (i !== children.length - 1) out += "\n";
      return;
    }
    if (/^(DIV|P)$/.test(node.tagName) && out.length > 0 && !out.endsWith("\n")) {
      out += "\n";
    }
    out += serialize(node, keep);
  });

  return out;
}

function makeHost(id: string): HTMLElement {
  const host = document.createElement("span");
  host.setAttribute("contenteditable", "false");
  host.setAttribute(HOST_ATTR, id);
  host.className = "inline-block align-baseline";
  return host;
}

/** A value ending in a newline needs a `<br>` after it, or the caret has no line to sit on. */
function ensureTrailingBreak(root: HTMLElement, value: string) {
  const last = root.lastChild;
  const hasBreak = last instanceof HTMLElement && last.tagName === "BR";

  if (value.endsWith("\n") && !hasBreak) root.append(document.createElement("br"));
  if (!value.endsWith("\n") && hasBreak && value.length > 0) last.remove();
}

function placeCaretAfter(node: Node) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Put the caret `offset` characters into the serialised value. Walks the shape
 * `render` produces — text nodes, pill hosts (each worth its marker's length) and
 * a trailing `<br>` — so it is only called straight after a render.
 */
function placeCaretAtOffset(root: HTMLElement, offset: number, keep: (id: string) => boolean) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  let remaining = offset;
  let placed = false;

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        range.setStart(node, remaining);
        placed = true;
        break;
      }
      remaining -= length;
      continue;
    }
    const id = node instanceof HTMLElement ? node.getAttribute(HOST_ATTR) : null;
    if (id !== null && keep(id)) {
      const length = pasteMarker(id).length;
      if (remaining < length) {
        range.setStartAfter(node);
        placed = true;
        break;
      }
      remaining -= length;
    }
  }

  if (!placed) {
    range.selectNodeContents(root);
    range.collapse(false);
    const last = root.lastChild;
    if (last instanceof HTMLElement && last.tagName === "BR") range.setStartBefore(last);
  }
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * The plain-text-plus-pills surface behind `Composer`'s inline placement.
 *
 * The DOM is the source of truth WHILE TYPING and `value` is its serialisation;
 * the DOM is rebuilt from `value` only when `value` changes from outside (a send,
 * a host, an agent). Rebuilding on every keystroke would throw the caret away.
 *
 * Every insertion is done here by hand, never by the browser: a paste is always
 * intercepted, so no foreign HTML ever lands in the editor, and Enter is handled
 * so a browser never invents a `<div>` per line.
 */
export const InlinePasteEditor = forwardRef<InlinePasteEditorHandle, InlinePasteEditorProps>(
  function InlinePasteEditor(
    {
      value,
      known,
      onChange,
      onSubmit,
      onPaste,
      onHostsChange,
      placeholder,
      disabled,
      className,
      submitKey = "enter",
      onKeyDown,
      placeholderClassName,
      maxHeight,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    /** The last value this editor produced or rendered. Anything else came from outside. */
    const lastValue = useRef<string | null>(null);
    /**
     * Ids inserted here whose hold has not reached `known` yet. A pill is held and
     * placed in the same event, and the composer's state lands a render later.
     */
    const pending = useRef(new Set<string>());
    const knownRef = useRef(known);
    knownRef.current = known;

    const keep = useCallback(
      (id: string) => knownRef.current.has(id) || pending.current.has(id),
      [],
    );

    const reportHosts = useCallback(() => {
      const root = rootRef.current;
      if (!root) return;

      const hosts = new Map<string, HTMLElement>();
      root.querySelectorAll<HTMLElement>(`[${HOST_ATTR}]`).forEach((el) => {
        const id = el.getAttribute(HOST_ATTR)!;
        if (keep(id)) hosts.set(id, el);
      });
      onHostsChange(hosts);
    }, [keep, onHostsChange]);

    /** The caret's offset into the serialised value, or its length if the caret is elsewhere. */
    const caretOffset = useCallback(
      (whole: string): number => {
        const root = rootRef.current;
        const selection = window.getSelection();
        if (!root || !selection || selection.rangeCount === 0) return whole.length;

        const range = selection.getRangeAt(0);
        if (!root.contains(range.endContainer)) return whole.length;

        const head = document.createRange();
        head.selectNodeContents(root);
        head.setEnd(range.endContainer, range.endOffset);
        return serialize(head.cloneContents(), keep).length;
      },
      [keep],
    );

    /** Read the DOM back into a value and tell the composer. */
    const emit = useCallback(() => {
      const root = rootRef.current;
      if (!root) return;

      const next = serialize(root, keep);
      ensureTrailingBreak(root, next);
      reportHosts();

      // Reported even when the value is unchanged: a host reading the caret (a
      // `/` picker) needs to hear about it.
      lastValue.current = next;
      onChange(next, caretOffset(next));
    }, [keep, onChange, reportHosts, caretOffset]);

    /** Rebuild the DOM from a value. Throws the caret away; callers put it back. */
    const render = useCallback(
      (next: string) => {
        const root = rootRef.current;
        if (!root) return;

        root.replaceChildren();
        for (const segment of segmentValue(next, knownRef.current)) {
          if (segment.type === "text") {
            root.append(document.createTextNode(segment.text));
          } else {
            root.append(makeHost(segment.id));
          }
        }
        ensureTrailingBreak(root, next);
        lastValue.current = next;
        reportHosts();
      },
      [reportHosts],
    );

    /** The caret's range, or the end of the editor if the caret is elsewhere. */
    const caret = useCallback((): Range => {
      const root = rootRef.current!;
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (root.contains(range.commonAncestorContainer)) return range;
      }

      const range = document.createRange();
      range.selectNodeContents(root);
      range.collapse(false);
      const last = root.lastChild;
      if (last instanceof HTMLElement && last.tagName === "BR") {
        range.setStartBefore(last);
        range.collapse(true);
      }
      return range;
    }, []);

    /** Replace the selection with `nodes` and leave the caret after them. */
    const insert = useCallback(
      (build: (before: string, after: string) => Node[]) => {
        const root = rootRef.current!;
        const range = caret();
        range.deleteContents();

        const head = document.createRange();
        head.selectNodeContents(root);
        head.setEnd(range.startContainer, range.startOffset);
        const tail = document.createRange();
        tail.selectNodeContents(root);
        tail.setStart(range.endContainer, range.endOffset);

        const nodes = build(
          serialize(head.cloneContents(), () => true),
          serialize(tail.cloneContents(), () => true),
        );
        if (nodes.length === 0) return;

        const fragment = document.createDocumentFragment();
        nodes.forEach((n) => fragment.append(n));
        range.insertNode(fragment);
        placeCaretAfter(nodes[nodes.length - 1]);
        emit();
      },
      [caret, emit],
    );

    const insertText = useCallback(
      (text: string) => insert(() => (text ? [document.createTextNode(text)] : [])),
      [insert],
    );

    /*
     * Rebuild from `value` when it changed from outside — or when `known` now
     * disagrees with the pills on screen, e.g. a host set a marker and then the
     * paste it names. Never on our own edits: that would discard the caret.
     */
    useLayoutEffect(() => {
      const root = rootRef.current;
      if (!root) return;

      for (const id of pending.current) if (known.has(id)) pending.current.delete(id);

      const wanted = segmentValue(value, known)
        .flatMap((s) => (s.type === "pill" ? [s.id] : []))
        .join(PILL_MARK);
      const onScreen = Array.from(root.querySelectorAll(`[${HOST_ATTR}]`))
        .map((el) => el.getAttribute(HOST_ATTR))
        .filter((id): id is string => id !== null && keep(id))
        .join(PILL_MARK);

      if (value === lastValue.current && wanted === onScreen) return;

      render(value);
    }, [value, known, keep, render]);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          const root = rootRef.current;
          if (!root) return;
          root.focus();
          const range = caret();
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        },
        replacePill(id, text) {
          const root = rootRef.current;
          const host = Array.from(
            root?.querySelectorAll(`[${HOST_ATTR}]`) ?? [],
          ).find((el) => el.getAttribute(HOST_ATTR) === id);
          if (!root || !host) return;

          const node = document.createTextNode(text);
          host.replaceWith(node);
          root.focus();
          placeCaretAfter(node);
          emit();
        },
        setValue(next, offset) {
          const root = rootRef.current;
          if (!root) return;

          render(next);
          root.focus();
          placeCaretAtOffset(root, offset, keep);
          emit();
        },
      }),
      [caret, emit, render, keep],
    );

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      // ALWAYS intercepted: a browser left to paste into a contenteditable inserts
      // the clipboard's HTML, styles and all.
      e.preventDefault();
      if (disabled) return;

      const pills = onPaste(e.clipboardData);

      if (pills === null) {
        insertText((e.clipboardData?.getData("text/plain") ?? "").replace(/\r\n?/g, "\n"));
        return;
      }

      for (const { id } of pills) pending.current.add(id);

      insert((before, after) => {
        const nodes: Node[] = [];

        for (const { id, block } of pills) {
          if (block) {
            // A text pill gets a line to itself: a newline above unless it is
            // already at the start of one, and below unless one follows.
            const precededByBreak =
              nodes.length === 0
                ? before === "" || before.endsWith("\n")
                : nodes[nodes.length - 1].textContent === "\n";
            if (!precededByBreak) nodes.push(document.createTextNode("\n"));
            nodes.push(makeHost(id));
            nodes.push(document.createTextNode("\n"));
          } else {
            nodes.push(makeHost(id));
          }
        }

        // The trailing newline of a block pill is redundant if one already follows.
        const last = nodes[nodes.length - 1];
        if (last.textContent === "\n" && after.startsWith("\n")) nodes.pop();

        return nodes;
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;

      e.preventDefault();
      const sends =
        submitKey === "mod-enter" ? e.ctrlKey || e.metaKey : !e.shiftKey;
      if (sends) {
        onSubmit();
      } else {
        insertText("\n");
      }
    };

    return (
      <div className="relative">
        {value === "" && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute left-4 top-3 text-sm text-zinc-400",
              placeholderClassName,
            )}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={rootRef}
          data-react-fancy-composer-input=""
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          aria-disabled={disabled || undefined}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emit}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          style={maxHeight === undefined ? undefined : { maxHeight }}
          className={cn(
            "max-h-72 min-h-[4.5rem] w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-4 pt-3 text-sm outline-none",
            className,
          )}
        />
      </div>
    );
  },
);

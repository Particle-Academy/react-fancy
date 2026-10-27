import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "../Button/Button";
import type {
  ContentClipboardPayload,
  ContentClipboardWriter,
  ContentCopyEvent,
  ContentCopyKind,
} from "./ContentRenderer.types";

/** How long the check icon stays after a copy. */
const FEEDBACK_MS = 2000;
/** A clipboard write that never settles is a silent failure; give up after this. */
const WRITE_TIMEOUT_MS = 5000;

export interface CopyContextValue {
  code: boolean;
  table: boolean;
  /** Write, announce, and report one copy. Resolves to whether it worked. */
  copy: (payload: ContentClipboardPayload, button: HTMLElement) => Promise<boolean>;
}

export const CopyContext = createContext<CopyContextValue | null>(null);

/**
 * Default clipboard writer: text/html + text/plain via `ClipboardItem` where
 * the browser has it, else (or if that write rejects) plain `writeText`.
 * Throws when nothing could be written, so the caller can say so.
 */
export async function defaultClipboardWriter(payload: ContentClipboardPayload): Promise<void> {
  const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (!clip) throw new Error("Clipboard API unavailable");

  const Item = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (payload.html && Item && typeof clip.write === "function") {
    try {
      await clip.write([
        new Item({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Rich write refused (permissions, unsupported type): fall back to text.
    }
  }
  if (typeof clip.writeText !== "function") throw new Error("Clipboard writeText unavailable");
  await clip.writeText(payload.text);
}

/** Run a writer, treating a throw, a rejection, `false`, or a hang as failure. */
export async function runWriter(
  writer: ContentClipboardWriter,
  payload: ContentClipboardPayload,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => writer(payload)),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), WRITE_TIMEOUT_MS);
      }),
    ]);
    return result !== false;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Code exactly as written: the `<code>` text, minus the newline marked appends. */
export function codeText(pre: HTMLElement, fromMarkdown: boolean): string {
  const text = (pre.querySelector("code") ?? pre).textContent ?? "";
  return fromMarkdown && text.endsWith("\n") ? text.slice(0, -1) : text;
}

/** A table as TSV: tab between cells, newline between rows, no trailing newline. */
export function tableTsv(table: HTMLTableElement): string {
  const rows: string[] = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    // Only this table's own cells, not those of a table nested in a cell.
    if (tr.closest("table") !== table) continue;
    const cells = Array.from(tr.children).filter((c) => c.tagName === "TD" || c.tagName === "TH");
    rows.push(cells.map((c) => cellText(c)).join("\t"));
  }
  return rows.join("\n");
}

function cellText(cell: Element): string {
  const clone = cell.cloneNode(true) as Element;
  for (const br of Array.from(clone.querySelectorAll("br"))) br.replaceWith(" ");
  return (clone.textContent ?? "").replace(/[\t\r\n]+/g, " ").replace(/ {2,}/g, " ").trim();
}

interface Target {
  kind: ContentCopyKind;
  el: HTMLElement;
  host: HTMLElement;
}

/**
 * Sanitised HTML rendered with `dangerouslySetInnerHTML`, plus a react-fancy
 * copy `Button` portalled next to every `<pre>` and `<table>` in it.
 *
 * Each block is wrapped in a `data-react-fancy-content-copy-block` element and
 * the button lives beside the block, never inside it, so the button's own text
 * can never end up in what is copied.
 */
export function HtmlChunk({ html, fromMarkdown }: { html: string; fromMarkdown: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const ctx = useContext(CopyContext);
  const [targets, setTargets] = useState<Target[]>([]);
  const code = ctx?.code ?? false;
  const table = ctx?.table ?? false;
  // React 19 re-assigns innerHTML whenever this prop is a NEW object, even
  // with the same string, which would wipe the wrappers on every re-render
  // (including the one that mounts the buttons). One object per string.
  const inner = useMemo(() => ({ __html: html }), [html]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || (!code && !table)) {
      setTargets([]);
      return;
    }
    const found: Target[] = [];
    const selector = [code && "pre", table && "table"].filter(Boolean).join(",");
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      const kind: ContentCopyKind = el.tagName === "PRE" ? "code" : "table";
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-react-fancy-content-copy-block", kind);
      wrapper.className = kind === "code" ? "group relative" : "group relative flex flex-col";
      const host = document.createElement("div");
      host.setAttribute("data-react-fancy-content-copy-host", "");
      host.className =
        kind === "code" ? "absolute right-2 top-2 z-10" : "flex justify-end";
      el.replaceWith(wrapper);
      if (kind === "table") wrapper.append(host, el);
      else wrapper.append(el, host);
      found.push({ kind, el, host });
    }
    setTargets(found);
    return () => {
      for (const t of found) {
        const wrapper = t.host.parentElement;
        if (wrapper?.parentNode) wrapper.replaceWith(t.el);
      }
    };
  }, [html, code, table]);

  return (
    <>
      <div ref={ref} dangerouslySetInnerHTML={inner} />
      {targets.map((t, i) =>
        createPortal(
          <CopyButton kind={t.kind} target={t.el} fromMarkdown={fromMarkdown} />,
          t.host,
          `${i}`,
        ),
      )}
    </>
  );
}

type CopyState = "idle" | "copied" | "failed";

function CopyButton({
  kind,
  target,
  fromMarkdown,
}: {
  kind: ContentCopyKind;
  target: HTMLElement;
  fromMarkdown: boolean;
}) {
  const ctx = useContext(CopyContext);
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = useCallback(async () => {
    if (!ctx || !btn.current) return;
    const text =
      kind === "code" ? codeText(target, fromMarkdown) : tableTsv(target as HTMLTableElement);
    const ok = await ctx.copy({ kind, text, html: target.outerHTML }, btn.current);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), FEEDBACK_MS);
  }, [ctx, kind, target, fromMarkdown]);

  const idleLabel = kind === "code" ? "Copy code" : "Copy table";
  const label = state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : idleLabel;

  return (
    <Button
      ref={btn}
      type="button"
      size="xs"
      variant="ghost"
      icon={state === "copied" ? "check" : state === "failed" ? "x" : "copy"}
      aria-label={label}
      title={label}
      data-react-fancy-content-copy={kind}
      data-copy-state={state}
      onClick={onClick}
      className={
        kind === "code"
          ? "text-zinc-300 hover:bg-zinc-800 hover:text-white opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
          : "opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
      }
    />
  );
}

/** Build the copy pipeline a ContentRenderer root shares with its chunks. */
export function useCopyPipeline({
  writer,
  onCopy,
  rootRef,
  announce,
}: {
  writer: ContentClipboardWriter | undefined;
  onCopy: ((event: ContentCopyEvent) => void) | undefined;
  rootRef: RefObject<HTMLElement | null>;
  announce: (message: string) => void;
}) {
  // Read the latest props at click time without re-creating the context.
  const latest = useRef({ writer, onCopy, announce });
  latest.current = { writer, onCopy, announce };

  return useCallback(
    async (payload: ContentClipboardPayload, button: HTMLElement) => {
      const { writer: w, onCopy: report, announce: say } = latest.current;
      const ok = await runWriter(w ?? defaultClipboardWriter, payload);
      say(ok ? "Copied" : "Copy failed");
      const all = rootRef.current
        ? Array.from(rootRef.current.querySelectorAll("[data-react-fancy-content-copy]"))
        : [];
      report?.({ ...payload, index: all.indexOf(button), ok });
      return ok;
    },
    [rootRef],
  );
}

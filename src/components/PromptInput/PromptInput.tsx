import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Tooltip } from "../Tooltip";
import {
  InlinePasteEditor,
  PastedFilesInput,
  useInlinePaste,
  type ComposerPasteClassNames,
  type ComposerPastePreview,
  type InlinePasteEditorHandle,
} from "../PastePills";
import {
  browserPlatformHints,
  detectPlatform,
  modifierKeyLabel,
  type FancyPlatform,
} from "../../utils/platform";

/**
 * PromptInput — the chat composer every AI app rebuilds. Auto-growing
 * multi-line input with:
 *
 *   • slash-command picker (`/` triggers a filtered command palette,
 *     ↑/↓ navigate, Enter inserts)
 *   • mention picker (`@` triggers, filtered against `mentions`)
 *   • drop-to-attach (drag files anywhere on the surface), paste-to-attach
 *     (a pasted screenshot becomes an attachment) + chip bar
 *   • submit on ⌘/Ctrl+Enter (plain Enter inserts a newline)
 *   • live token-budget meter (green → amber → red as headroom drops)
 *
 * Wire it up:
 *
 *   <PromptInput
 *     budgetTokens={32000}
 *     commands={[{ name: "/rewrite", hint: "rewrite the selection" }]}
 *     mentions={[{ id: "ada", name: "Ada", kind: "person" }]}
 *     onSubmit={(text, attachments) => sendToAgent(text, attachments)}
 *   />
 */
export type PromptCmd = { name: string; hint: string };
export type PromptMention = {
  id: string;
  name: string;
  kind: "agent" | "file" | "person" | string;
};
export type PromptAttachment = {
  id: string;
  name: string;
  bytes: number;
  /**
   * The file the user actually attached.
   *
   * Optional because an attachment restored from a server has no File — but for
   * anything the user dropped or picked it is always present. Without it a host
   * can render a chip and nothing else: no POST, no FormData, no send-to-model.
   */
  file?: File;
  /** MIME type. Hosts branch on this to decide whether a file can be sent as-is. */
  type?: string;
};

/**
 * `...rest` reaches the root surface, so a consumer or a bridge can tag the
 * composer with its own `data-*` handle. The component named every prop it
 * used and had no rest spread, which means a `data-handle` put on it was
 * DROPPED — silently, since React discards unknown props and the component
 * still renders perfectly. That is issue #22 all over again, and the contract
 * calls it out: "Each interactive element has a stable identity. Agents never
 * guess DOM."
 */
export interface PromptInputProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSubmit" | "className"> {
  /** Extra classes on the root surface. MERGED, never replaced. */
  className?: string;
  /** Token budget for the meter. */
  budgetTokens: number;
  /** Slash-commands. Names must start with `/`. */
  commands?: PromptCmd[];
  /** @-mentions. */
  mentions?: PromptMention[];
  /** Show the keyboard hint ("Ctrl + Enter to send", "⌘ + Enter" on a Mac). */
  showHint?: boolean;
  /**
   * Which modifier the hint and the default placeholder NAME. Omit it and the
   * component reads the platform after mount, which is the right answer for an
   * ordinary web app.
   *
   * Pass it when the host knows better than `navigator` does — an Electron
   * renderer forwarding `process.platform`, a remote session where the
   * keyboard is not the one running the browser, or a test that needs the
   * branch it is not sitting on. The pressed keys are unaffected either way:
   * submit is `⌘/Ctrl+Enter` on every platform, so this only decides which
   * true key gets named.
   */
  platform?: FancyPlatform;
  /** Called on ⌘/Ctrl+Enter or send button. */
  onSubmit: (text: string, attachments: PromptAttachment[]) => void;
  /**
   * Placeholder text. Defaults to a hint naming the modifier THIS platform
   * actually has, so leaving it unset is the better option — a hardcoded
   * placeholder is the other place a `⌘` ends up in front of a Windows user.
   */
  placeholder?: string;
  /** Rough estimator: chars-per-token. Defaults to 4. */
  charsPerToken?: number;
  /** Color → CSS chip mapping for mention kinds. */
  mentionColor?: Record<string, string>;
  /** Optional max textarea height in px. Defaults to 280. */
  maxHeight?: number;
  /**
   * Rendered INSIDE the rounded shell, ABOVE the attachments bar and
   * textarea. Use this slot for a drawer of tools/files/prompts/etc. so
   * the drawer and composer share one visual panel. See {@link ChatDrawer}.
   */
  aboveInput?: ReactNode;
  /**
   * Hold a paste of at least this many characters as a pill IN the message,
   * where it was pasted: on a line of its own, its full text put back in place
   * when clicked, and expanded where it sits when sent. Omit it and paste is
   * unchanged. Setting this (or `pasteImages`) swaps the textarea for an inline
   * editor that keeps the `/` and `@` pickers and the send key.
   */
  pasteThreshold?: number;
  /**
   * A pasted image becomes an inline `Pasted image N` pill AND reaches
   * `onSubmit`'s attachments, with its File, in message order; the text marks
   * where it sat as `[Pasted image N]`. Without it a pasted image is an
   * ordinary attachment chip, as before.
   */
  pasteImages?: boolean;
  /** Characters of a held paste shown at EACH end of its hover preview. Default 20. */
  previewChars?: number;
  /** Replace the paste pills' hover popover content. */
  renderPastePreview?: (preview: ComposerPastePreview) => ReactNode;
  /** Restyle the paste pills, their popover and the inline editor. Merged onto the defaults. */
  pasteClassNames?: ComposerPasteClassNames;
  /**
   * Submit pasted images with an enclosing `<form>`, under this field name: a
   * hidden `<input type="file" multiple>` holds the images still in the message,
   * in message order. Needs `pasteImages`. They reach `onSubmit` either way.
   */
  pasteFilesName?: string;
  /** `"icon"`: an icon-only attach button whose tooltip says what it does. Default `"label"`. */
  attachButton?: "label" | "icon";
  /**
   * `"icon"`: a compact icon send button whose tooltip carries the shortcut —
   * replacing the inline `Ctrl + Enter to send` hint. Default `"label"`.
   */
  sendButton?: "label" | "icon";
  /**
   * Tokens already used — the caller's REAL value, e.g. an agent's context
   * usage. The meter shows this plus the estimate for the draft. Without it the
   * meter estimates the draft alone, as before.
   */
  usedTokens?: number;
  /**
   * `"always"` (default) — as before. `"near-limit"` — hidden until usage passes
   * `meterShowAt`, muted until `meterWarnAt`, warning colour past that.
   * `"hidden"` — never shown.
   */
  meter?: "always" | "near-limit" | "hidden";
  /** Fraction of `budgetTokens` at which a `"near-limit"` meter appears. Default 0.75. */
  meterShowAt?: number;
  /** Fraction of `budgetTokens` past which a `"near-limit"` meter takes the warning colour. Default 0.9. */
  meterWarnAt?: number;
}

const DEFAULT_MENTION_COLOR: Record<string, string> = {
  agent: "#a855f7",
  file: "#10b981",
  person: "#3b82f6",
};

export function PromptInput({
  budgetTokens,
  commands = [],
  mentions = [],
  showHint = true,
  platform,
  onSubmit,
  placeholder,
  charsPerToken = 4,
  mentionColor,
  maxHeight = 280,
  aboveInput,
  className,
  pasteThreshold,
  pasteImages = false,
  previewChars = 20,
  renderPastePreview,
  pasteClassNames,
  pasteFilesName,
  attachButton = "label",
  sendButton = "label",
  usedTokens,
  meter = "always",
  meterShowAt = 0.75,
  meterWarnAt = 0.9,
  ...rest
}: PromptInputProps) {
  const [text, setText] = useState("");
  /** Inline pills need an editor that can hold them; a textarea cannot. */
  const inline = pasteThreshold !== undefined || pasteImages;
  const editorRef = useRef<InlinePasteEditorHandle>(null);
  const paste = useInlinePaste({
    pasteThreshold,
    pasteImages,
    previewChars,
    renderPastePreview,
    classNames: pasteClassNames,
    disabled: false,
    editorRef,
  });
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [picker, setPicker] = useState<null | {
    kind: "cmd" | "mention";
    start: number;
    query: string;
    cursor: number;
  }>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const colors = mentionColor ?? DEFAULT_MENTION_COLOR;

  /**
   * Resolved AFTER mount, never during render.
   *
   * `navigator` read during render disagrees with the server's HTML and
   * hydration patches it — so the fix for a wrong label would have introduced a
   * hydration mismatch instead. The first paint names `Ctrl`, which is
   * pressable on every platform including a Mac, and an Apple client swaps to
   * `⌘` on the next tick. A prop, when given, wins outright and no detection
   * runs at all.
   */
  const [detected, setDetected] = useState<FancyPlatform>("generic");
  useEffect(() => {
    if (platform) return;
    setDetected(detectPlatform(browserPlatformHints()));
  }, [platform]);
  const modKey = modifierKeyLabel(platform ?? detected);

  const resolvedPlaceholder =
    placeholder ??
    `Ask anything. Type / for commands, @ for mentions. ${modKey}+Enter to send.`;

  // Estimated from what will actually be SENT — pills expanded — so a held
  // paste counts for its text, not for the few characters of its marker.
  const draftTokens = useMemo(
    () =>
      Math.ceil((inline ? paste.expand(text) : text).length / Math.max(1, charsPerToken)),
    [text, inline, paste, charsPerToken],
  );
  const tokens = (usedTokens ?? 0) + draftTokens;
  const ratio = Math.min(1, tokens / budgetTokens);
  const meterLevel: "ok" | "caution" | "warn" | "muted" | null =
    meter === "hidden"
      ? null
      : meter === "near-limit"
        ? ratio < meterShowAt
          ? null
          : ratio >= meterWarnAt
            ? "warn"
            : "muted"
        : ratio < 0.6
          ? "ok"
          : ratio < 0.85
            ? "caution"
            : "warn";
  const meterColor =
    meterLevel === "ok"
      ? "#10b981"
      : meterLevel === "caution"
        ? "#f59e0b"
        : meterLevel === "warn"
          ? "#ef4444"
          : "#a1a1aa";

  const filteredCmds = useMemo(
    () =>
      picker?.kind === "cmd"
        ? commands.filter((c) =>
            c.name.slice(1).toLowerCase().startsWith(picker.query.toLowerCase()),
          )
        : [],
    [picker, commands],
  );
  const filteredMentions = useMemo(
    () =>
      picker?.kind === "mention"
        ? mentions.filter((m) =>
            m.name.toLowerCase().includes(picker.query.toLowerCase()),
          )
        : [],
    [picker, mentions],
  );
  const items: Array<PromptCmd | PromptMention> =
    picker?.kind === "cmd"
      ? filteredCmds
      : picker?.kind === "mention"
        ? filteredMentions
        : [];

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(maxHeight, ta.scrollHeight) + "px";
  }, [text, maxHeight]);

  const updateText = (next: string, caret: number) => {
    setText(next);
    let triggerIdx = -1;
    let triggerKind: "cmd" | "mention" | null = null;
    for (let i = caret - 1; i >= 0; i--) {
      const ch = next[i];
      if (ch === "@") {
        triggerKind = "mention";
        triggerIdx = i;
        break;
      }
      if (ch === "/" && (i === 0 || /\s/.test(next[i - 1] ?? ""))) {
        triggerKind = "cmd";
        triggerIdx = i;
        break;
      }
      if (/\s/.test(ch)) break;
    }
    if (triggerKind !== null && triggerIdx >= 0) {
      const query = next.slice(triggerIdx + 1, caret);
      setPicker({ kind: triggerKind, start: triggerIdx, query, cursor: 0 });
    } else {
      setPicker(null);
    }
  };

  const insertChoice = (i: number) => {
    if (!picker || items.length === 0) return;
    const choice = items[i] ?? items[0];
    const insert =
      picker.kind === "cmd"
        ? (choice as PromptCmd).name + " "
        : `@${(choice as PromptMention).id} `;
    const before = text.slice(0, picker.start);
    const after = text.slice(picker.start + 1 + picker.query.length);
    const next = before + insert + after;
    setText(next);
    setPicker(null);
    if (inline) {
      // The editor rebuilds from the value and puts the caret back itself.
      editorRef.current?.setValue(next, before.length + insert.length);
      return;
    }
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      const pos = before.length + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const submit = () => {
    // A message that is only a paste counts: its marker is in `text`.
    if (!text.trim() && attachments.length === 0) return;

    if (inline) {
      // Every pill goes out where it sits; pasted images join the attachments
      // in message order, with their Files, so a host sends them like any other.
      const pastedImages: PromptAttachment[] = paste.imagesIn(text).map((image) => ({
        id: image.id,
        name: image.file.name,
        bytes: image.file.size,
        file: image.file,
        type: image.file.type,
      }));
      onSubmit(paste.expand(text), [...attachments, ...pastedImages]);
      paste.clear();
    } else {
      onSubmit(text, attachments);
    }
    setText("");
    setAttachments([]);
    setPicker(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (picker) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPicker((p) =>
          p ? { ...p, cursor: Math.min(items.length - 1, p.cursor + 1) } : p,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPicker((p) => (p ? { ...p, cursor: Math.max(0, p.cursor - 1) } : p));
        return;
      }
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && items.length > 0) {
        e.preventDefault();
        insertChoice(picker.cursor);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPicker(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  /**
   * Build attachments from a FileList, KEEPING the File.
   *
   * Shared by the drop handler and the picker so the two cannot drift — the
   * picker being a second, subtly different copy of this is exactly how one of
   * them would end up dropping the File again.
   */
  const attach = (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;

    setAttachments((cur) => [
      ...cur,
      ...files.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        bytes: f.size,
        file: f,
        type: f.type,
      })),
    ]);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    attach(e.dataTransfer.files);
  };

  /**
   * Paste a screenshot, get an attachment.
   *
   * There was no paste handler at all, so a pasted image did nothing — no chip,
   * no error — and a host that had swapped its own paste-capable textarea for
   * this component lost the feature without noticing.
   *
   * Files attach only when the clipboard carries NO plain text. Word, Excel and
   * most editors put a picture of the selection beside the text; attaching that
   * would turn every pasted sentence into a screenshot of the sentence. A pure
   * image paste has nothing for the browser to insert, so the default is
   * prevented only then, and a text paste is never touched.
   */
  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const data = e.clipboardData;
    const files = Array.from(data?.files ?? []);

    if (files.length === 0 || (data?.getData("text/plain") ?? "") !== "") return;

    e.preventDefault();
    attach(files);
  };

  return (
    <div
      // Spread FIRST so an internal handler or data attribute cannot be
      // clobbered from outside, and so a missing one fails loudly here rather
      // than at a consumer's selector. `className` is merged below instead.
      {...rest}
      // The component had no root handle at all, so an agent reading the
      // composer had to guess at classes. The drag state is on it too: a bridge
      // that wants to know whether a drop is in flight should not have to infer
      // it from Tailwind colours.
      data-react-fancy-prompt-input=""
      data-react-fancy-prompt-input-drag={dragOver ? "over" : "idle"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={cn(
        "relative rounded-md border bg-white transition dark:bg-zinc-900",
        dragOver
          ? "border-violet-400 bg-violet-50/50 dark:border-violet-600 dark:bg-violet-950/30"
          : "border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      {aboveInput && (
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          {aboveInput}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          {attachments.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] dark:bg-zinc-800"
            >
              <Icon name="paperclip" size="xs" className="text-zinc-400" />
              <span className="font-mono">{a.name}</span>
              <span className="text-zinc-400">{fmtSize(a.bytes)}</span>
              <button
                onClick={() =>
                  setAttachments((cur) => cur.filter((x) => x.id !== a.id))
                }
                className="opacity-50 hover:opacity-100"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        {inline ? (
          <>
            <InlinePasteEditor
              ref={editorRef}
              value={text}
              known={paste.known}
              onChange={(next, caret) => {
                updateText(next, caret);
                paste.prune(next);
              }}
              onSubmit={submit}
              submitKey="mod-enter"
              onKeyDown={onKeyDown}
              onPaste={paste.decidePaste}
              onHostsChange={paste.onHostsChange}
              placeholder={resolvedPlaceholder}
              disabled={false}
              maxHeight={maxHeight}
              placeholderClassName="left-3 top-2.5 text-[14px] leading-relaxed"
              className={cn(
                "block min-h-[5.5rem] px-3 py-2.5 text-[14px] leading-relaxed",
                pasteClassNames?.input,
              )}
            />
            {paste.portals}
            {pasteImages && pasteFilesName && (
              <PastedFilesInput
                name={pasteFilesName}
                files={paste.imagesIn(text).map((i) => i.file)}
              />
            )}
          </>
        ) : (
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => updateText(e.target.value, e.target.selectionStart)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={resolvedPlaceholder}
            spellCheck={false}
            className="block w-full resize-none bg-transparent px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-zinc-400"
            rows={3}
          />
        )}

        {picker && items.length > 0 && (
          <div className="absolute bottom-full left-2 z-10 mb-1 w-72 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 bg-zinc-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              {picker.kind === "cmd" ? "Commands" : "Mention"} · {items.length}
            </div>
            <ul className="max-h-56 overflow-y-auto">
              {items.map((item, i) => {
                const active = i === picker.cursor;
                if (picker.kind === "cmd") {
                  const c = item as PromptCmd;
                  return (
                    <li
                      key={c.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertChoice(i);
                      }}
                      onMouseEnter={() =>
                        setPicker((p) => (p ? { ...p, cursor: i } : p))
                      }
                      className={`cursor-pointer px-2 py-1.5 text-[12px] ${
                        active
                          ? "bg-violet-100 dark:bg-violet-900/30"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <div className="font-mono font-medium text-violet-700 dark:text-violet-300">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-zinc-500">{c.hint}</div>
                    </li>
                  );
                }
                const m = item as PromptMention;
                return (
                  <li
                    key={m.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertChoice(i);
                    }}
                    onMouseEnter={() =>
                      setPicker((p) => (p ? { ...p, cursor: i } : p))
                    }
                    className={`flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[12px] ${
                      active
                        ? "bg-violet-100 dark:bg-violet-900/30"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colors[m.kind] ?? "#71717a" }}
                    />
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-zinc-400">
                      {m.kind}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-zinc-200 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/40">
        <Tooltip content={attachButton === "icon" ? "Attach files — or drop them here" : "Drop files here, or click"}>
          <Button
            variant="ghost"
            size="sm"
            icon="paperclip"
            className="shrink-0"
            data-react-fancy-prompt-input-attach=""
            // An icon alone has no name; the tooltip is not one a screen reader reads.
            aria-label={attachButton === "icon" ? "Attach files" : undefined}
            onClick={() => fileRef.current?.click()}
          >
            {attachButton === "icon" ? null : "attach"}
          </Button>
        </Tooltip>
        {/*
          The button above shipped with a no-op onClick and a tooltip reading
          "Drop files here, or click" — an affordance that lied. Drop-only also
          meant keyboard and touch users could not attach at all.

          It then shipped with a literal paperclip EMOJI as its icon, which
          needs a COLOUR
          EMOJI FONT — not merely broad coverage — so a lean container renders a
          tofu box where the affordance should be. `icon="paperclip"` draws an
          SVG from the kit's own icon layer, which is the same reason the rest of
          the suite does not hand-roll iconography.
        */}
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            attach(e.target.files);
            // Let the same file be picked twice in a row.
            e.target.value = "";
          }}
        />
        {meterLevel !== null && (
          <div
            data-react-fancy-prompt-input-meter=""
            data-level={meterLevel}
            className="ml-2 flex min-w-0 items-center gap-1.5 overflow-hidden"
          >
            <div className="h-1.5 w-24 shrink overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${ratio * 100}%`, backgroundColor: meterColor }}
              />
            </div>
            <span className="font-mono text-[11px]" style={{ color: meterColor }}>
              {fmtTokens(tokens)} / {fmtTokens(budgetTokens)}
            </span>
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* With an icon send button the shortcut lives in its tooltip instead. */}
          {showHint && sendButton !== "icon" && (
            <span
              className="hidden text-[10px] text-zinc-500 sm:inline"
              data-react-fancy-prompt-input-hint={modKey === "⌘" ? "apple" : "generic"}
            >
              <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5 font-mono text-[9px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {modKey}
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5 font-mono text-[9px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Enter
              </kbd>{" "}
              to send
            </span>
          )}
          {sendButton === "icon" ? (
            <Tooltip content={`Send · ${modKey}+Enter`}>
              <Button
                color="violet"
                size="sm"
                icon="arrow-up"
                className="shrink-0"
                data-react-fancy-prompt-input-send=""
                aria-label="Send"
                onClick={submit}
              />
            </Tooltip>
          ) : (
            <Button
              color="violet"
              size="sm"
              iconTrailing="arrow-right"
              className="shrink-0"
              data-react-fancy-prompt-input-send=""
              onClick={submit}
            >
              send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtTokens(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

function fmtSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

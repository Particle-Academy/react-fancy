import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "../Button";
import { Tooltip } from "../Tooltip";

/**
 * PromptInput — the chat composer every AI app rebuilds. Auto-growing
 * multi-line input with:
 *
 *   • slash-command picker (`/` triggers a filtered command palette,
 *     ↑/↓ navigate, Enter inserts)
 *   • mention picker (`@` triggers, filtered against `mentions`)
 *   • drop-to-attach (drag files anywhere on the surface) + chip bar
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
export type PromptAttachment = { id: string; name: string; bytes: number };

export interface PromptInputProps {
  /** Token budget for the meter. */
  budgetTokens: number;
  /** Slash-commands. Names must start with `/`. */
  commands?: PromptCmd[];
  /** @-mentions. */
  mentions?: PromptMention[];
  /** Show the keyboard hint ("⌘ + Enter to send"). */
  showHint?: boolean;
  /** Called on ⌘/Ctrl+Enter or send button. */
  onSubmit: (text: string, attachments: PromptAttachment[]) => void;
  /** Placeholder text. */
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
  onSubmit,
  placeholder = "Ask anything. Type / for commands, @ for mentions. ⌘/Ctrl+Enter to send.",
  charsPerToken = 4,
  mentionColor,
  maxHeight = 280,
  aboveInput,
}: PromptInputProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const [picker, setPicker] = useState<null | {
    kind: "cmd" | "mention";
    start: number;
    query: string;
    cursor: number;
  }>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const colors = mentionColor ?? DEFAULT_MENTION_COLOR;

  const tokens = useMemo(
    () => Math.ceil(text.length / Math.max(1, charsPerToken)),
    [text, charsPerToken],
  );
  const ratio = Math.min(1, tokens / budgetTokens);
  const meterColor = ratio < 0.6 ? "#10b981" : ratio < 0.85 ? "#f59e0b" : "#ef4444";

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
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      const pos = before.length + insert.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const submit = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSubmit(text, attachments);
    setText("");
    setAttachments([]);
    setPicker(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setAttachments((cur) => [
      ...cur,
      ...files.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        name: f.name,
        bytes: f.size,
      })),
    ]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`relative rounded-md border transition ${
        dragOver
          ? "border-violet-400 bg-violet-50/50 dark:border-violet-600 dark:bg-violet-950/30"
          : "border-zinc-200 dark:border-zinc-800"
      } bg-white dark:bg-zinc-900`}
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
              <span>📎</span>
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
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => updateText(e.target.value, e.target.selectionStart)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          className="block w-full resize-none bg-transparent px-3 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-zinc-400"
          rows={3}
        />

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
        <Tooltip content="Drop files here, or click">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => {
              /* host can wire its own file picker; default no-op */
            }}
          >
            📎 attach
          </Button>
        </Tooltip>
        <div className="ml-2 flex min-w-0 items-center gap-1.5 overflow-hidden">
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
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {showHint && (
            <span className="hidden text-[10px] text-zinc-500 sm:inline">
              <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5 font-mono text-[9px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                ⌘
              </kbd>{" "}
              +{" "}
              <kbd className="rounded border border-zinc-300 bg-zinc-50 px-1 py-0.5 font-mono text-[9px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Enter
              </kbd>{" "}
              to send
            </span>
          )}
          <Button color="violet" size="sm" className="shrink-0" onClick={submit}>
            send →
          </Button>
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

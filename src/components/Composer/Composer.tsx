import { forwardRef, useCallback, useRef } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import type { ComposerProps, HeldPaste } from "./Composer.types";

/** Characters of a held paste shown at each end of the hover preview. */
const PREVIEW_CHARS = 20;

/**
 * Thousands separators, written out rather than left to `toLocaleString()`.
 *
 * The number exists so someone can size the paste at a glance, and `2,036` sizes
 * faster than `2036`. It is not left to the runtime locale because the label beside
 * it ("Pasted text") is not localised either, so a locale-formatted number next to
 * an English noun would be half a translation.
 */
function withSeparators(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** First and last N characters, middle elided. The ends say WHICH paste this is. */
function endsOf(text: string): string {
  if (text.length <= PREVIEW_CHARS * 2) return text;

  return `${text.slice(0, PREVIEW_CHARS)} … ${text.slice(-PREVIEW_CHARS)}`;
}

export const Composer = forwardRef<HTMLDivElement, ComposerProps>(
  function Composer(
    {
      value: controlledValue,
      defaultValue = "",
      onChange,
      onSubmit,
      placeholder = "Type a message...",
      actions,
      disabled = false,
      className,
      pasteThreshold,
      heldPastes: controlledHeldPastes,
      onHeldPastesChange,
    },
    ref,
  ) {
    const [value, setValue] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );
    const [heldPastes, setHeldPastes] = useControllableState<HeldPaste[]>(
      controlledHeldPastes,
      [],
      onHeldPastesChange,
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const nextId = useRef(0);

    /*
     * A large paste is held, not inserted.
     *
     * Requested by a consumer who had built and proven it against their own
     * composer: paste a transcript and the input becomes a scrolling wall, so the
     * message you were half way through writing is above the fold and the only way
     * to see what you are about to send is to scroll your own input.
     */
    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (!pasteThreshold || pasteThreshold <= 0) return;

        const text = e.clipboardData?.getData("text/plain") ?? "";

        // Below the threshold, do NOTHING — not even look busy. This is the common
        // case and the easiest thing to regress.
        if (text.length < pasteThreshold) return;

        e.preventDefault();
        nextId.current += 1;
        const id = `paste-${nextId.current}`;
        setHeldPastes((current) => [...current, { id, text }]);
      },
      [pasteThreshold, setHeldPastes],
    );

    /** Everything the person believes they are sending, in the order they built it. */
    const composeOutgoing = useCallback(
      () => [value, ...heldPastes.map((p) => p.text)].filter(Boolean).join("\n\n"),
      [value, heldPastes],
    );

    const hasContent = value.trim().length > 0 || heldPastes.length > 0;

    const handleSubmit = useCallback(() => {
      if (!hasContent || disabled) return;

      /*
       * THE DANGEROUS STATE, and the reason this feature needed a spec rather than
       * a guess. A pill reads as "your paste is attached" — so a send that drops it
       * means asking a question about a document without the document, and nobody
       * can tell: the sender believes it went, the receiver sees a question about
       * nothing.
       *
       * Held pastes go out in arrival order, after what was typed, because people
       * type the question BEFORE pasting the thing it is about.
       */
      onSubmit?.(composeOutgoing());
      setValue("");
      setHeldPastes([]);
      textareaRef.current?.focus();
    }, [hasContent, disabled, onSubmit, composeOutgoing, setValue, setHeldPastes]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    /** Click a pill: dump it into the input, APPENDED to what is already typed. */
    const insertPaste = useCallback(
      (paste: HeldPaste) => {
        setValue((current) => (current ? `${current}\n\n${paste.text}` : paste.text));
        setHeldPastes((current) => current.filter((p) => p.id !== paste.id));
        textareaRef.current?.focus();
      },
      [setValue, setHeldPastes],
    );

    /** Discard without inserting. Without this the only way out is in-then-delete. */
    const discardPaste = useCallback(
      (id: string) => setHeldPastes((current) => current.filter((p) => p.id !== id)),
      [setHeldPastes],
    );

    return (
      <div
        data-react-fancy-composer=""
        ref={ref}
        className={cn(
          "rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
          disabled && "opacity-50",
          className,
        )}
      >
        {heldPastes.length > 0 && (
          <div
            data-react-fancy-composer-paste-pills=""
            className="flex flex-wrap gap-1.5 px-3 pt-3"
          >
            {heldPastes.map((paste) => (
              // `group` + `group-hover` rather than hover state: the preview is
              // presentation, and a useState for it would be one more thing an
              // agent could desynchronise.
              <span key={paste.id} className="group relative inline-flex">
                <button
                  type="button"
                  data-react-fancy-composer-paste-pill={paste.id}
                  onClick={() => insertPaste(paste)}
                  disabled={disabled}
                  title="Insert this text into the message"
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <span>
                    Pasted text · {withSeparators(paste.text.length)} characters
                  </span>
                </button>

                <button
                  type="button"
                  data-react-fancy-composer-paste-pill-remove={paste.id}
                  onClick={() => discardPaste(paste.id)}
                  disabled={disabled}
                  aria-label="Discard this pasted text"
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full px-1 text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-100"
                >
                  ×
                </button>

                <span
                  data-react-fancy-composer-paste-pill-preview={paste.id}
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-xs whitespace-pre-wrap break-all rounded-md bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {endsOf(paste.text)}
                </span>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-zinc-400"
        />
        <div className="flex items-center justify-between border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <div className="flex items-center gap-1">{actions}</div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !hasContent}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Send
          </button>
        </div>
      </div>
    );
  },
);

Composer.displayName = "Composer";

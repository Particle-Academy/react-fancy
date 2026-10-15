import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePastePills, type HeldPaste } from "../../hooks/use-paste-pills";
import { InlinePill, endsOf, withSeparators } from "./InlinePill";
import {
  InlinePasteEditor,
  type InlinePasteEditorHandle,
  type PillToInsert,
} from "./InlinePasteEditor";
import { expandMarkers, markedIds, type HeldImage } from "./paste-markers";
import type { ComposerPastePreview, ComposerProps } from "./Composer.types";

/** Characters of a held paste shown at each end of the hover preview, unless `previewChars` says otherwise. */
const PREVIEW_CHARS = 20;

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
      pastePlacement = "above",
      pasteImages = false,
      previewChars = PREVIEW_CHARS,
      renderPastePreview,
      classNames,
      heldPastes: controlledHeldPastes,
      onHeldPastesChange,
      heldImages: controlledHeldImages,
      onHeldImagesChange,
    },
    ref,
  ) {
    const inline = pastePlacement === "inline";
    const [value, setValue] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );
    /*
     * The holding logic lives in `usePastePills` and this is its first caller.
     *
     * It moved out in 5.32.0 because the estate that specified the feature cannot
     * use this component at all — their chat input is a contenteditable rendering
     * inline tag badges, which a textarea cannot do. One implementation rather than
     * two: two copies of a rule drift, and the copy nobody reads is the one that
     * rots. The rule that must not drift is the one below — a send with pills still
     * closed carries the text.
     */
    const pills = usePastePills({
      threshold: pasteThreshold,
      heldPastes: controlledHeldPastes,
      onHeldPastesChange,
    });
    const heldPastes = pills.heldPastes;
    const [heldImages, setHeldImages] = useControllableState<HeldImage[]>(
      controlledHeldImages,
      [],
      onHeldImagesChange,
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editorRef = useRef<InlinePasteEditorHandle>(null);
    const imageCount = useRef(0);

    const known = useMemo(
      () => new Set([...heldPastes.map((p) => p.id), ...heldImages.map((i) => i.id)]),
      [heldPastes, heldImages],
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // Composable by design, so this reads as a question rather than a handover.
        // Nothing else here wants the paste, so the answer is simply ignored.
        pills.handlePaste(e);
      },
      [pills],
    );

    const holdImage = useCallback(
      (file: File): string => {
        let id: string;
        do {
          imageCount.current += 1;
          id = `image-${imageCount.current}`;
        } while (heldImages.some((i) => i.id === id));

        const image = { id, file, label: `Pasted image ${imageCount.current}` };
        setHeldImages((current) => [...current, image]);

        return id;
      },
      [heldImages, setHeldImages],
    );

    /** Inline placement: decide what a paste becomes. `null` means "just text". */
    const decidePaste = useCallback(
      (data: DataTransfer | null): PillToInsert[] | null => {
        const text = data?.getData("text/plain") ?? "";

        // Only a PURE image paste: a clipboard with text as well usually carries a
        // picture OF that text (copying from a document), and holding it would turn
        // every pasted sentence into a screenshot of the sentence.
        if (pasteImages && text === "") {
          const files = Array.from(data?.files ?? []).filter((f) =>
            f.type.startsWith("image/"),
          );
          if (files.length > 0) {
            return files.map((file) => ({ id: holdImage(file), block: false }));
          }
        }

        if (pasteThreshold && pasteThreshold > 0 && text.length >= pasteThreshold) {
          return [{ id: pills.hold(text), block: true }];
        }

        return null;
      },
      [pasteImages, pasteThreshold, holdImage, pills],
    );

    /*
     * Inline placement: the message is the record of what is attached. A pill
     * backspaced out of it is no longer attached, so its held entry goes too —
     * otherwise state would say "attached" about something the message no longer
     * contains, which is the second-place-to-answer problem markers exist to end.
     */
    const handleInlineChange = useCallback(
      (next: string) => {
        setValue(next);

        const present = new Set(markedIds(next));
        for (const paste of heldPastes) if (!present.has(paste.id)) pills.remove(paste.id);
        if (heldImages.some((i) => !present.has(i.id))) {
          setHeldImages((current) => current.filter((i) => present.has(i.id)));
        }
      },
      [setValue, heldPastes, heldImages, pills, setHeldImages],
    );

    const [hosts, setHosts] = useState<ReadonlyMap<string, HTMLElement>>(new Map());
    const handleHostsChange = useCallback((next: ReadonlyMap<string, HTMLElement>) => {
      setHosts((prev) => {
        if (prev.size === next.size && [...next].every(([id, el]) => prev.get(id) === el)) {
          return prev;
        }
        return next;
      });
    }, []);

    /** Everything the person believes they are sending, in the order they built it. */
    const composeOutgoing = useCallback(() => {
      if (inline) return expandMarkers(value, heldPastes, heldImages);

      return [value, ...heldPastes.map((p) => p.text)].filter(Boolean).join("\n\n");
    }, [inline, value, heldPastes, heldImages]);

    const hasContent = value.trim().length > 0 || (!inline && heldPastes.length > 0);

    const focusInput = useCallback(() => {
      if (inline) editorRef.current?.focus();
      else textareaRef.current?.focus();
    }, [inline]);

    const handleSubmit = useCallback(() => {
      if (!hasContent || disabled) return;

      /*
       * THE DANGEROUS STATE, and the reason this feature needed a spec rather than
       * a guess. A pill reads as "your paste is attached" — so a send that drops it
       * means asking a question about a document without the document, and nobody
       * can tell: the sender believes it went, the receiver sees a question about
       * nothing.
       *
       * Above the input, held pastes go out in arrival order after what was typed,
       * because people type the question BEFORE pasting the thing it is about.
       * Inline, every pill goes out exactly where it sits.
       */
      const order = markedIds(value);
      const images = inline
        ? order.flatMap((id) => heldImages.filter((i) => i.id === id))
        : [];

      onSubmit?.(composeOutgoing(), { images });
      setValue("");
      pills.clear();
      setHeldImages([]);
      focusInput();
    }, [
      hasContent,
      disabled,
      value,
      inline,
      heldImages,
      onSubmit,
      composeOutgoing,
      setValue,
      pills,
      setHeldImages,
      focusInput,
    ]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    /** Above the input: click a pill to dump it in, APPENDED to what is already typed. */
    const insertPaste = useCallback(
      (paste: HeldPaste) => {
        // `expand` removes it and hands back the text; inserting is this
        // component's job because the hook owns no DOM.
        const text = pills.expand(paste.id);

        if (text === undefined) return;

        setValue((current) => (current ? `${current}\n\n${text}` : text));
        textareaRef.current?.focus();
      },
      [pills, setValue],
    );

    /** Inline: click a text pill and its full text takes the pill's place. */
    const expandInline = useCallback(
      (id: string) => {
        const text = pills.expand(id);

        if (text === undefined) return;

        editorRef.current?.replacePill(id, text);
      },
      [pills],
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
        {!inline && heldPastes.length > 0 && (
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
                  // No `title`. A native tooltip plus the hover preview below
                  // renders TWO tooltips on the same hover, at different delays.
                  // The label says what clicking does; the preview says what the
                  // text is, and it is linked rather than merely adjacent so a
                  // screen reader reaches it too.
                  aria-label={`Insert this pasted text, ${withSeparators(paste.text.length)} characters`}
                  aria-describedby={`${paste.id}-preview`}
                  // `pr-7` leaves room for the absolutely-positioned × that sits
                  // over this button's right edge. With a smaller right padding the
                  // × lands on top of the label.
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-7 text-xs text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
                    classNames?.pill,
                    classNames?.textPill,
                  )}
                >
                  <span>
                    Pasted text · {withSeparators(paste.text.length)} characters
                  </span>
                </button>

                <button
                  type="button"
                  data-react-fancy-composer-paste-pill-remove={paste.id}
                  onClick={() => pills.remove(paste.id)}
                  disabled={disabled}
                  aria-label="Discard this pasted text"
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 rounded-full px-1 text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-100",
                    classNames?.remove,
                  )}
                >
                  ×
                </button>

                <span
                  id={`${paste.id}-preview`}
                  data-react-fancy-composer-paste-pill-preview={paste.id}
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden max-w-xs whitespace-pre-wrap break-all rounded-md bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-100 dark:text-zinc-900",
                    classNames?.preview,
                  )}
                >
                  {renderPastePreview?.({ kind: "text", paste }) ??
                    endsOf(paste.text, previewChars)}
                </span>
              </span>
            ))}
          </div>
        )}

        {inline ? (
          <>
            <InlinePasteEditor
              ref={editorRef}
              value={value}
              known={known}
              onChange={handleInlineChange}
              onSubmit={handleSubmit}
              onPaste={decidePaste}
              onHostsChange={handleHostsChange}
              placeholder={placeholder}
              disabled={disabled}
              className={classNames?.input}
            />
            {Array.from(hosts, ([id, host]) => {
              const paste = heldPastes.find((p) => p.id === id);
              const image = paste ? undefined : heldImages.find((i) => i.id === id);
              const preview: ComposerPastePreview | null = paste
                ? { kind: "text", paste }
                : image
                  ? { kind: "image", image }
                  : null;

              return preview
                ? createPortal(
                    <InlinePill
                      preview={preview}
                      previewChars={previewChars}
                      renderPastePreview={renderPastePreview}
                      classNames={classNames}
                      disabled={disabled}
                      onExpand={expandInline}
                    />,
                    host,
                    id,
                  )
                : null;
            })}
          </>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none placeholder:text-zinc-400",
              classNames?.input,
            )}
          />
        )}
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

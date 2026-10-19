import { forwardRef, useCallback, useMemo, useRef } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import {
  endsOf,
  InlinePasteEditor,
  PastedFilesInput,
  useInlinePaste,
  withSeparators,
  type HeldPaste,
  type InlinePasteEditorHandle,
} from "../PastePills";
import type { ComposerProps } from "./Composer.types";

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
      pasteFilesName,
    },
    ref,
  ) {
    const inline = pastePlacement === "inline";
    const [value, setValue] = useControllableState(
      controlledValue,
      defaultValue,
      onChange,
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editorRef = useRef<InlinePasteEditorHandle>(null);
    /*
     * The holding logic lives in `usePastePills`, wrapped by `useInlinePaste` for
     * the inline placement — which `PromptInput` shares, so the two components
     * cannot disagree about what a pill means. The rule that must not drift is
     * the one below: a send with pills still closed carries the text.
     */
    const paste = useInlinePaste({
      pasteThreshold,
      pasteImages,
      previewChars,
      renderPastePreview,
      classNames,
      disabled,
      heldPastes: controlledHeldPastes,
      onHeldPastesChange,
      heldImages: controlledHeldImages,
      onHeldImagesChange,
      editorRef,
    });
    const pills = paste.pills;
    const heldPastes = paste.heldPastes;
    const pastedFiles = useMemo(
      () => (inline && pasteImages ? paste.imagesIn(value).map((i) => i.file) : []),
      [inline, pasteImages, paste, value],
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // Composable by design, so this reads as a question rather than a handover.
        // Nothing else here wants the paste, so the answer is simply ignored.
        pills.handlePaste(e);
      },
      [pills],
    );

    const handleInlineChange = useCallback(
      (next: string) => {
        setValue(next);
        paste.prune(next);
      },
      [setValue, paste],
    );

    /** Everything the person believes they are sending, in the order they built it. */
    const composeOutgoing = useCallback(() => {
      if (inline) return paste.expand(value);

      return [value, ...heldPastes.map((p) => p.text)].filter(Boolean).join("\n\n");
    }, [inline, value, heldPastes, paste]);

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
      const images = inline ? paste.imagesIn(value) : [];

      onSubmit?.(composeOutgoing(), { images });
      setValue("");
      paste.clear();
      focusInput();
    }, [hasContent, disabled, value, inline, paste, onSubmit, composeOutgoing, setValue, focusInput]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    /** Above the input: click a pill to dump it in, APPENDED to what is already typed. */
    const insertPaste = useCallback(
      (held: HeldPaste) => {
        // `expand` removes it and hands back the text; inserting is this
        // component's job because the hook owns no DOM.
        const text = pills.expand(held.id);

        if (text === undefined) return;

        setValue((current) => (current ? `${current}\n\n${text}` : text));
        textareaRef.current?.focus();
      },
      [pills, setValue],
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
              known={paste.known}
              onChange={handleInlineChange}
              onSubmit={handleSubmit}
              onPaste={paste.decidePaste}
              onHostsChange={paste.onHostsChange}
              placeholder={placeholder}
              disabled={disabled}
              className={classNames?.input}
            />
            {paste.portals}
            {pasteImages && pasteFilesName && (
              <PastedFilesInput name={pasteFilesName} files={pastedFiles} />
            )}
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

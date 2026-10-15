import { useCallback, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useControllableState } from "../../hooks/use-controllable-state";
import { usePastePills, type HeldPaste } from "../../hooks/use-paste-pills";
import { InlinePill } from "./InlinePill";
import type { InlinePasteEditorHandle, PillToInsert } from "./InlinePasteEditor";
import { expandMarkers, markedIds, type HeldImage } from "./paste-markers";
import type { ComposerPasteClassNames, ComposerPastePreview } from "./Composer.types";

export interface UseInlinePasteOptions {
  pasteThreshold?: number;
  pasteImages?: boolean;
  previewChars: number;
  renderPastePreview?: (preview: ComposerPastePreview) => ReactNode;
  classNames?: ComposerPasteClassNames;
  disabled: boolean;
  heldPastes?: HeldPaste[];
  onHeldPastesChange?: (pastes: HeldPaste[]) => void;
  heldImages?: HeldImage[];
  onHeldImagesChange?: (images: HeldImage[]) => void;
  editorRef: RefObject<InlinePasteEditorHandle | null>;
}

/**
 * Everything inline paste pills need besides the editor itself: the held pastes
 * and images, deciding what a paste becomes, dropping a pill's hold when it is
 * deleted from the message, rendering the pills into the editor, and expanding
 * them on send.
 *
 * Shared by `Composer` and `PromptInput` so the two cannot disagree about what a
 * pill means. The rule that must not drift is the one `expand` and `imagesIn`
 * carry: a send with pills still closed carries everything they hold.
 */
export function useInlinePaste({
  pasteThreshold,
  pasteImages = false,
  previewChars,
  renderPastePreview,
  classNames,
  disabled,
  heldPastes: controlledHeldPastes,
  onHeldPastesChange,
  heldImages: controlledHeldImages,
  onHeldImagesChange,
  editorRef,
}: UseInlinePasteOptions) {
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
  const imageCount = useRef(0);

  const known = useMemo(
    () => new Set([...heldPastes.map((p) => p.id), ...heldImages.map((i) => i.id)]),
    [heldPastes, heldImages],
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

  /** What a paste becomes. `null` means "just text". */
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
   * The message is the record of what is attached. A pill backspaced out of it is
   * no longer attached, so its held entry goes too — otherwise state would say
   * "attached" about something the message no longer contains.
   */
  const prune = useCallback(
    (next: string) => {
      const present = new Set(markedIds(next));
      for (const paste of heldPastes) if (!present.has(paste.id)) pills.remove(paste.id);
      if (heldImages.some((i) => !present.has(i.id))) {
        setHeldImages((current) => current.filter((i) => present.has(i.id)));
      }
    },
    [heldPastes, heldImages, pills, setHeldImages],
  );

  const [hosts, setHosts] = useState<ReadonlyMap<string, HTMLElement>>(new Map());
  const onHostsChange = useCallback((next: ReadonlyMap<string, HTMLElement>) => {
    setHosts((prev) => {
      if (prev.size === next.size && [...next].every(([id, el]) => prev.get(id) === el)) {
        return prev;
      }
      return next;
    });
  }, []);

  /** Click a text pill and its full text takes the pill's place. */
  const expandPill = useCallback(
    (id: string) => {
      const text = pills.expand(id);
      if (text === undefined) return;
      editorRef.current?.replacePill(id, text);
    },
    [pills, editorRef],
  );

  /** The value as it is sent: every text pill expanded, every image marked. */
  const expand = useCallback(
    (value: string) => expandMarkers(value, heldPastes, heldImages),
    [heldPastes, heldImages],
  );

  /** The images the value still contains, in message order. */
  const imagesIn = useCallback(
    (value: string) =>
      markedIds(value).flatMap((id) => heldImages.filter((i) => i.id === id)),
    [heldImages],
  );

  const clear = useCallback(() => {
    pills.clear();
    setHeldImages([]);
  }, [pills, setHeldImages]);

  /** The pills, portalled into the placeholders the editor made. Render this anywhere. */
  const portals = Array.from(hosts, ([id, host]) => {
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
            onExpand={expandPill}
          />,
          host,
          id,
        )
      : null;
  });

  return {
    pills,
    heldPastes,
    heldImages,
    known,
    decidePaste,
    prune,
    onHostsChange,
    expand,
    imagesIn,
    clear,
    portals,
  };
}

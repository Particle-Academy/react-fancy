/*
 * The paste-pill core, shared by `Composer`, `PromptInput` and `Input`.
 *
 * One folder rather than a hook in `hooks/` and the rest inside `Composer`, so
 * `npx fancy-cli add` copies it ONCE, as a dependency of whichever of those you
 * add, and the copies cannot drift: there is only one.
 */
export { usePastePills } from "./use-paste-pills";
export type {
  HeldPaste,
  PasteEventLike,
  UsePastePillsOptions,
  UsePastePillsResult,
} from "./use-paste-pills";
export { useInlinePaste } from "./use-inline-paste";
export type { UseInlinePasteOptions } from "./use-inline-paste";
export { InlinePasteEditor, HOST_ATTR } from "./InlinePasteEditor";
export type { InlinePasteEditorHandle, PillToInsert } from "./InlinePasteEditor";
export { InlinePill, endsOf, withSeparators } from "./InlinePill";
export { PastedFilesInput } from "./PastedFilesInput";
export type { PastedFilesInputProps } from "./PastedFilesInput";
export { PILL_MARK, pasteMarker, segmentValue, markedIds, expandMarkers } from "./paste-markers";
export type { HeldImage, ValueSegment } from "./paste-markers";
export type {
  ComposerPasteClassNames,
  ComposerPastePreview,
  PasteClassNames,
  PastePreview,
} from "./PastePills.types";

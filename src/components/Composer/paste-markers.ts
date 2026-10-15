import type { HeldPaste } from "../../hooks/use-paste-pills";

/**
 * An image pasted into a `Composer` and held as a pill.
 *
 * `label` is stored rather than derived because the number in it is the order of
 * ARRIVAL: "Pasted image 2" must stay 2 after image 1 is deleted, and nothing left
 * in the list could recompute that.
 */
export interface HeldImage {
  id: string;
  file: File;
  label: string;
}

/**
 * U+FFFC OBJECT REPLACEMENT CHARACTER — Unicode's own "an embedded object sits
 * here". A marker is the id wrapped in a pair of them.
 *
 * Why the message carries a marker at all: with inline placement the message
 * ITSELF is the record of what is attached and where, so there is one answer to
 * "what am I sending?" rather than a text plus a parallel list that can disagree
 * the moment someone backspaces a pill. This is the MOIC estate's design for their
 * own composer, and the reason they withdrew from the beside-the-input layout.
 *
 * Only a marker whose id the composer actually holds is a pill; anything else is
 * left as text, so a stray U+FFFC in pasted content cannot invent an attachment.
 */
export const PILL_MARK = "￼";

const MARKER = /￼([^￼\n]+)￼/g;

/** The marker for a held paste or image, for a host or agent writing `value` itself. */
export function pasteMarker(id: string): string {
  return `${PILL_MARK}${id}${PILL_MARK}`;
}

export type ValueSegment =
  | { type: "text"; text: string }
  | { type: "pill"; id: string };

/** Split a value into text and pills. Markers for ids not in `known` stay text. */
export function segmentValue(value: string, known: ReadonlySet<string>): ValueSegment[] {
  const out: ValueSegment[] = [];
  let last = 0;

  for (const match of value.matchAll(MARKER)) {
    const id = match[1];
    if (!known.has(id)) continue;

    const start = match.index ?? 0;
    if (start > last) out.push({ type: "text", text: value.slice(last, start) });
    out.push({ type: "pill", id });
    last = start + match[0].length;
  }

  if (last < value.length) out.push({ type: "text", text: value.slice(last) });

  return out;
}

/** The id of every marker the value contains, in order, held or not. */
export function markedIds(value: string): string[] {
  return Array.from(value.matchAll(MARKER), (m) => m[1]);
}

/**
 * What actually gets sent: every text pill replaced by its full text, every image
 * pill by `[Pasted image N]` so the reader of the message can see where the image
 * sat. The images themselves go to `onSubmit`'s second argument.
 */
export function expandMarkers(
  value: string,
  pastes: readonly HeldPaste[],
  images: readonly HeldImage[],
): string {
  const text = new Map(pastes.map((p) => [p.id, p.text]));
  const image = new Map(images.map((i) => [i.id, `[${i.label}]`]));

  return value.replace(MARKER, (whole, id: string) => text.get(id) ?? image.get(id) ?? whole);
}

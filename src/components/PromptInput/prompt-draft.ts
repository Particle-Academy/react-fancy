import { expandMarkers, markedIds, type HeldImage } from "../PastePills/paste-markers";

/**
 * A file in a saved draft — an attachment chip, or the image behind an image
 * pill — described by data alone, so the draft survives `JSON.stringify`.
 *
 * The bytes are deliberately NOT in here. A `File` does not survive JSON, and
 * putting base64 in the draft by default would make every saved draft as large
 * as everything attached to it: a 6 MB screenshot becomes 8 MB of string written
 * on every keystroke by a host that saves on change. Instead the host decides
 * where bytes live, through `persistAttachment` (save) and `restoreAttachment`
 * (load), and the draft carries only the host's handle for them in `ref`.
 *
 * A host that WANTS the bytes inline passes `promptFileToDataUrl` as
 * `persistAttachment`, and `ref` is then a `data:` URL.
 */
export interface PromptDraftFile {
  /** Stable for the life of the draft. For an image pill, the pill's own id. */
  id: string;
  name: string;
  /** MIME type, `""` when the browser did not know it. */
  type: string;
  bytes: number;
  /**
   * The host's handle for the stored bytes — whatever `persistAttachment`
   * returned: a storage key, an upload URL, a `data:` URL. Absent when the host
   * keeps nothing, in which case a restored attachment has no `File`.
   */
  ref?: string;
}

/** A paste held as a pill inside the message. Its marker sits in `text`. */
export type PromptDraftPill =
  | { kind: "text"; id: string; text: string }
  | { kind: "image"; id: string; label: string; file: PromptDraftFile };

/**
 * Everything a PromptInput holds, as JSON. Versioned, so a draft saved by one
 * release and read by a later one is recognised or refused, never guessed at.
 *
 * `text` is the raw value: with paste pills on, each pill is a marker in it
 * (`pasteMarker(id)`), because the message itself is the record of what is
 * attached and where. Mentions and slash commands are plain text in it.
 */
export interface PromptDraft {
  v: 1;
  text: string;
  pills: PromptDraftPill[];
  attachments: PromptDraftFile[];
}

export interface PromptSetDraftOptions {
  /**
   * Focus the composer after restoring, caret at the end. Default `false`:
   * restoring a draft never moves focus or anybody's caret on its own
   * (genie#1235 was exactly that).
   */
  focus?: boolean;
}

/** The imperative handle a `ref` on `PromptInput` receives. */
export interface PromptInputHandle {
  /** The current draft. A fresh JSON-safe copy; mutating it changes nothing. */
  getDraft(): PromptDraft;
  /**
   * Replace the whole draft. Does NOT call `onChange` / `onDraftChange` (the
   * host is the one setting it), does NOT focus unless `{ focus: true }`.
   * A draft whose `v` this release does not know is refused with a warning.
   */
  setDraft(draft: PromptDraft, options?: PromptSetDraftOptions): void;
  /** Focus the composer, caret at the end. */
  focus(): void;
}

export const EMPTY_DRAFT: PromptDraft = { v: 1, text: "", pills: [], attachments: [] };

function readFile(raw: unknown, id?: string): PromptDraftFile | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  const fileId = id ?? f.id;
  if (typeof fileId !== "string" || typeof f.name !== "string") return null;
  const out: PromptDraftFile = {
    id: fileId,
    name: f.name,
    type: typeof f.type === "string" ? f.type : "",
    bytes: typeof f.bytes === "number" && Number.isFinite(f.bytes) ? f.bytes : 0,
  };
  if (typeof f.ref === "string") out.ref = f.ref;
  return out;
}

function readPill(raw: unknown): PromptDraftPill | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string") return null;
  if (p.kind === "text" && typeof p.text === "string") {
    return { kind: "text", id: p.id, text: p.text };
  }
  if (p.kind === "image" && typeof p.label === "string") {
    const file = readFile(p.file, p.id);
    return file ? { kind: "image", id: p.id, label: p.label, file } : null;
  }
  return null;
}

/**
 * Validate a draft from storage. `null` for anything that is not a v1 draft.
 *
 * `inline` is whether the composer can show pills. Without them (no
 * `pasteThreshold` / `pasteImages`) a pill would surface as raw marker
 * characters, so text pills are expanded in place and image pills become `[label]`
 * in the text plus an ordinary attachment — what the message would have sent.
 */
export function readPromptDraft(raw: unknown, inline: boolean): PromptDraft | null {
  if (!raw || typeof raw !== "object" || (raw as { v?: unknown }).v !== 1) return null;
  const d = raw as Record<string, unknown>;

  let text = typeof d.text === "string" ? d.text : "";
  let pills = (Array.isArray(d.pills) ? d.pills : [])
    .map(readPill)
    .filter((p): p is PromptDraftPill => p !== null);
  let attachments = (Array.isArray(d.attachments) ? d.attachments : [])
    .map((a) => readFile(a))
    .filter((a): a is PromptDraftFile => a !== null);

  // The message is the record: a pill the text no longer marks is not attached.
  const marked = new Set(markedIds(text));
  pills = pills.filter((p) => marked.has(p.id));

  if (!inline && pills.length > 0) {
    const texts = pills.flatMap((p) => (p.kind === "text" ? [{ id: p.id, text: p.text }] : []));
    const images = pills.flatMap((p) => (p.kind === "image" ? [p] : []));
    text = expandMarkers(
      text,
      texts,
      images.map((p) => ({ id: p.id, label: p.label }) as HeldImage),
    );
    attachments = [...attachments, ...images.map((p) => p.file)];
    pills = [];
  }

  return { v: 1, text, pills, attachments };
}

/** A deep, JSON-safe copy, so a host cannot mutate the component's state through it. */
export function clonePromptDraft(draft: PromptDraft): PromptDraft {
  return JSON.parse(JSON.stringify(draft)) as PromptDraft;
}

/** Every file a draft refers to: attachments, then image pills. */
export function promptDraftFiles(draft: PromptDraft): PromptDraftFile[] {
  return [
    ...draft.attachments,
    ...draft.pills.flatMap((p) => (p.kind === "image" ? [p.file] : [])),
  ];
}

/**
 * Read a File as a `data:` URL. Pass it as `persistAttachment` to keep the bytes
 * IN the draft — simple, and fine for small files; every saved draft then carries
 * every attached byte, base64-inflated by a third.
 */
export function promptFileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Turn a `data:` URL back into a File — the other half of `promptFileToDataUrl`:
 *
 *     restoreAttachment={(f) => f.ref ? promptDataUrlToFile(f.ref, f.name, f.type) : undefined}
 *
 * Synchronous, so the restored draft has its Files on the first render.
 * `undefined` for anything that is not a `data:` URL.
 */
export function promptDataUrlToFile(dataUrl: string, name: string, type?: string): File | undefined {
  if (!dataUrl.startsWith("data:")) return undefined;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return undefined;

  const meta = dataUrl.slice(5, comma);
  const body = dataUrl.slice(comma + 1);
  const mime = type || meta.split(";")[0] || "application/octet-stream";

  try {
    let bytes: Uint8Array<ArrayBuffer>;
    if (meta.endsWith(";base64")) {
      const bin = atob(body);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(body));
    }
    return new File([bytes], name, { type: mime });
  } catch {
    return undefined;
  }
}

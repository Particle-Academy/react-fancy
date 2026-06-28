/**
 * Resolve what kind of media a source is, from its MIME type (preferred) or its
 * URL — a file extension, or the type embedded in a `data:` URI.
 *
 * Shared by `<MediaViewer>` to pick the right per-type viewer, and exported so
 * downstream packages (e.g. fancy-code's file viewer) can make the same
 * text-vs-media decision without re-deriving the table.
 */

export type MediaKind = "image" | "video" | "audio" | "pdf" | "unknown";

export interface ResolveMediaTypeInput {
  /** MIME type — preferred when known (e.g. `"image/png"`, `"video/mp4"`). */
  mime?: string | null;
  /**
   * Source URL — used to sniff the kind from a file extension, or from the type
   * embedded in a `data:` URI, when no `mime` is given. `http(s):` / `data:` /
   * `blob:` are all accepted (a bare `blob:` URL carries no type, so pass
   * `mime` alongside it).
   */
  src?: string | null;
}

const IMAGE_EXTS = new Set([
  "png", "jpg", "jpeg", "jfif", "pjpeg", "gif", "webp", "avif", "bmp", "ico",
  "cur", "svg", "svgz", "apng", "tif", "tiff", "heic", "heif",
]);
const VIDEO_EXTS = new Set([
  "mp4", "m4v", "webm", "ogv", "ogm", "mov", "mkv", "avi", "wmv", "flv", "3gp",
  "3g2", "mpg", "mpeg",
]);
const AUDIO_EXTS = new Set([
  "mp3", "wav", "wave", "ogg", "oga", "m4a", "m4b", "aac", "flac", "opus",
  "weba", "mid", "midi", "aiff", "aif",
]);

/** Map a (possibly parameterized) MIME type to a media kind. */
function mimeToKind(mime: string): MediaKind {
  // Strip any parameters (`; charset=…`) and normalize.
  const m = mime.toLowerCase().split(";")[0].trim();
  if (!m) return "unknown";
  if (m === "application/pdf" || m === "application/x-pdf") return "pdf";
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  // `application/ogg` is audio in practice; treat it as such.
  if (m === "application/ogg") return "audio";
  return "unknown";
}

/** Map a bare file extension (no leading dot) to a media kind. */
function extToKind(ext: string): MediaKind {
  const e = ext.toLowerCase();
  if (e === "pdf") return "pdf";
  if (IMAGE_EXTS.has(e)) return "image";
  if (VIDEO_EXTS.has(e)) return "video";
  if (AUDIO_EXTS.has(e)) return "audio";
  return "unknown";
}

/** Pull the file extension out of a URL, ignoring its query/hash. */
function extFromSrc(src: string): string | null {
  const clean = src.split(/[?#]/, 1)[0];
  const lastSeg = clean.split("/").pop() ?? "";
  const dot = lastSeg.lastIndexOf(".");
  if (dot <= 0 || dot === lastSeg.length - 1) return null;
  return lastSeg.slice(dot + 1);
}

/** Extract the MIME type embedded in a `data:` URI, if present. */
function mimeFromDataUri(src: string): string | null {
  if (!/^data:/i.test(src)) return null;
  const header = src.slice(5).split(",", 1)[0]; // text after `data:`, before the comma
  const mt = header.split(";")[0].trim();
  return mt || null;
}

/**
 * Resolve a {@link MediaKind} from a MIME type and/or source URL. MIME wins
 * when it's conclusive; otherwise the `src` is sniffed (a `data:` URI's
 * embedded type first, then the file extension). Returns `"unknown"` when
 * nothing matches — callers treat that as "not previewable media" (e.g. text).
 */
export function resolveMediaType({ mime, src }: ResolveMediaTypeInput): MediaKind {
  if (mime) {
    const k = mimeToKind(mime);
    if (k !== "unknown") return k;
  }
  if (src) {
    const dataMime = mimeFromDataUri(src);
    if (dataMime) {
      const k = mimeToKind(dataMime);
      if (k !== "unknown") return k;
    }
    const ext = extFromSrc(src);
    if (ext) return extToKind(ext);
  }
  return "unknown";
}

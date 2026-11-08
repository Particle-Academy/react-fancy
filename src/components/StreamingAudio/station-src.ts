import type { StreamingStationKind } from "./StreamingAudio.types";

/** Extensions that name a finite audio FILE rather than a live mount. */
const FILE_EXTENSIONS = ["mp3", "m4a", "m4b", "aac", "ogg", "oga", "opus", "wav", "flac", "weba"];

/**
 * Guess a station's kind from its `src`: a path ending in an audio file
 * extension is `"file"`, anything else is `"live"`. The query and fragment are
 * ignored. A guess, not a probe: an Icecast mount named `/stream.mp3` reads as a
 * file, so such a station sets `kind: "live"` explicitly.
 */
export function guessStationKind(src: string): StreamingStationKind {
  const path = src.split(/[?#]/, 1)[0] ?? "";
  const dot = path.lastIndexOf(".");
  if (dot < 0 || dot < path.lastIndexOf("/")) return "live";
  return FILE_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase()) ? "file" : "live";
}

/**
 * Whether a station `src` may be handed to the audio element: an absolute
 * `http:` / `https:` URL, or a same-origin relative path.
 *
 * Refused: every other scheme (`javascript:`, `data:`, `blob:`, `file:`, ...),
 * protocol-relative `//host` (another origin, not a relative path), and any
 * backslash or control character. A URL parser drops tabs and newlines inside a
 * scheme and reads a backslash as a slash, so `java<TAB>script:` and the
 * slash-backslash prefix would otherwise slip past a scheme test.
 */
export function isPlayableSrc(src: string): boolean {
  if (typeof src !== "string") return false;
  const s = src.trim();
  if (!s) return false;
  // C0 controls, DEL and backslash: refused outright.
  if (/[\u0000-\u001F\u007F\\]/.test(s)) return false;
  if (s.startsWith("//")) return false;
  const scheme = /^([a-zA-Z][a-zA-Z\d+.-]*):/.exec(s);
  if (scheme) {
    const name = scheme[1]!.toLowerCase();
    return name === "http" || name === "https";
  }
  return true;
}

import type { FileEntry, FileSort } from "./FileBrowser.types";

/**
 * Normalize free-typed path input: forward slashes, collapsed separators,
 * resolved `.` / `..` segments, no trailing slash. Absolute paths stay
 * absolute; relative paths stay relative (entry paths are identity and are
 * never rewritten — this is only for the editable path input).
 */
export function normalizePath(input: string): string {
  const raw = input.trim().replace(/\\/g, "/");
  if (raw === "") return "/";
  const absolute = raw.startsWith("/");
  const out: string[] = [];
  for (const segment of raw.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      out.pop();
      continue;
    }
    out.push(segment);
  }
  if (out.length === 0) return "/";
  return (absolute ? "/" : "") + out.join("/");
}

/** Parent of a path. Paths without a separator group under `"/"`. */
export function parentPath(path: string): string {
  const i = path.lastIndexOf("/");
  if (i === -1) return "/";
  if (i === 0) return "/";
  return path.slice(0, i);
}

export interface PathSegment {
  label: string;
  path: string;
}

/** Cumulative breadcrumb segments for a path (root anchor excluded). */
export function pathSegments(path: string): PathSegment[] {
  const absolute = path.startsWith("/");
  const parts = path.split("/").filter(Boolean);
  const segments: PathSegment[] = [];
  let acc = "";
  parts.forEach((part, i) => {
    acc = i === 0 && !absolute ? part : `${acc}/${part}`;
    segments.push({ label: part, path: acc });
  });
  return segments;
}

/**
 * Deterministic, numeric-aware name comparison. The locale is pinned to "en"
 * so server and client renders order identically (SSR safety).
 */
function compareNames(a: string, b: string): number {
  const cmp = a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
  if (cmp !== 0) return cmp;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Dirs-first, then the active sort field, with a stable ascending name tie-break. */
export function compareFileEntries(a: FileEntry, b: FileEntry, sort: FileSort): number {
  if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
  const direction = sort.direction === "desc" ? -1 : 1;
  let cmp: number;
  switch (sort.by) {
    case "size":
      cmp = (a.size ?? -1) - (b.size ?? -1);
      break;
    case "mtime": {
      const am = a.mtime ?? "";
      const bm = b.mtime ?? "";
      cmp = am < bm ? -1 : am > bm ? 1 : 0;
      break;
    }
    default:
      cmp = compareNames(a.name, b.name);
  }
  if (cmp !== 0) return direction * cmp;
  return compareNames(a.name, b.name);
}

/**
 * Whether a dir shows an expand affordance: known-empty dirs never do
 * (`hasChildren: false`, or a loaded/snapshot listing of zero entries);
 * unknown-depth dirs only do when a provider can load them.
 */
export function isEntryExpandable(
  entry: FileEntry,
  children: FileEntry[] | undefined,
  hasProvider: boolean,
): boolean {
  if (entry.kind !== "dir" || entry.hasChildren === false) return false;
  if (children !== undefined) return children.length > 0;
  return hasProvider;
}

/**
 * Client-side name filter over loaded nodes only: an entry matches when its
 * name contains the query, or (for dirs) when any already-loaded descendant
 * matches. Never triggers loads.
 */
export function entryMatchesFilter(
  entry: FileEntry,
  query: string,
  entriesFor: (path: string) => FileEntry[] | undefined,
  visited: Set<string> = new Set(),
): boolean {
  if (entry.name.toLowerCase().includes(query)) return true;
  if (entry.kind !== "dir" || visited.has(entry.path)) return false;
  visited.add(entry.path);
  const children = entriesFor(entry.path);
  return children?.some((child) => entryMatchesFilter(child, query, entriesFor, visited)) ?? false;
}

/** Compact, deterministic byte formatting ("1.4 KB", "12 MB"). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

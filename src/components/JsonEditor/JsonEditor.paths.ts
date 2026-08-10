import type {
  JsonArray,
  JsonEditorEdit,
  JsonObject,
  JsonPath,
  JsonValue,
} from "./JsonEditor.types";

// ---------------------------------------------------------------------------
// Paths
//
// The wire form of a path is a dotted string — `user.address.city`,
// `orders.0.total` — because that is what fits in a `data-*` attribute, a
// keyMap key, an MCP tool argument, and a log line. `.` separates segments and
// `\` escapes, so a key that genuinely contains a dot is still addressable
// (`meta.a\.b` is `["meta", "a.b"]`, not three segments).
// ---------------------------------------------------------------------------

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: JsonValue | undefined): value is JsonArray {
  return Array.isArray(value);
}

export function isContainerValue(value: JsonValue | undefined): boolean {
  return isJsonObject(value) || isJsonArray(value);
}

/** Split a dotted path into segments, honouring `\.` and `\\`. */
export function parsePath(path: string): JsonPath {
  if (!path) return [];

  const segments: string[] = [];
  let current = "";
  let escaped = false;

  for (const char of path) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === ".") {
      segments.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  // A trailing lone backslash is a typo, not a separator — keep it literal
  // rather than throwing on a half-typed path.
  if (escaped) current += "\\";
  segments.push(current);

  return segments;
}

/** The inverse of {@link parsePath}. */
export function pathToString(segments: JsonPath): string {
  return segments
    .map((segment) => segment.replace(/\\/g, "\\\\").replace(/\./g, "\\."))
    .join(".");
}

export function getAtPath(value: JsonValue, segments: JsonPath): JsonValue | undefined {
  let current: JsonValue | undefined = value;

  for (const segment of segments) {
    if (isJsonArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
    } else if (isJsonObject(current)) {
      if (!Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
      current = current[segment];
    } else {
      return undefined;
    }
    if (current === undefined) return undefined;
  }

  return current;
}

/**
 * Rebuild `value` with `updater` applied to the container at `segments`,
 * cloning only the containers along that path. Returns the original reference
 * when the path does not resolve, so a no-op edit is detectable by identity.
 */
function updateContainer(
  value: JsonValue,
  segments: JsonPath,
  updater: (container: JsonObject | JsonArray) => JsonObject | JsonArray | undefined,
): JsonValue {
  if (segments.length === 0) {
    if (!isContainerValue(value)) return value;
    const next = updater(value as JsonObject | JsonArray);
    return next === undefined ? value : next;
  }

  const [head, ...rest] = segments as [string, ...string[]];

  if (isJsonArray(value)) {
    const index = Number(head);
    if (!Number.isInteger(index) || index < 0 || index >= value.length) return value;
    const child = updateContainer(value[index]!, rest, updater);
    if (child === value[index]) return value;
    const clone = value.slice();
    clone[index] = child;
    return clone;
  }

  if (isJsonObject(value)) {
    if (!Object.prototype.hasOwnProperty.call(value, head)) return value;
    const child = updateContainer(value[head]!, rest, updater);
    if (child === value[head]) return value;
    return { ...value, [head]: child };
  }

  return value;
}

/**
 * Apply one {@link JsonEditorEdit} and return a NEW document.
 *
 * Pure and total: an edit that cannot be applied — a path that does not exist,
 * a rename onto an occupied key, an insert without a key into an object —
 * returns the input unchanged rather than throwing or half-applying. The
 * component checks those cases first and raises an issue; this function is the
 * backstop for the same op arriving from a bridge, where there is no UI to warn.
 */
export function applyJsonEdit(value: JsonValue, edit: JsonEditorEdit): JsonValue {
  const segments = parsePath(edit.path);

  switch (edit.op) {
    case "set": {
      // An empty path is the document itself.
      if (segments.length === 0) return edit.value;

      const parent = segments.slice(0, -1);
      const key = segments[segments.length - 1]!;

      return updateContainer(value, parent, (container) => {
        if (isJsonArray(container)) {
          const index = Number(key);
          if (!Number.isInteger(index) || index < 0 || index >= container.length) return undefined;
          const clone = container.slice();
          clone[index] = edit.value;
          return clone;
        }
        return { ...container, [key]: edit.value };
      });
    }

    case "remove": {
      if (segments.length === 0) return value;

      const parent = segments.slice(0, -1);
      const key = segments[segments.length - 1]!;

      return updateContainer(value, parent, (container) => {
        if (isJsonArray(container)) {
          const index = Number(key);
          if (!Number.isInteger(index) || index < 0 || index >= container.length) return undefined;
          return container.filter((_, i) => i !== index);
        }
        if (!Object.prototype.hasOwnProperty.call(container, key)) return undefined;
        const clone: JsonObject = {};
        for (const [k, v] of Object.entries(container)) {
          if (k !== key) clone[k] = v;
        }
        return clone;
      });
    }

    case "rename": {
      if (segments.length === 0) return value;

      const parent = segments.slice(0, -1);
      const key = segments[segments.length - 1]!;

      return updateContainer(value, parent, (container) => {
        // Array indices are positional, not names — reorder is `move`.
        if (!isJsonObject(container)) return undefined;
        if (!Object.prototype.hasOwnProperty.call(container, key)) return undefined;
        if (edit.key === key) return undefined;
        // Renaming onto a live sibling would silently destroy it.
        if (Object.prototype.hasOwnProperty.call(container, edit.key)) return undefined;

        // Rebuilt in order: `delete` + re-add would move the key to the end,
        // which reads as the row jumping down the list for no reason.
        const clone: JsonObject = {};
        for (const [k, v] of Object.entries(container)) {
          clone[k === key ? edit.key : k] = v;
        }
        return clone;
      });
    }

    case "insert": {
      return updateContainer(value, segments, (container) => {
        if (isJsonArray(container)) return [...container, edit.value];
        if (edit.key === undefined || edit.key === "") return undefined;
        if (Object.prototype.hasOwnProperty.call(container, edit.key)) return undefined;
        return { ...container, [edit.key]: edit.value };
      });
    }

    case "move": {
      if (segments.length === 0) return value;

      const parent = segments.slice(0, -1);
      const from = Number(segments[segments.length - 1]);

      return updateContainer(value, parent, (container) => {
        if (!isJsonArray(container)) return undefined;
        if (!Number.isInteger(from) || from < 0 || from >= container.length) return undefined;
        const to = Math.min(Math.max(edit.to, 0), container.length - 1);
        if (to === from) return undefined;
        const clone = container.slice();
        const [moved] = clone.splice(from, 1);
        clone.splice(to, 0, moved!);
        return clone;
      });
    }
  }
}

/** A one-line summary of an edit, for the pending strip and activity events. */
export function describeEdit(edit: JsonEditorEdit): string {
  const at = edit.path === "" ? "the document" : edit.path;
  switch (edit.op) {
    case "set":
      return `set ${at}`;
    case "remove":
      return `remove ${at}`;
    case "rename":
      return `rename ${at} to ${edit.key}`;
    case "insert":
      return edit.key === undefined ? `append to ${at}` : `add ${edit.key} to ${at}`;
    case "move":
      return `move ${at} to index ${edit.to}`;
  }
}

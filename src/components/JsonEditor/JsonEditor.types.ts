import type { HTMLAttributes } from "react";
import type { InputOption } from "../inputs/inputs.types";
import type { FieldMode } from "../inputs/inputs.types";
import type { Size } from "../../utils/types";

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * A location inside a JSON document, one array element per segment. Array
 * indices are decimal STRINGS (`["orders", "0", "total"]`) so a path is a plain
 * `string[]` an agent can emit without a tagged union, and so object keys and
 * array indices are addressed identically.
 *
 * The wire form is the dotted string produced by `pathToString` — see
 * `JsonEditor.paths.ts` for the escaping rule.
 */
export type JsonPath = string[];

// ---------------------------------------------------------------------------
// Declared types
// ---------------------------------------------------------------------------

/**
 * The data types a `keyMap` can impose on a JSON value.
 *
 * Each one owes BOTH a read-only representation and an edit control — that
 * pairing is the whole point of the feature, so a type with no distinct input
 * does not earn a place here.
 *
 * `json` is the escape hatch: it matches any value and edits as raw text, which
 * is how a sub-document opts out of the row-per-key treatment.
 */
export const JSON_FIELD_TYPES = [
  "string",
  "text",
  "number",
  "integer",
  "boolean",
  "date",
  "datetime",
  "enum",
  "secret",
  "url",
  "email",
  "color",
  "json",
  "object",
  "array",
] as const;

export type JsonFieldType = (typeof JSON_FIELD_TYPES)[number];

/**
 * The long form of a `keyMap` entry. The short form — a bare type name — is
 * sugar for `{ type }`.
 */
export interface JsonKeyRule {
  type: JsonFieldType;
  /** Overrides the raw key as the row's label. */
  label?: string;
  /** Choices for `type: "enum"`. Required there; ignored elsewhere. */
  options?: InputOption[];
  /** Render the value but never offer a control for it. */
  readOnly?: boolean;
  /** The key must be present. Only enforced on wildcard-free patterns. */
  required?: boolean;
  description?: string;
  placeholder?: string;
  /** Forwarded to the control for `number` / `integer` / `date` / `datetime`. */
  min?: number | string;
  max?: number | string;
}

/** One compiled `keyMap` entry: a path pattern plus the rule it imposes. */
export interface JsonKeyMapEntry {
  /** Path pattern; a `"*"` segment matches any single key or index. */
  pattern: JsonPath;
  rule: JsonKeyRule;
  /** The key exactly as written in the `keyMap`, for error messages. */
  source: string;
  /** Non-wildcard segment count — the specificity score. */
  literals: number;
  /** Declaration order, the tie-breaker at equal specificity. */
  order: number;
}

export interface ParsedKeyMap {
  /**
   * `false` only when the STRING itself was unusable (unparseable, or valid
   * JSON of the wrong shape). Individual bad rules leave this `true` — they are
   * reported and skipped so one typo cannot silently disable a whole map.
   */
  ok: boolean;
  rules: JsonKeyMapEntry[];
  issues: JsonEditorIssue[];
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

/**
 * Everything the editor knows to be wrong, in one shape.
 *
 * A typing feature that silently stops typing things is worse than no typing at
 * all, because the caller believes the constraint is in force. So a broken
 * `keyMap`, a broken rule inside a working one, and a value that contradicts
 * its declared type all surface through the SAME channel — the panel, the
 * `data-issues` count, and `onIssuesChange`.
 */
export interface JsonEditorIssue {
  /**
   * - `keymap` — the `keyMap` string could not be used at all.
   * - `rule`   — one entry in an otherwise-usable map is malformed.
   * - `type`   — a value contradicts the type declared for its path.
   * - `edit`   — a structural edit was refused (duplicate key, and the like).
   */
  kind: "keymap" | "rule" | "type" | "edit";
  /** Dotted path; `""` for the `keyMap` as a whole. */
  path: string;
  message: string;
  /** The declared type, when the issue has one. */
  expected?: JsonFieldType;
  /** What the value actually is: `"string"`, `"array"`, `"null"`, … */
  actual?: string;
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

/**
 * One mutation, as data.
 *
 * Every change the UI makes is expressed as one of these and applied through
 * `applyJsonEdit`, which means an MCP bridge can replay exactly what a human
 * did — and `pendingMode` can hold one in a queue instead of applying it —
 * without a second code path.
 */
export type JsonEditorEditBase = {
  id?: string;
  /** Human-readable summary, used by the pending strip. */
  label?: string;
};

export type JsonEditorEdit =
  | (JsonEditorEditBase & { op: "set"; path: string; value: JsonValue })
  | (JsonEditorEditBase & { op: "remove"; path: string })
  | (JsonEditorEditBase & { op: "rename"; path: string; key: string })
  /** `path` is the CONTAINER. `key` is required for an object, ignored for an array. */
  | (JsonEditorEditBase & { op: "insert"; path: string; key?: string; value: JsonValue })
  /** `path` is the element; `to` is its new index in the same array. */
  | (JsonEditorEditBase & { op: "move"; path: string; to: number });

export type JsonEditorPendingEdit = JsonEditorEdit & { id: string };

export interface JsonEditorActivity {
  /** `commit` — applied to the document. `stage` / `accept` / `reject` — pending flow. */
  type: "commit" | "stage" | "accept" | "reject";
  edit: JsonEditorEdit;
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

/** One rendered key/value row — also the unit a bridge would address. */
export interface JsonEditorNode {
  path: JsonPath;
  /** `pathToString(path)`; `""` for a scalar root. */
  dotted: string;
  /** The last segment: an object key or an array index. */
  key: string;
  depth: number;
  value: JsonValue;
  parentKind: "object" | "array" | "root";
  /** The rule that matched, if any. */
  rule?: JsonKeyRule;
  /** Declared type if a rule matched, otherwise inferred from the value. */
  type: JsonFieldType;
  declared: boolean;
  /** Renders as a collapsible branch rather than a value. */
  container: boolean;
  childCount: number;
  /** Set when the value contradicts its declared type. */
  conflict?: JsonEditorIssue;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JsonEditorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** The document. Controlled — the editor keeps no copy of it. */
  value: JsonValue;
  /**
   * Called with the WHOLE next document plus the edit that produced it. The
   * edit is what a bridge would log, replay, or undo.
   */
  onChange?: (value: JsonValue, edit: JsonEditorEdit) => void;
  /**
   * Type declarations, as a **JSON string** — not an object, and an object is
   * NOT accepted as a convenience overload.
   *
   * A string survives every boundary this prop actually crosses: an MCP tool
   * argument, a config column, a `data-*` attribute, a form field. A live
   * object survives none of them, so accepting both would make the documented
   * form the second-class one in practice.
   *
   * ```jsonc
   * {
   *   "user.age":       "number",           // short form: a bare type name
   *   "tags.*":         "string",           // every element of an array
   *   "orders.*.total": "number",
   *   "role": { "type": "enum", "options": ["admin", "member"] }
   * }
   * ```
   *
   * Malformed input is never thrown and never silently ignored — see
   * {@link JsonEditorIssue}.
   */
  keyMap?: string | null;
  /**
   * `"view"` (the default here) renders values as text that turns into the
   * typed control when clicked; `"edit"` renders every control at once.
   *
   * The kit default is `"edit"`, and this component deliberately differs: a
   * forty-key document drawn as forty boxed inputs is not a document you can
   * read, and reading is most of what a JSON editor is for.
   */
  mode?: FieldMode;
  size?: Size;
  /** Show every value, offer no control. Overrides `mode` and every `allow*`. */
  readOnly?: boolean;
  /**
   * Dotted paths of the expanded containers. Omit BOTH this and
   * `defaultExpanded` to expand everything (pass `defaultExpanded={[]}` for a
   * large document).
   */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Render the issues panel. The `data-issues` count and `onIssuesChange` are unaffected. */
  showIssues?: boolean;
  onIssuesChange?: (issues: JsonEditorIssue[]) => void;
  /**
   * Trust-but-verify. With this on, an edit is STAGED into `pending` instead of
   * being applied: `onChange` does not fire until a human accepts it.
   */
  pendingMode?: boolean;
  /** Staged edits. Controlled, so an agent's proposals are inspectable. */
  pending?: JsonEditorPendingEdit[];
  onPendingChange?: (pending: JsonEditorPendingEdit[]) => void;
  /** Every mutation, staged or applied — the hook presence / undo layers listen on. */
  onActivity?: (event: JsonEditorActivity) => void;
  allowAdd?: boolean;
  allowRemove?: boolean;
  allowRename?: boolean;
  allowReorder?: boolean;
  /** Label for a scalar root document. Default `"value"`. */
  rootLabel?: string;
  /** Shown when the document has no keys. */
  emptyLabel?: string;
  /** Prefix for generated control ids — `<idPrefix>-<dotted path>`. */
  idPrefix?: string;
}

import { resolveOption } from "../inputs/inputs.utils";
import {
  getAtPath,
  isJsonArray,
  isJsonObject,
  parsePath,
  pathToString,
} from "./JsonEditor.paths";
import { JSON_FIELD_TYPES } from "./JsonEditor.types";
import type {
  JsonEditorIssue,
  JsonFieldType,
  JsonKeyMapEntry,
  JsonKeyRule,
  JsonPath,
  JsonValue,
  ParsedKeyMap,
} from "./JsonEditor.types";

// ---------------------------------------------------------------------------
// The keyMap
//
// Shape: a FLAT object whose keys are dotted path patterns and whose values are
// either a bare type name or a rule object.
//
//   { "user.age": "number", "orders.*.total": "number", "tags.*": "string" }
//
// Why flat paths rather than a nested mirror of the data:
//
//  - A nested mirror is ambiguous the moment a key needs a type AND typed
//    children — `{"user": {"age": "number"}}` could mean either, and resolving
//    it needs a magic key (`$type`) that a flat map does not.
//  - Arrays force a wildcard into a nested mirror anyway, so the mirror buys
//    nothing there and costs a level of nesting per segment.
//  - One rule per line is greppable, diffable and reviewable, which matters
//    when the map arrives as a string from an agent or a config column.
//  - It is sparse by construction: you declare the keys you care about, and
//    everything else is inferred from the value.
//
// A `*` segment matches exactly one key or index. There is deliberately no
// `**`: "any depth" makes two patterns overlap in ways that are hard to reason
// about, and every case we had for it was really "this array's elements".
// ---------------------------------------------------------------------------

const TYPE_NAMES = new Set<string>(JSON_FIELD_TYPES);

function isTypeName(value: unknown): value is JsonFieldType {
  return typeof value === "string" && TYPE_NAMES.has(value);
}

function issue(kind: JsonEditorIssue["kind"], path: string, message: string): JsonEditorIssue {
  return { kind, path, message };
}

/**
 * Compile a `keyMap` JSON **string**.
 *
 * Never throws. Two failure modes, deliberately distinct:
 *
 *  - The string itself is unusable (not JSON, or JSON that is not an object) —
 *    `ok: false`, no rules, one `keymap` issue. The caller must show this: an
 *    editor that quietly runs untyped is worse than one that refuses, because
 *    the person editing believes the constraint is in force.
 *  - One entry is malformed — `ok: true`, that entry dropped, one `rule` issue.
 *    A typo in `orders.*.totl` must not disable the other forty rules.
 */
export function parseKeyMap(source?: string | null): ParsedKeyMap {
  if (source === undefined || source === null || source.trim() === "") {
    return { ok: true, rules: [], issues: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return {
      ok: false,
      rules: [],
      issues: [
        issue(
          "keymap",
          "",
          `keyMap is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        ),
      ],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      rules: [],
      issues: [
        issue(
          "keymap",
          "",
          `keyMap must be a JSON object of path → type, got ${describeValue(parsed as JsonValue)}.`,
        ),
      ],
    };
  }

  const rules: JsonKeyMapEntry[] = [];
  const issues: JsonEditorIssue[] = [];
  let order = 0;

  for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
    const rule = normalizeRule(key, raw, issues);
    if (!rule) continue;

    const pattern = parsePath(key);
    rules.push({
      pattern,
      rule,
      source: key,
      literals: pattern.reduce((n, segment) => n + (segment === "*" ? 0 : 1), 0),
      order: order++,
    });
  }

  return { ok: true, rules, issues };
}

function normalizeRule(
  key: string,
  raw: unknown,
  issues: JsonEditorIssue[],
): JsonKeyRule | undefined {
  let candidate: Record<string, unknown>;

  if (typeof raw === "string") {
    candidate = { type: raw };
  } else if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    candidate = raw as Record<string, unknown>;
  } else {
    issues.push(
      issue(
        "rule",
        key,
        `Expected a type name or a rule object, got ${describeValue(raw as JsonValue)}.`,
      ),
    );
    return undefined;
  }

  if (!isTypeName(candidate.type)) {
    issues.push(
      issue(
        "rule",
        key,
        `Unknown type ${JSON.stringify(candidate.type)}. Known types: ${JSON_FIELD_TYPES.join(", ")}.`,
      ),
    );
    return undefined;
  }

  if (candidate.options !== undefined && !Array.isArray(candidate.options)) {
    issues.push(issue("rule", key, "`options` must be an array."));
    return undefined;
  }

  // An enum with nothing to choose from cannot type anything, and would render
  // an empty select that looks like a loading state.
  if (candidate.type === "enum" && (!candidate.options || candidate.options.length === 0)) {
    issues.push(issue("rule", key, "`enum` requires a non-empty `options` array."));
    return undefined;
  }

  return candidate as unknown as JsonKeyRule;
}

/**
 * The rule governing `segments`, or `undefined` when the map is silent.
 *
 * Specificity: the pattern with the most literal (non-`*`) segments wins, and
 * at equal specificity the one declared LAST wins — so a general
 * `orders.*.total` can be overridden by a specific `orders.0.total` placed
 * anywhere in the map.
 */
export function resolveKeyRule(
  rules: JsonKeyMapEntry[],
  segments: JsonPath,
): JsonKeyRule | undefined {
  let best: JsonKeyMapEntry | undefined;

  for (const entry of rules) {
    if (!matches(entry.pattern, segments)) continue;
    if (
      !best ||
      entry.literals > best.literals ||
      (entry.literals === best.literals && entry.order > best.order)
    ) {
      best = entry;
    }
  }

  return best?.rule;
}

function matches(pattern: JsonPath, segments: JsonPath): boolean {
  if (pattern.length !== segments.length) return false;
  return pattern.every((p, i) => p === "*" || p === segments[i]);
}

/** What a value IS, in the vocabulary the issue messages use. */
export function describeValue(value: JsonValue | undefined): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** The type a value carries on its own, when nothing declares one for it. */
export function inferType(value: JsonValue | undefined): JsonFieldType {
  if (Array.isArray(value)) return "array";
  if (value === null || value === undefined) {
    // `null` carries no type information at all, so the raw editor is the only
    // choice that neither invents a type nor drops the value.
    return "json";
  }
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

function enumValues(rule: JsonKeyRule): (string | number | boolean)[] {
  return (rule.options ?? []).map((option) => resolveOption(option).value as string);
}

/**
 * Does the value satisfy the declared type?
 *
 * Deliberately strict and deliberately non-coercing. `"36"` is NOT a number
 * here — the whole reason a `keyMap` exists is to make that visible rather than
 * to paper over it.
 */
export function typeMatches(rule: JsonKeyRule, value: JsonValue | undefined): boolean {
  switch (rule.type) {
    case "string":
    case "text":
    case "url":
    case "email":
    case "secret":
    case "color":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "date":
    case "datetime":
      return typeof value === "string" && value !== "" && !Number.isNaN(Date.parse(value));
    case "enum":
      return (
        (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
        enumValues(rule).some((option) => String(option) === String(value))
      );
    case "object":
      return isJsonObject(value);
    case "array":
      return isJsonArray(value);
    case "json":
      // The escape hatch matches anything EXCEPT text that does not parse —
      // which is exactly the state the raw editor leaves behind when someone
      // saves a half-written document.
      if (typeof value !== "string") return true;
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
  }
}

function conflictMessage(rule: JsonKeyRule, value: JsonValue | undefined): string {
  if (rule.type === "enum") {
    return `${JSON.stringify(value)} is not one of the declared options (${enumValues(rule)
      .map((option) => JSON.stringify(option))
      .join(", ")}).`;
  }
  if (rule.type === "json") {
    return "Raw text is not valid JSON.";
  }
  if (rule.type === "date" || rule.type === "datetime") {
    return `Declared ${rule.type}, got ${describeValue(value)} that is not a parseable date.`;
  }
  return `Declared ${rule.type}, got ${describeValue(value)}.`;
}

/**
 * Every place the document contradicts its `keyMap`.
 *
 * Walks the value (so a conflict is found at any depth, arrays included), then
 * checks `required` on the wildcard-free patterns — a wildcard cannot say "this
 * must exist" about a key nobody has named.
 */
export function findJsonConflicts(value: JsonValue, rules: JsonKeyMapEntry[]): JsonEditorIssue[] {
  const issues: JsonEditorIssue[] = [];
  if (rules.length === 0) return issues;

  const walk = (node: JsonValue, segments: JsonPath) => {
    if (segments.length > 0) {
      const rule = resolveKeyRule(rules, segments);
      if (rule && !typeMatches(rule, node)) {
        issues.push({
          kind: "type",
          path: pathToString(segments),
          message: conflictMessage(rule, node),
          expected: rule.type,
          actual: describeValue(node),
        });
      }
    }

    if (isJsonArray(node)) {
      node.forEach((child, index) => walk(child, [...segments, String(index)]));
    } else if (isJsonObject(node)) {
      for (const [key, child] of Object.entries(node)) walk(child, [...segments, key]);
    }
  };

  walk(value, []);

  for (const entry of rules) {
    if (!entry.rule.required) continue;
    if (entry.pattern.includes("*")) continue;
    if (getAtPath(value, entry.pattern) !== undefined) continue;
    issues.push({
      kind: "type",
      path: entry.source,
      message: `Required key is missing (declared ${entry.rule.type}).`,
      expected: entry.rule.type,
      actual: "undefined",
    });
  }

  return issues;
}

/** The value a newly-added key starts as, so a new row is never `undefined`. */
export function seedValue(type: JsonFieldType, rule?: JsonKeyRule): JsonValue {
  switch (type) {
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "object":
      return {};
    case "array":
      return [];
    case "json":
      return null;
    case "enum":
      return rule?.options?.length ? (resolveOption(rule.options[0]!).value as string) : "";
    default:
      return "";
  }
}

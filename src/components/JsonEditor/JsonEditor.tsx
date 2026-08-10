import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import { Callout } from "../Callout/Callout";
import { Text } from "../Text/Text";
import { JsonEditorContext } from "./JsonEditor.context";
import { JsonEditorAddForm, JsonEditorRow } from "./JsonEditorRow";
import { findJsonConflicts, inferType, parseKeyMap, resolveKeyRule, seedValue } from "./JsonEditor.keymap";
import {
  applyJsonEdit,
  describeEdit,
  getAtPath,
  isContainerValue,
  isJsonArray,
  isJsonObject,
  parsePath,
  pathToString,
} from "./JsonEditor.paths";
import type { JsonEditorContextValue } from "./JsonEditor.context";
import type {
  JsonEditorEdit,
  JsonEditorIssue,
  JsonEditorNode,
  JsonEditorPendingEdit,
  JsonEditorProps,
  JsonFieldType,
  JsonKeyMapEntry,
  JsonPath,
  JsonValue,
} from "./JsonEditor.types";

type RenderItem =
  | { kind: "node"; node: JsonEditorNode }
  | {
      kind: "add";
      path: string;
      containerKind: "object" | "array";
      depth: number;
      suggestedType?: JsonFieldType;
    };

/** Dotted paths of every container in the document — the "expand everything" set. */
function collectContainerPaths(value: JsonValue): string[] {
  const out: string[] = [];

  const walk = (node: JsonValue, segments: JsonPath) => {
    if (!isContainerValue(node)) return;
    if (segments.length > 0) out.push(pathToString(segments));
    if (isJsonArray(node)) {
      node.forEach((child, index) => walk(child, [...segments, String(index)]));
    } else if (isJsonObject(node)) {
      for (const [key, child] of Object.entries(node)) walk(child, [...segments, key]);
    }
  };

  walk(value, []);
  return out;
}

/**
 * JsonEditor — a key/value editor over arbitrary, arbitrarily-nested JSON, with
 * a caller-supplied `keyMap` imposing a data type on any path.
 *
 * The type does two jobs at once, which is the point of the feature: it decides
 * how a value is RENDERED when you are reading, and which control appears when
 * you are editing. `{"user.age": "number"}` is not documentation — it is the
 * reason that row is a numeric field and the reason `"thirty-six"` shows up in
 * red instead of quietly becoming `0`.
 *
 * The three design decisions worth knowing before you use it:
 *
 *  - **`keyMap` is a JSON string, and only a string.** It has to survive an MCP
 *    tool argument, a config column and a `data-*` attribute; a live object
 *    survives none of those. See {@link JsonEditorProps.keyMap}.
 *  - **Nothing is coerced and nothing is dropped.** A value that contradicts
 *    its declared type keeps its real value, renders through the raw editor,
 *    and is reported through the issues panel, the `data-issues` count and
 *    `onIssuesChange` — the same channel a broken `keyMap` uses.
 *  - **It is controlled, all the way down.** The document lives in `value`.
 *    The only state here is which rows are expanded, which add-form is open,
 *    and the half-typed text inside a control that has not committed yet.
 *
 * Every control is a `react-fancy` primitive, so restyling the kit restyles
 * this, and `mode="view"` gets the kit's click-to-edit behaviour for free.
 */
export const JsonEditor = forwardRef<HTMLDivElement, JsonEditorProps>(function JsonEditor(
  {
    value,
    onChange,
    keyMap,
    mode = "view",
    size = "sm",
    readOnly = false,
    expanded,
    defaultExpanded,
    onExpandedChange,
    showIssues = true,
    onIssuesChange,
    pendingMode = false,
    pending,
    onPendingChange,
    onActivity,
    allowAdd = true,
    allowRemove = true,
    allowRename = true,
    allowReorder = true,
    rootLabel = "value",
    emptyLabel = "No keys yet.",
    idPrefix,
    className,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const prefix = idPrefix ?? autoId;
  const editSeq = useRef(0);

  // Parsed ONCE per distinct keyMap string — not per row, not per render. The
  // map is compiled into path patterns with a specificity score, and rows only
  // ever do a match against that.
  const parsedKeyMap = useMemo(() => parseKeyMap(keyMap), [keyMap]);
  const rules = parsedKeyMap.rules;

  const conflicts = useMemo(() => findJsonConflicts(value, rules), [value, rules]);

  // Transient complaints about an edit that was refused (duplicate key, empty
  // key). They belong beside the type conflicts because from the user's side
  // they are the same thing: something they can see is wrong and can fix.
  const [editIssues, setEditIssues] = useState<JsonEditorIssue[]>([]);

  const issues = useMemo(
    () => [...parsedKeyMap.issues, ...conflicts, ...editIssues],
    [parsedKeyMap.issues, conflicts, editIssues],
  );

  const onIssuesChangeRef = useRef(onIssuesChange);
  onIssuesChangeRef.current = onIssuesChange;
  const lastIssueSignature = useRef<string | null>(null);

  useEffect(() => {
    const signature = JSON.stringify(issues);
    if (signature === lastIssueSignature.current) return;
    lastIssueSignature.current = signature;
    onIssuesChangeRef.current?.(issues);
  }, [issues]);

  // ── expansion ─────────────────────────────────────────────────────────
  // `null` means "expanded, everything" — the state a caller that named no
  // paths is in. Storing it as a sentinel rather than materialising every
  // container path keeps a container added later expanded too.
  const expandedControlled = expanded !== undefined;
  const [expandedUncontrolled, setExpandedUncontrolled] = useState<string[] | null>(
    defaultExpanded ?? null,
  );
  const expandedList = expandedControlled ? expanded : expandedUncontrolled;

  const isExpanded = useCallback(
    (dotted: string) => expandedList === null || expandedList.includes(dotted),
    [expandedList],
  );

  const toggleExpanded = useCallback(
    (dotted: string) => {
      const current = expandedList ?? collectContainerPaths(value);
      const next = current.includes(dotted)
        ? current.filter((path) => path !== dotted)
        : [...current, dotted];
      if (!expandedControlled) setExpandedUncontrolled(next);
      onExpandedChange?.(next);
    },
    [expandedList, expandedControlled, onExpandedChange, value],
  );

  // ── add form ──────────────────────────────────────────────────────────
  const [addingAt, setAddingAt] = useState<string | null>(null);

  // ── committing ────────────────────────────────────────────────────────
  const stagedPending = useMemo(() => pending ?? [], [pending]);

  const commit = useCallback(
    (edit: JsonEditorEdit) => {
      setEditIssues([]);

      if (pendingMode) {
        // Trust-but-verify: the edit becomes a PROPOSAL. `value` does not move
        // and `onChange` does not fire until a human accepts it.
        const staged: JsonEditorPendingEdit = {
          ...edit,
          id: edit.id ?? `${prefix}-edit-${editSeq.current++}`,
          label: edit.label ?? describeEdit(edit),
        };
        onPendingChange?.([...stagedPending, staged]);
        onActivity?.({ type: "stage", edit: staged });
        return;
      }

      const next = applyJsonEdit(value, edit);
      // `applyJsonEdit` returns the same reference when it refuses an edit, so
      // a refusal never reaches the host as a spurious "changed" callback.
      if (next === value) return;
      onChange?.(next, edit);
      onActivity?.({ type: "commit", edit });
    },
    [pendingMode, prefix, stagedPending, onPendingChange, onActivity, value, onChange],
  );

  const refuse = useCallback((path: string, message: string) => {
    setEditIssues([{ kind: "edit", path, message }]);
  }, []);

  const setValueAt = useCallback(
    (node: JsonEditorNode, next: JsonValue) => {
      commit({ op: "set", path: node.dotted, value: next });
    },
    [commit],
  );

  const removeAt = useCallback(
    (node: JsonEditorNode) => {
      commit({ op: "remove", path: node.dotted });
    },
    [commit],
  );

  const moveAt = useCallback(
    (node: JsonEditorNode, to: number) => {
      commit({ op: "move", path: node.dotted, to });
    },
    [commit],
  );

  const renameAt = useCallback(
    (node: JsonEditorNode, key: string) => {
      if (key === node.key) return;
      if (key.trim() === "") {
        refuse(node.dotted, "A key cannot be empty.");
        return;
      }
      const parent = getAtPath(value, node.path.slice(0, -1));
      if (isJsonObject(parent) && Object.prototype.hasOwnProperty.call(parent, key)) {
        refuse(node.dotted, `A key named "${key}" already exists here — rename refused.`);
        return;
      }
      commit({ op: "rename", path: node.dotted, key });
    },
    [commit, refuse, value],
  );

  const insertInto = useCallback(
    (dotted: string, key: string | undefined, type: JsonFieldType) => {
      const segments = parsePath(dotted);
      const container = dotted === "" ? value : getAtPath(value, segments);
      const isArray = isJsonArray(container);

      if (!isArray) {
        if (key === undefined || key.trim() === "") {
          refuse(dotted, "A new key needs a name.");
          return;
        }
        if (isJsonObject(container) && Object.prototype.hasOwnProperty.call(container, key)) {
          refuse(dotted, `A key named "${key}" already exists here.`);
          return;
        }
      }

      const rule = resolveKeyRule(rules, [...segments, isArray ? "*" : key!]);
      setAddingAt(null);
      commit({
        op: "insert",
        path: dotted,
        key: isArray ? undefined : key,
        value: seedValue(type, rule),
      });
    },
    [commit, refuse, rules, value],
  );

  const pendingFor = useCallback(
    (dotted: string) => stagedPending.filter((edit) => edit.path === dotted),
    [stagedPending],
  );

  const acceptPending = useCallback(
    (id: string) => {
      const edit = stagedPending.find((candidate) => candidate.id === id);
      if (!edit) return;
      const next = applyJsonEdit(value, edit);
      onPendingChange?.(stagedPending.filter((candidate) => candidate.id !== id));
      if (next !== value) {
        onChange?.(next, edit);
        onActivity?.({ type: "accept", edit });
      }
    },
    [stagedPending, value, onPendingChange, onChange, onActivity],
  );

  const rejectPending = useCallback(
    (id: string) => {
      const edit = stagedPending.find((candidate) => candidate.id === id);
      onPendingChange?.(stagedPending.filter((candidate) => candidate.id !== id));
      if (edit) onActivity?.({ type: "reject", edit });
    },
    [stagedPending, onPendingChange, onActivity],
  );

  // ── rows ──────────────────────────────────────────────────────────────
  const items = useMemo(
    () =>
      buildItems({
        value,
        rules,
        conflicts,
        isExpanded,
        addingAt,
        rootLabel,
      }),
    [value, rules, conflicts, isExpanded, addingAt, rootLabel],
  );

  const rootIsContainer = isContainerValue(value);
  const rootKind = isJsonArray(value) ? "array" : "object";
  const attachedIds = new Set(
    items.flatMap((item) => (item.kind === "node" ? [item.node.dotted] : [])),
  );
  const orphanPending = stagedPending.filter((edit) => !attachedIds.has(edit.path));

  const context = useMemo<JsonEditorContextValue>(
    () => ({
      mode: readOnly ? "view" : mode,
      size,
      readOnly,
      allowAdd: allowAdd && !readOnly,
      allowRemove: allowRemove && !readOnly,
      allowRename: allowRename && !readOnly,
      allowReorder: allowReorder && !readOnly,
      pendingMode,
      idPrefix: prefix,
      isExpanded,
      toggleExpanded,
      setValueAt,
      removeAt,
      renameAt,
      moveAt,
      insertInto,
      addingAt,
      setAddingAt,
      pendingFor,
      acceptPending,
      rejectPending,
    }),
    [
      mode,
      size,
      readOnly,
      allowAdd,
      allowRemove,
      allowRename,
      allowReorder,
      pendingMode,
      prefix,
      isExpanded,
      toggleExpanded,
      setValueAt,
      removeAt,
      renameAt,
      moveAt,
      insertInto,
      addingAt,
      pendingFor,
      acceptPending,
      rejectPending,
    ],
  );

  return (
    <JsonEditorContext.Provider value={context}>
      <div
        ref={ref}
        // Rest FIRST: a caller's `data-*` / `aria-*` reach the DOM, but nothing
        // they pass can overwrite the marker below or drop the internal classes.
        {...rest}
        data-react-fancy-json-editor=""
        data-issues={String(issues.length)}
        data-keymap-error={parsedKeyMap.ok ? undefined : "true"}
        data-mode={readOnly ? "readonly" : mode}
        className={cn(
          "overflow-hidden rounded-lg border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
          className,
        )}
      >
        {showIssues && issues.length > 0 && (
          <div data-react-fancy-json-editor-issues="" className="p-2">
            <Callout color={parsedKeyMap.ok ? "amber" : "red"}>
              <Text size="sm" weight="semibold" className="mb-1">
                {parsedKeyMap.ok
                  ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`
                  : "The keyMap could not be used — values are shown untyped."}
              </Text>
              <ul className="space-y-0.5">
                {issues.map((issue, index) => (
                  <li key={`${issue.kind}-${issue.path}-${index}`}>
                    <Text as="span" size="xs" data-react-fancy-json-editor-issue="" data-kind={issue.kind} data-path={issue.path}>
                      {issue.path ? `${issue.path} — ` : ""}
                      {issue.message}
                    </Text>
                  </li>
                ))}
              </ul>
            </Callout>
          </div>
        )}

        <div data-react-fancy-json-editor-tree="" role="tree" aria-label={rest["aria-label"] ?? "JSON document"}>
          {items.length === 0 ? (
            <Text as="p" size="sm" color="muted" className="px-3 py-4">
              {emptyLabel}
            </Text>
          ) : (
            items.map((item) =>
              item.kind === "node" ? (
                <JsonEditorRow key={`row:${item.node.dotted}`} node={item.node} />
              ) : (
                <JsonEditorAddForm
                  key={`add:${item.path}`}
                  path={item.path}
                  kind={item.containerKind}
                  depth={item.depth}
                  suggestedType={item.suggestedType}
                />
              ),
            )
          )}
        </div>

        {orphanPending.length > 0 && (
          <div data-react-fancy-json-editor-orphan-pending="" className="border-t border-zinc-100 p-2 dark:border-zinc-800">
            {orphanPending.map((edit) => (
              <div key={edit.id} className="flex items-center gap-2 py-0.5">
                <Text as="span" size="xs" color="muted" className="min-w-0 flex-1 truncate font-mono">
                  {edit.label ?? describeEdit(edit)}
                </Text>
                <Button
                  size="xs"
                  color="emerald"
                  data-react-fancy-json-editor-accept=""
                  data-id={edit.id}
                  onClick={() => acceptPending(edit.id)}
                >
                  Accept
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  data-react-fancy-json-editor-reject=""
                  data-id={edit.id}
                  onClick={() => rejectPending(edit.id)}
                >
                  Reject
                </Button>
              </div>
            ))}
          </div>
        )}

        {rootIsContainer && allowAdd && !readOnly && (
          <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="xs"
              icon="plus"
              data-react-fancy-json-editor-add=""
              data-path=""
              onClick={() => setAddingAt(addingAt === "" ? null : "")}
            >
              {rootKind === "array" ? "Append item" : "Add key"}
            </Button>
          </div>
        )}
      </div>
    </JsonEditorContext.Provider>
  );
});

interface BuildItemsOptions {
  value: JsonValue;
  rules: JsonKeyMapEntry[];
  conflicts: JsonEditorIssue[];
  isExpanded: (dotted: string) => boolean;
  addingAt: string | null;
  rootLabel: string;
}

function buildItems({
  value,
  rules,
  conflicts,
  isExpanded,
  addingAt,
  rootLabel,
}: BuildItemsOptions): RenderItem[] {
  const out: RenderItem[] = [];
  const conflictByPath = new Map<string, JsonEditorIssue>();
  for (const issue of conflicts) {
    if (issue.kind === "type" && !conflictByPath.has(issue.path)) conflictByPath.set(issue.path, issue);
  }

  const makeNode = (
    segments: JsonPath,
    node: JsonValue,
    depth: number,
    parentKind: JsonEditorNode["parentKind"],
  ): JsonEditorNode => {
    const rule = segments.length > 0 ? resolveKeyRule(rules, segments) : undefined;
    const type = rule?.type ?? inferType(node);
    const dotted = pathToString(segments);
    const conflict = conflictByPath.get(dotted);
    // A `json` node is raw text by definition, and a node in conflict must show
    // what it really holds — neither is a branch to walk into.
    const container = !conflict && type !== "json" && isContainerValue(node);

    return {
      path: segments,
      dotted,
      key: segments[segments.length - 1] ?? rootLabel,
      depth,
      value: node,
      parentKind,
      rule,
      type,
      declared: rule !== undefined,
      container,
      childCount: isJsonArray(node)
        ? node.length
        : isJsonObject(node)
          ? Object.keys(node).length
          : 0,
      conflict,
    };
  };

  const emitChildren = (node: JsonValue, segments: JsonPath, depth: number) => {
    if (isJsonArray(node)) {
      node.forEach((child, index) => emit(child, [...segments, String(index)], depth, "array"));
    } else if (isJsonObject(node)) {
      for (const [key, child] of Object.entries(node)) {
        emit(child, [...segments, key], depth, "object");
      }
    }
  };

  const emit = (
    node: JsonValue,
    segments: JsonPath,
    depth: number,
    parentKind: JsonEditorNode["parentKind"],
  ) => {
    const built = makeNode(segments, node, depth, parentKind);
    out.push({ kind: "node", node: built });

    if (!built.container || !isExpanded(built.dotted)) return;

    emitChildren(node, segments, depth + 1);
    if (addingAt === built.dotted) {
      out.push({
        kind: "add",
        path: built.dotted,
        containerKind: isJsonArray(node) ? "array" : "object",
        depth: depth + 1,
        suggestedType: resolveKeyRule(rules, [...segments, "*"])?.type,
      });
    }
  };

  if (isContainerValue(value)) {
    emitChildren(value, [], 0);
    if (addingAt === "") {
      out.push({
        kind: "add",
        path: "",
        containerKind: isJsonArray(value) ? "array" : "object",
        depth: 0,
        suggestedType: resolveKeyRule(rules, ["*"])?.type,
      });
    }
  } else {
    out.push({ kind: "node", node: makeNode([], value, 0, "root") });
  }

  return out;
}

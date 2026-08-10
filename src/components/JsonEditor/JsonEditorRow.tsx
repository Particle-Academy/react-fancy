import { useState } from "react";
import { cn } from "../../utils/cn";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { Text } from "../Text/Text";
import { Input } from "../inputs/Input/Input";
import { Select } from "../inputs/Select/Select";
import { useJsonEditorContext } from "./JsonEditor.context";
import { describeEdit } from "./JsonEditor.paths";
import { JsonEditorValue, toText } from "./JsonEditorValue";
import { JSON_FIELD_TYPES } from "./JsonEditor.types";
import type { JsonEditorNode, JsonFieldType } from "./JsonEditor.types";

/** One indent step, in px. Applied as an inline style because depth is data. */
const INDENT = 18;

export interface JsonEditorRowProps {
  node: JsonEditorNode;
}

/**
 * One key/value row.
 *
 * Flat in the DOM rather than nested: `aria-level` carries the depth, so an
 * agent can address `[data-path="orders.2.total"]` in one selector instead of
 * walking a nesting it would have to guess the shape of. It is also the
 * standard flat-tree ARIA pattern.
 */
export function JsonEditorRow({ node }: JsonEditorRowProps) {
  const ctx = useJsonEditorContext();
  const { dotted, key, depth, container, conflict } = node;

  const expanded = container ? ctx.isExpanded(dotted) : undefined;
  const pending = ctx.pendingFor(dotted);
  const renameable =
    ctx.allowRename && !ctx.readOnly && node.parentKind === "object" && ctx.mode === "edit";
  const label = node.rule?.label ?? key;

  return (
    <div
      data-react-fancy-json-editor-row=""
      data-path={dotted}
      data-key={key}
      data-type={node.type}
      data-depth={depth}
      data-declared={node.declared ? "true" : "false"}
      data-conflict={conflict ? "true" : undefined}
      data-pending={pending.length > 0 ? "true" : undefined}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={expanded}
      className={cn(
        "border-b border-zinc-100 py-1 last:border-b-0 dark:border-zinc-800",
        conflict && "bg-red-50/60 dark:bg-red-950/20",
        pending.length > 0 && "bg-violet-50/60 dark:bg-violet-950/20",
      )}
    >
      <div className="flex items-start gap-2 px-2" style={{ paddingInlineStart: depth * INDENT + 8 }}>
        {container ? (
          <Button
            variant="ghost"
            size="xs"
            data-react-fancy-json-editor-toggle=""
            data-path={dotted}
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            aria-expanded={expanded}
            icon={expanded ? "chevron-down" : "chevron-right"}
            onClick={() => ctx.toggleExpanded(dotted)}
          />
        ) : (
          <span aria-hidden="true" className="inline-block w-6 shrink-0" />
        )}

        <div
          data-react-fancy-json-editor-key=""
          data-path={dotted}
          className="w-1/3 min-w-0 shrink-0"
        >
          {renameable ? (
            <Input
              // Uncontrolled + keyed + commit on blur: renaming per keystroke
              // would fire one structural edit per character.
              key={key}
              size={ctx.size}
              mode="edit"
              defaultValue={key}
              spellCheck={false}
              aria-label={`Key of ${dotted}`}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              onBlur={(event) => {
                const next = event.currentTarget.value;
                if (next !== key) ctx.renameAt(node, next);
              }}
            />
          ) : (
            <Text
              as="span"
              size="sm"
              weight="medium"
              color={node.parentKind === "array" ? "muted" : "default"}
              className="block truncate py-1 font-mono"
              title={dotted}
            >
              {node.parentKind === "array" ? `[${key}]` : label}
            </Text>
          )}
          {node.rule?.description && (
            <Text as="span" size="xs" color="muted" className="block truncate">
              {node.rule.description}
            </Text>
          )}
        </div>

        <div
          data-react-fancy-json-editor-value=""
          data-path={dotted}
          data-type={node.type}
          className="min-w-0 flex-1"
        >
          {container ? (
            <Text as="span" size="sm" color="muted" className="block py-1 font-mono">
              {node.type === "array"
                ? `[ ${node.childCount} ${node.childCount === 1 ? "item" : "items"} ]`
                : `{ ${node.childCount} ${node.childCount === 1 ? "key" : "keys"} }`}
            </Text>
          ) : (
            <JsonEditorValue
              node={node}
              mode={ctx.mode}
              size={ctx.size}
              readOnly={ctx.readOnly}
              id={`${ctx.idPrefix}-${dotted}`}
              onCommit={(next) => ctx.setValueAt(node, next)}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          {node.declared && (
            <Badge size="sm" variant="soft" color={conflict ? "red" : "zinc"}>
              {node.type}
            </Badge>
          )}
          {container && ctx.allowAdd && !ctx.readOnly && (
            <Button
              variant="ghost"
              size="xs"
              data-react-fancy-json-editor-add=""
              data-path={dotted}
              aria-label={`Add to ${label}`}
              icon="plus"
              onClick={() => ctx.setAddingAt(ctx.addingAt === dotted ? null : dotted)}
            />
          )}
          {ctx.allowReorder && !ctx.readOnly && node.parentKind === "array" && (
            <>
              <Button
                variant="ghost"
                size="xs"
                data-react-fancy-json-editor-move-up=""
                data-path={dotted}
                aria-label={`Move ${dotted} up`}
                icon="arrow-up"
                onClick={() => ctx.moveAt(node, Number(key) - 1)}
              />
              <Button
                variant="ghost"
                size="xs"
                data-react-fancy-json-editor-move-down=""
                data-path={dotted}
                aria-label={`Move ${dotted} down`}
                icon="arrow-down"
                onClick={() => ctx.moveAt(node, Number(key) + 1)}
              />
            </>
          )}
          {ctx.allowRemove && !ctx.readOnly && node.parentKind !== "root" && (
            <Button
              variant="ghost"
              size="xs"
              color="red"
              data-react-fancy-json-editor-remove=""
              data-path={dotted}
              aria-label={`Remove ${dotted}`}
              icon="trash-2"
              onClick={() => ctx.removeAt(node)}
            />
          )}
        </div>
      </div>

      {conflict && (
        <Text
          as="span"
          size="xs"
          color="danger"
          data-react-fancy-json-editor-conflict=""
          data-path={dotted}
          className="block px-2 pb-1"
          style={{ paddingInlineStart: depth * INDENT + 40 }}
        >
          {conflict.message}
        </Text>
      )}

      {pending.map((edit) => (
        <div
          key={edit.id}
          data-react-fancy-json-editor-pending=""
          data-id={edit.id}
          data-path={dotted}
          className="flex items-center gap-2 px-2 pb-1"
          style={{ paddingInlineStart: depth * INDENT + 40 }}
        >
          <Badge size="sm" variant="soft" color="violet">
            proposed
          </Badge>
          <Text as="span" size="xs" color="muted" className="min-w-0 truncate font-mono">
            {edit.label ?? describeEdit(edit)}
            {edit.op === "set" || edit.op === "insert" ? ` → ${toText(edit.value)}` : ""}
          </Text>
          <Button
            size="xs"
            color="emerald"
            data-react-fancy-json-editor-accept=""
            data-id={edit.id}
            onClick={() => ctx.acceptPending(edit.id)}
          >
            Accept
          </Button>
          <Button
            size="xs"
            variant="ghost"
            data-react-fancy-json-editor-reject=""
            data-id={edit.id}
            onClick={() => ctx.rejectPending(edit.id)}
          >
            Reject
          </Button>
        </div>
      ))}
    </div>
  );
}

export interface JsonEditorAddFormProps {
  /** Dotted path of the container being added to; `""` is the document root. */
  path: string;
  kind: "object" | "array";
  depth: number;
  /** Declared type for the container's children, when the keyMap names one. */
  suggestedType?: JsonFieldType;
}

/**
 * The inline "add a key" form.
 *
 * Its open/closed state and its two draft fields are the only state this
 * component owns that is not in `value` — and deliberately so: a half-typed key
 * name is not part of the document, and an agent adding a key does it through
 * an `insert` edit, never by driving this form.
 */
export function JsonEditorAddForm({ path, kind, depth, suggestedType }: JsonEditorAddFormProps) {
  const ctx = useJsonEditorContext();
  const [key, setKey] = useState("");
  const [type, setType] = useState<JsonFieldType>(suggestedType ?? "string");

  return (
    <div
      data-react-fancy-json-editor-add-form=""
      data-path={path}
      className="flex items-center gap-2 border-b border-zinc-100 px-2 py-1.5 dark:border-zinc-800"
      style={{ paddingInlineStart: depth * INDENT + 32 }}
    >
      {kind === "object" && (
        <Input
          size={ctx.size}
          mode="edit"
          value={key}
          placeholder="key"
          aria-label="New key"
          spellCheck={false}
          data-react-fancy-json-editor-add-key=""
          onValueChange={setKey}
        />
      )}
      <Select
        size={ctx.size}
        mode="edit"
        aria-label="New value type"
        data-react-fancy-json-editor-add-type=""
        list={[...JSON_FIELD_TYPES]}
        value={type}
        onValueChange={(next) => setType(next as JsonFieldType)}
      />
      <Button
        size="xs"
        color="blue"
        data-react-fancy-json-editor-add-confirm=""
        onClick={() => ctx.insertInto(path, kind === "object" ? key : undefined, type)}
      >
        Add
      </Button>
      <Button
        size="xs"
        variant="ghost"
        data-react-fancy-json-editor-add-cancel=""
        onClick={() => ctx.setAddingAt(null)}
      >
        Cancel
      </Button>
    </div>
  );
}

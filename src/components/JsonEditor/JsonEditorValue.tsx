import { ColorPicker } from "../ColorPicker/ColorPicker";
import { Input } from "../inputs/Input/Input";
import { Textarea } from "../inputs/Textarea/Textarea";
import { Select } from "../inputs/Select/Select";
import { Switch } from "../inputs/Switch/Switch";
import { DatePicker } from "../inputs/DatePicker/DatePicker";
import { DisplayValue } from "../inputs/mode/DisplayValue";
import { useInlineEdit } from "../inputs/mode/useInlineEdit";
import { resolveOption } from "../inputs/inputs.utils";
import type { FieldMode } from "../inputs/inputs.types";
import type { Size } from "../../utils/types";
import type { JsonEditorNode, JsonFieldType, JsonValue } from "./JsonEditor.types";

export interface JsonEditorValueProps {
  node: JsonEditorNode;
  mode: FieldMode;
  size: Size;
  /** No control at all — the row still shows the value. */
  readOnly: boolean;
  /** Stable control id: `<idPrefix>-<dotted path>`. */
  id: string;
  onCommit: (value: JsonValue) => void;
}

const COLOR_PICKER_SIZE: Record<Size, "sm" | "md" | "lg"> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "lg",
};

/**
 * Types whose text form IS the value commit on every keystroke; types that must
 * be PARSED out of text commit on blur instead.
 *
 * That split is not fussiness. A controlled `number` field that parses per
 * keystroke turns `1.5` into `1` the moment you type the dot, and moves the
 * caret while you are still typing. Committing on blur means the intermediate
 * text is never anybody's value.
 */
function isRawTextType(type: JsonFieldType): boolean {
  return type === "number" || type === "integer" || type === "json";
}

/** The text shown for a value in a raw editor — strings verbatim, everything else as JSON. */
export function toText(value: JsonValue | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value) ?? "";
}

/**
 * Read a raw editor's text back into a value.
 *
 * Text that will not parse as the declared type is stored AS TEXT. That is the
 * deliberate choice at the heart of this component: typing `abc` into a field
 * declared `number` neither coerces to `0`/`NaN` nor throws the keystrokes
 * away — it writes `"abc"` and lets the conflict machinery say so, in the same
 * place it reports bad data that arrived from the server.
 */
export function fromText(text: string, type: JsonFieldType): JsonValue {
  switch (type) {
    case "number":
    case "integer": {
      const trimmed = text.trim();
      if (trimmed === "") return text;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : text;
    }
    case "boolean": {
      const trimmed = text.trim().toLowerCase();
      if (trimmed === "true") return true;
      if (trimmed === "false") return false;
      return text;
    }
    case "json":
    case "object":
    case "array":
      try {
        return JSON.parse(text) as JsonValue;
      } catch {
        return text;
      }
    default:
      return text;
  }
}

/**
 * The read-or-edit control for one leaf value.
 *
 * Everything here is a `react-fancy` primitive — `Input`, `Textarea`, `Select`,
 * `Switch`, `DatePicker`, `ColorPicker` — and the view/edit swap is the kit's
 * own `useInlineEdit` + `DisplayValue`, not a private re-implementation of it.
 */
export function JsonEditorValue({ node, mode, size, readOnly, id, onCommit }: JsonEditorValueProps) {
  const locked = readOnly || node.rule?.readOnly === true;
  const resolvedMode: FieldMode = locked ? "view" : mode;
  const { value, rule } = node;

  // A value that contradicts its declared type cannot be shown through that
  // type's control — a number input cannot hold "thirty-six" — so it falls back
  // to the raw editor, which is also the only place it can be repaired.
  if (node.conflict || isRawTextType(node.type)) {
    return (
      <RawValueEditor
        id={id}
        text={toText(value)}
        type={node.type}
        mode={resolvedMode}
        size={size}
        disabled={locked}
        multiline={node.type === "json" || typeof value === "object"}
        placeholder={rule?.placeholder}
        onCommitText={(text) => onCommit(fromText(text, node.type))}
      />
    );
  }

  const common = { id, size, mode: resolvedMode, disabled: locked } as const;

  switch (node.type) {
    case "boolean":
      return (
        <Switch
          {...common}
          checked={value === true}
          onCheckedChange={(next) => onCommit(next)}
        />
      );

    case "enum": {
      const options = rule?.options ?? [];
      return (
        <Select
          {...common}
          list={options}
          value={String(value)}
          onValueChange={(next) => {
            // Emit the option's ORIGINAL value, so a numeric or boolean enum
            // does not silently become a string on its way through the DOM.
            const match = options
              .map((option) => resolveOption(option))
              .find((option) => String(option.value) === next);
            onCommit((match?.value ?? next) as JsonValue);
          }}
        />
      );
    }

    case "date":
    case "datetime":
      return (
        <DatePicker
          {...common}
          includeTime={node.type === "datetime"}
          min={rule?.min === undefined ? undefined : String(rule.min)}
          max={rule?.max === undefined ? undefined : String(rule.max)}
          value={typeof value === "string" ? value : ""}
          onValueChange={(next) => onCommit(next)}
        />
      );

    case "color":
      return (
        <ColorPicker
          size={COLOR_PICKER_SIZE[size]}
          mode={resolvedMode}
          disabled={locked}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => onCommit(next)}
        />
      );

    case "text":
      return (
        <Textarea
          {...common}
          minRows={2}
          autoResize
          placeholder={rule?.placeholder}
          value={typeof value === "string" ? value : ""}
          onValueChange={(next) => onCommit(next)}
        />
      );

    case "secret":
      return (
        <Input
          {...common}
          type="password"
          reveal
          placeholder={rule?.placeholder}
          value={typeof value === "string" ? value : ""}
          onValueChange={(next) => onCommit(next)}
        />
      );

    case "url":
    case "email":
    case "string":
    default:
      return (
        <Input
          {...common}
          type={node.type === "url" ? "url" : node.type === "email" ? "email" : "text"}
          placeholder={rule?.placeholder}
          value={typeof value === "string" ? value : ""}
          onValueChange={(next) => onCommit(next)}
        />
      );
  }
}

interface RawValueEditorProps {
  id: string;
  text: string;
  type: JsonFieldType;
  mode: FieldMode;
  size: Size;
  disabled: boolean;
  multiline: boolean;
  placeholder?: string;
  onCommitText: (text: string) => void;
}

/**
 * An uncontrolled text control that commits on blur.
 *
 * Uncontrolled is what keeps the component free of a private copy of the
 * document: the half-typed text lives in the DOM node, never in React state,
 * and the `key` is the committed text — so a value changed from OUTSIDE (an
 * agent writing through a bridge, a server push) remounts the control with the
 * new text, while local typing does not.
 */
function RawValueEditor({
  id,
  text,
  type,
  mode,
  size,
  disabled,
  multiline,
  placeholder,
  onCommitText,
}: RawValueEditorProps) {
  const { showControl, interactive, enterEdit, exitEdit } = useInlineEdit(mode, disabled);

  if (!showControl) {
    return (
      <DisplayValue size={size} interactive={interactive} onActivate={enterEdit}>
        {text}
      </DisplayValue>
    );
  }

  const commit = (next: string) => {
    if (next !== text) onCommitText(next);
  };

  if (multiline) {
    return (
      <Textarea
        id={id}
        key={text}
        size={size}
        mode="edit"
        minRows={3}
        disabled={disabled}
        placeholder={placeholder}
        defaultValue={text}
        spellCheck={false}
        autoFocus={interactive}
        className="font-mono"
        onBlur={(event) => {
          commit(event.currentTarget.value);
          exitEdit();
        }}
      />
    );
  }

  return (
    <Input
      id={id}
      key={text}
      size={size}
      mode="edit"
      type="text"
      // Not `type="number"`: an `<input type=number>` reports "" for text it
      // considers invalid, so the literal keystrokes we promise to keep would
      // be unreadable on commit. The numeric keyboard is requested instead.
      inputMode={type === "number" || type === "integer" ? "decimal" : undefined}
      disabled={disabled}
      placeholder={placeholder}
      defaultValue={text}
      spellCheck={false}
      autoFocus={interactive}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      onBlur={(event) => {
        commit(event.currentTarget.value);
        exitEdit();
      }}
    />
  );
}

import { createContext, useContext } from "react";
import type { FieldMode } from "../inputs/inputs.types";
import type { Size } from "../../utils/types";
import type {
  JsonEditorNode,
  JsonEditorPendingEdit,
  JsonFieldType,
  JsonValue,
} from "./JsonEditor.types";

/**
 * Everything a row needs that is not the row itself.
 *
 * Same shape as `Table`'s context and for the same reason: a row is rendered
 * once per key in a document that can be hundreds deep, and threading a dozen
 * props through the recursion makes every signature change a rewrite.
 */
export interface JsonEditorContextValue {
  mode: FieldMode;
  size: Size;
  readOnly: boolean;
  allowAdd: boolean;
  allowRemove: boolean;
  allowRename: boolean;
  allowReorder: boolean;
  pendingMode: boolean;
  idPrefix: string;

  isExpanded: (dotted: string) => boolean;
  toggleExpanded: (dotted: string) => void;

  setValueAt: (node: JsonEditorNode, value: JsonValue) => void;
  removeAt: (node: JsonEditorNode) => void;
  renameAt: (node: JsonEditorNode, key: string) => void;
  moveAt: (node: JsonEditorNode, to: number) => void;
  insertInto: (dotted: string, key: string | undefined, type: JsonFieldType) => void;

  /** Which container's add form is open, if any. Transient UI state, never model state. */
  addingAt: string | null;
  setAddingAt: (dotted: string | null) => void;

  pendingFor: (dotted: string) => JsonEditorPendingEdit[];
  acceptPending: (id: string) => void;
  rejectPending: (id: string) => void;
}

export const JsonEditorContext = createContext<JsonEditorContextValue | null>(null);

export function useJsonEditorContext(): JsonEditorContextValue {
  const context = useContext(JsonEditorContext);
  if (!context) {
    throw new Error("JsonEditor rows must be rendered inside a <JsonEditor>.");
  }
  return context;
}

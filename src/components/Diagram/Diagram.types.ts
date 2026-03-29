import type { ReactNode } from "react";
import type { ViewportState } from "../Canvas/Canvas.types";

export type DiagramType = "erd" | "flowchart" | "general";
export type RelationType = "one-to-one" | "one-to-many" | "many-to-many";
export type ExportFormat = "erd" | "uml" | "dfd";

export interface DiagramFieldData {
  name: string;
  type?: string;
  primary?: boolean;
  foreign?: boolean;
  nullable?: boolean;
}

export interface DiagramEntityData {
  /** Unique identifier. Defaults to `name` if omitted. */
  id?: string;
  name: string;
  fields?: DiagramFieldData[];
  x?: number;
  y?: number;
}

export interface DiagramRelationData {
  /** Unique identifier. Auto-generated if omitted. */
  id?: string;
  from: string;
  to: string;
  fromField?: string;
  toField?: string;
  type: RelationType;
  label?: string;
}

export interface DiagramSchema {
  entities: DiagramEntityData[];
  relations: DiagramRelationData[];
}

export interface DiagramContextValue {
  diagramType: DiagramType;
  schema: DiagramSchema;
  downloadableRef: React.RefObject<boolean>;
  importableRef: React.RefObject<boolean>;
  exportFormats: ExportFormat[];
  onImport?: (schema: DiagramSchema) => void;
}

export interface DiagramProps {
  children?: ReactNode;
  schema?: DiagramSchema;
  type?: DiagramType;
  viewport?: ViewportState;
  defaultViewport?: ViewportState;
  onViewportChange?: (viewport: ViewportState) => void;
  downloadable?: boolean;
  importable?: boolean;
  exportFormats?: ExportFormat[];
  onImport?: (schema: DiagramSchema) => void;
  minimap?: boolean;
  className?: string;
}

export interface DiagramEntityProps {
  children?: ReactNode;
  /** Unique identifier. Defaults to `name` if omitted. */
  id?: string;
  name: string;
  x?: number;
  y?: number;
  color?: string;
  /** Allow drag-to-move */
  draggable?: boolean;
  /** Called when the entity is dragged to a new position */
  onPositionChange?: (x: number, y: number) => void;
  className?: string;
}

export interface DiagramFieldProps {
  name: string;
  type?: string;
  primary?: boolean;
  foreign?: boolean;
  nullable?: boolean;
  className?: string;
}

export interface DiagramRelationProps {
  from: string;
  to: string;
  fromField?: string;
  toField?: string;
  type: RelationType;
  label?: string;
  className?: string;
}

export interface DiagramToolbarProps {
  className?: string;
}

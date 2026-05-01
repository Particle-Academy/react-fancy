import type { ReactNode } from "react";
import type { ViewportState } from "../Canvas/Canvas.types";

export type DiagramType = "erd" | "flowchart" | "general";

/** ERD/UML shorthand — sets fromMarker/toMarker (and lineStyle for some). */
export type RelationType =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many"
  | "association"      // none → arrow
  | "aggregation"      // diamond-open → none
  | "composition"      // diamond → none
  | "inheritance"      // none → triangle-open (UML — solid line)
  | "implementation"   // none → triangle-open (UML — dashed)
  | "dependency"       // none → arrow (dashed)
  | "custom";          // requires fromMarker + toMarker

/** Shape painted at each line endpoint. Strings prefixed `emoji:` render the
 *  rest of the string as text at the endpoint (e.g. `emoji:🎯`). */
export type MarkerType =
  | "none"
  | "arrow"
  | "arrow-open"
  | "circle"
  | "circle-open"
  | "square"
  | "square-open"
  | "diamond"
  | "diamond-open"
  | "triangle"
  | "triangle-open"
  | "one"
  | "many"
  | "optional-one"
  | "optional-many"
  | "cross"
  | (string & {});

export type LineStyle = "solid" | "dashed" | "dotted";
export type RoutingMode = "manhattan" | "bezier" | "straight";

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
  fromMarker?: MarkerType;
  toMarker?: MarkerType;
  lineStyle?: LineStyle;
  routing?: RoutingMode;
  color?: string;
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
  /** ERD/UML shorthand. Provides defaults for fromMarker/toMarker/lineStyle. */
  type?: RelationType;
  /** Override start endpoint marker. */
  fromMarker?: MarkerType;
  /** Override end endpoint marker. */
  toMarker?: MarkerType;
  /** Line style — solid (default), dashed, dotted. */
  lineStyle?: LineStyle;
  /** Routing algorithm — manhattan (default), bezier, straight. */
  routing?: RoutingMode;
  /** Stroke color. Defaults to a zinc gray. */
  color?: string;
  /** Stroke width. Default 2. */
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export interface DiagramToolbarProps {
  className?: string;
}

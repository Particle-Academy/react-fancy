import { useMemo, useRef } from "react";
import { cn } from "../../utils/cn";
import { Canvas } from "../Canvas/Canvas";
import { DiagramContext } from "./Diagram.context";
import { DiagramEntity } from "./DiagramEntity";
import { DiagramField } from "./DiagramField";
import { DiagramRelation } from "./DiagramRelation";
import { DiagramToolbar } from "./DiagramToolbar";
import { computeDiagramLayout } from "./diagram.layout";
import type { DiagramProps, DiagramContextValue } from "./Diagram.types";

function DiagramRoot({
  children,
  schema,
  type = "general",
  viewport,
  defaultViewport,
  onViewportChange,
  downloadable = false,
  importable = false,
  exportFormats = ["erd"],
  onImport,
  minimap = false,
  className,
}: DiagramProps) {
  // SECURITY: freeze downloadable/importable on mount, never update
  const downloadableRef = useRef(downloadable);
  const importableRef = useRef(importable);

  // Compute auto-layout positions for schema entities
  const resolvedSchema = useMemo(() => {
    if (!schema) return { entities: [], relations: [] };

    const layout = computeDiagramLayout(schema);
    const entities = schema.entities.map((entity) => {
      // Only auto-layout if no explicit position
      if (entity.x !== undefined && entity.y !== undefined) return entity;
      const pos = layout.get(entity.id);
      return pos ? { ...entity, x: pos.x, y: pos.y } : entity;
    });

    return { entities, relations: schema.relations };
  }, [schema]);

  const ctx = useMemo<DiagramContextValue>(
    () => ({
      diagramType: type,
      schema: resolvedSchema,
      downloadableRef,
      importableRef,
      exportFormats,
      onImport,
    }),
    [type, resolvedSchema, exportFormats, onImport],
  );

  return (
    <DiagramContext.Provider value={ctx}>
      <div data-react-fancy-diagram="" className="relative h-full w-full">
        <Canvas
          viewport={viewport}
          defaultViewport={defaultViewport}
          onViewportChange={onViewportChange}
          showGrid
          className={cn("h-full w-full", className)}
        >
          {/* Schema-driven entities */}
          {resolvedSchema.entities.map((entity) => (
            <DiagramEntity
              key={entity.id}
              id={entity.id}
              name={entity.name}
              x={entity.x ?? 0}
              y={entity.y ?? 0}
            >
              {entity.fields?.map((field) => (
                <DiagramField
                  key={field.name}
                  name={field.name}
                  type={field.type}
                  primary={field.primary}
                  foreign={field.foreign}
                  nullable={field.nullable}
                />
              ))}
            </DiagramEntity>
          ))}

          {/* Schema-driven relations */}
          {resolvedSchema.relations.map((rel) => (
            <DiagramRelation
              key={rel.id}
              from={rel.from}
              to={rel.to}
              fromField={rel.fromField}
              toField={rel.toField}
              type={rel.type}
              label={rel.label}
            />
          ))}

          {/* Declarative children */}
          {children}

          <Canvas.Controls />
          {minimap && <Canvas.Minimap />}
        </Canvas>
      </div>
    </DiagramContext.Provider>
  );
}

export const Diagram = Object.assign(DiagramRoot, {
  Entity: DiagramEntity,
  Field: DiagramField,
  Relation: DiagramRelation,
  Toolbar: DiagramToolbar,
});

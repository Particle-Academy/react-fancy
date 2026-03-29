import { useMemo, useRef, useState, useCallback } from "react";
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

  // Normalize schema: default id to name, add id to relations
  const normalizedSchema = useMemo(() => {
    if (!schema) return { entities: [], relations: [] };
    const entities = schema.entities.map((e) => ({
      ...e,
      id: e.id ?? e.name,
    }));
    const relations = schema.relations.map((r, i) => ({
      ...r,
      id: r.id ?? `rel-${i}`,
    }));
    return { entities, relations };
  }, [schema]);

  // Compute auto-layout positions for schema entities
  const initialPositions = useMemo(() => {
    if (normalizedSchema.entities.length === 0) return new Map<string, { x: number; y: number }>();

    const layout = computeDiagramLayout(normalizedSchema);
    const positions = new Map<string, { x: number; y: number }>();

    for (const entity of normalizedSchema.entities) {
      if (entity.x !== undefined && entity.y !== undefined) {
        positions.set(entity.id, { x: entity.x, y: entity.y });
      } else {
        const pos = layout.get(entity.id);
        positions.set(entity.id, pos ?? { x: 0, y: 0 });
      }
    }

    return positions;
  }, [normalizedSchema]);

  // Compute a default viewport that centers all entities
  // This avoids relying on fitOnMount which needs DOM measurements
  const computedDefaultViewport = useMemo(() => {
    if (defaultViewport) return defaultViewport;
    if (initialPositions.size === 0) return { panX: 0, panY: 0, zoom: 1 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    initialPositions.forEach((pos) => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      // Estimate entity size: 220px wide, ~200px tall
      maxX = Math.max(maxX, pos.x + 220);
      maxY = Math.max(maxY, pos.y + 200);
    });

    const padding = 40;
    // Offset pan so the content is roughly centered
    // Since we don't know container size yet, just shift to make minX/minY visible
    const panX = -minX + padding;
    const panY = -minY + padding;

    return { panX, panY, zoom: 1 };
  }, [defaultViewport, initialPositions]);

  // Mutable position state for dragging
  const [entityPositions, setEntityPositions] = useState(initialPositions);

  const handleEntityMove = useCallback((entityId: string, x: number, y: number) => {
    setEntityPositions((prev) => {
      const next = new Map(prev);
      next.set(entityId, { x, y });
      return next;
    });
  }, []);

  const ctx = useMemo<DiagramContextValue>(
    () => ({
      diagramType: type,
      schema: normalizedSchema,
      downloadableRef,
      importableRef,
      exportFormats,
      onImport,
    }),
    [type, normalizedSchema, exportFormats, onImport],
  );

  return (
    <DiagramContext.Provider value={ctx}>
      <div data-react-fancy-diagram="" className="relative h-full w-full">
        <Canvas
          viewport={viewport}
          defaultViewport={computedDefaultViewport}
          onViewportChange={onViewportChange}
          showGrid
          fitOnMount
          className={cn("h-full w-full", className)}
        >
          {/* Schema-driven entities */}
          {normalizedSchema.entities.map((entity) => {
            const pos = entityPositions.get(entity.id) ?? { x: 0, y: 0 };
            return (
              <DiagramEntity
                key={entity.id}
                id={entity.id}
                name={entity.name}
                x={pos.x}
                y={pos.y}
                draggable
                onPositionChange={(nx, ny) => handleEntityMove(entity.id, nx, ny)}
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
            );
          })}

          {/* Schema-driven relations */}
          {normalizedSchema.relations.map((rel) => (
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

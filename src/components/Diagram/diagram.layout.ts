import type { DiagramSchema } from "./Diagram.types";

const ENTITY_WIDTH = 220;
const HEADER_HEIGHT = 40;
const FIELD_HEIGHT = 28;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 60;

function getEntityHeight(fieldCount: number): number {
  return HEADER_HEIGHT + Math.max(fieldCount, 1) * FIELD_HEIGHT;
}

/**
 * Compute grid-based auto-layout positions for diagram entities.
 *
 * Arranges entities in rows based on relation depth using BFS:
 * - Row 0: entities with no incoming relations (roots)
 * - Row 1: entities that only have relations from row 0, etc.
 */
/**
 * Resolve the stable id for an entity. Per the type contract, `id` defaults
 * to `name` when omitted. Normalizing once at the top keeps `string | undefined`
 * propagation out of every downstream Map/Set.
 */
function resolveEntityId(entity: { id?: string; name: string }): string {
  return entity.id ?? entity.name;
}

export function computeDiagramLayout(
  schema: DiagramSchema,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const entityIds = new Set(schema.entities.map(resolveEntityId));

  // Build adjacency: incoming edges per entity
  const incoming = new Map<string, Set<string>>();
  for (const id of entityIds) {
    incoming.set(id, new Set());
  }
  for (const rel of schema.relations) {
    if (entityIds.has(rel.from) && entityIds.has(rel.to)) {
      incoming.get(rel.to)!.add(rel.from);
    }
  }

  // BFS to assign rows
  const rowAssignment = new Map<string, number>();
  const assigned = new Set<string>();

  // Row 0: entities with no incoming relations
  const queue: string[] = [];
  for (const id of entityIds) {
    if (incoming.get(id)!.size === 0) {
      rowAssignment.set(id, 0);
      assigned.add(id);
      queue.push(id);
    }
  }

  // If all entities have incoming relations (cycle), start with the first entity
  if (queue.length === 0 && entityIds.size > 0) {
    const firstId = resolveEntityId(schema.entities[0]);
    rowAssignment.set(firstId, 0);
    assigned.add(firstId);
    queue.push(firstId);
  }

  // Build outgoing edges for BFS traversal
  const outgoing = new Map<string, string[]>();
  for (const id of entityIds) {
    outgoing.set(id, []);
  }
  for (const rel of schema.relations) {
    if (entityIds.has(rel.from) && entityIds.has(rel.to)) {
      outgoing.get(rel.from)!.push(rel.to);
    }
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const currentRow = rowAssignment.get(current)!;
    for (const neighbor of outgoing.get(current) ?? []) {
      if (!assigned.has(neighbor)) {
        rowAssignment.set(neighbor, currentRow + 1);
        assigned.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Assign any remaining unvisited entities (disconnected components)
  for (const id of entityIds) {
    if (!assigned.has(id)) {
      rowAssignment.set(id, 0);
    }
  }

  // Group entities by row
  const rows = new Map<number, string[]>();
  for (const [id, row] of rowAssignment) {
    if (!rows.has(row)) {
      rows.set(row, []);
    }
    rows.get(row)!.push(id);
  }

  // Build a lookup for field counts
  const fieldCounts = new Map<string, number>();
  for (const entity of schema.entities) {
    fieldCounts.set(resolveEntityId(entity), entity.fields?.length ?? 0);
  }

  // Compute positions row by row
  const sortedRows = Array.from(rows.keys()).sort((a, b) => a - b);
  let currentY = 0;

  for (const rowIndex of sortedRows) {
    const rowEntities = rows.get(rowIndex)!;
    const totalWidth =
      rowEntities.length * ENTITY_WIDTH +
      (rowEntities.length - 1) * HORIZONTAL_GAP;
    const startX = -totalWidth / 2 + ENTITY_WIDTH / 2;

    let maxHeight = 0;
    for (let i = 0; i < rowEntities.length; i++) {
      const entityId = rowEntities[i];
      const x = startX + i * (ENTITY_WIDTH + HORIZONTAL_GAP) - ENTITY_WIDTH / 2;
      positions.set(entityId, { x, y: currentY });
      const height = getEntityHeight(fieldCounts.get(entityId) ?? 0);
      if (height > maxHeight) {
        maxHeight = height;
      }
    }

    currentY += maxHeight + VERTICAL_GAP;
  }

  return positions;
}

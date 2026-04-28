import type {
  DiagramSchema,
  DiagramEntityData,
  DiagramRelationData,
  DiagramFieldData,
  ExportFormat,
  RelationType,
} from "./Diagram.types";

/**
 * Serialize a diagram schema to PlantUML-style ERD text.
 *
 * Example output:
 * ```
 * [Users]
 *   id int PK
 *   email varchar
 *
 * [Posts]
 *   id int PK
 *   user_id int FK
 *
 * Users 1--* Posts
 * ```
 */
export function serializeToERD(schema: DiagramSchema): string {
  const lines: string[] = [];

  for (const entity of schema.entities) {
    lines.push(`[${entity.name}]`);
    if (entity.fields) {
      for (const field of entity.fields) {
        const parts = [`  ${field.name}`];
        if (field.type) parts.push(field.type);
        if (field.primary) parts.push("PK");
        if (field.foreign) parts.push("FK");
        if (field.nullable) parts.push("?");
        lines.push(parts.join(" "));
      }
    }
    lines.push("");
  }

  for (const rel of schema.relations) {
    const fromEntity = schema.entities.find((e) => e.id === rel.from);
    const toEntity = schema.entities.find((e) => e.id === rel.to);
    if (!fromEntity || !toEntity) continue;

    const marker = getERDMarker(rel.type);
    const parts = [fromEntity.name, marker, toEntity.name];
    if (rel.label) parts.push(`: ${rel.label}`);
    lines.push(parts.join(" "));
  }

  return lines.join("\n").trim();
}

function getERDMarker(type: RelationType): string {
  switch (type) {
    case "one-to-one":
      return "1--1";
    case "one-to-many":
      return "1--*";
    case "many-to-many":
      return "*--*";
  }
}

/**
 * Serialize a diagram schema to PlantUML class diagram text.
 */
export function serializeToUML(schema: DiagramSchema): string {
  const lines: string[] = ["@startuml"];

  for (const entity of schema.entities) {
    lines.push(`class ${entity.name} {`);
    if (entity.fields) {
      for (const field of entity.fields) {
        const typeStr = field.type ?? "any";
        const nullable = field.nullable ? "?" : "";
        const stereotype = field.primary
          ? " <<PK>>"
          : field.foreign
            ? " <<FK>>"
            : "";
        lines.push(`  ${field.name} : ${typeStr}${nullable}${stereotype}`);
      }
    }
    lines.push("}");
    lines.push("");
  }

  for (const rel of schema.relations) {
    const fromEntity = schema.entities.find((e) => e.id === rel.from);
    const toEntity = schema.entities.find((e) => e.id === rel.to);
    if (!fromEntity || !toEntity) continue;

    const arrow = getUMLArrow(rel.type);
    const label = rel.label ? ` : ${rel.label}` : "";
    lines.push(`${fromEntity.name} ${arrow} ${toEntity.name}${label}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

function getUMLArrow(type: RelationType): string {
  switch (type) {
    case "one-to-one":
      return '"1" -- "1"';
    case "one-to-many":
      return '"1" -- "*"';
    case "many-to-many":
      return '"*" -- "*"';
  }
}

/**
 * Serialize a diagram schema to a simple DFD text format.
 */
export function serializeToDFD(schema: DiagramSchema): string {
  const lines: string[] = [];

  for (const entity of schema.entities) {
    lines.push(`entity ${entity.name}`);
  }

  lines.push("");

  for (const rel of schema.relations) {
    const fromEntity = schema.entities.find((e) => e.id === rel.from);
    const toEntity = schema.entities.find((e) => e.id === rel.to);
    if (!fromEntity || !toEntity) continue;

    const label = rel.label ? ` "${rel.label}"` : "";
    lines.push(`${fromEntity.name} -> ${toEntity.name}${label}`);
  }

  return lines.join("\n").trim();
}

/**
 * Parse a serialized schema string back into a DiagramSchema.
 */
export function deserializeSchema(
  input: string,
  format: ExportFormat,
): DiagramSchema {
  switch (format) {
    case "erd":
      return deserializeERD(input);
    case "uml":
      return deserializeUML(input);
    case "dfd":
      return deserializeDFD(input);
  }
}

function deserializeERD(input: string): DiagramSchema {
  const entities: DiagramEntityData[] = [];
  const relations: DiagramRelationData[] = [];
  const lines = input.split("\n");

  let currentEntity: DiagramEntityData | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Entity header: [EntityName]
    const entityMatch = line.match(/^\[(.+)\]$/);
    if (entityMatch) {
      currentEntity = {
        id: entityMatch[1].toLowerCase().replace(/\s+/g, "_"),
        name: entityMatch[1],
        fields: [],
      };
      entities.push(currentEntity);
      continue;
    }

    // Field line (indented): name type PK FK ?
    if (currentEntity && rawLine.startsWith("  ") && line.length > 0) {
      const parts = line.split(/\s+/);
      const field: DiagramFieldData = { name: parts[0] };
      if (parts.length > 1 && !["PK", "FK", "?"].includes(parts[1])) {
        field.type = parts[1];
      }
      if (parts.includes("PK")) field.primary = true;
      if (parts.includes("FK")) field.foreign = true;
      if (parts.includes("?")) field.nullable = true;
      currentEntity.fields!.push(field);
      continue;
    }

    // Relation: EntityA 1--* EntityB : label
    const relMatch = line.match(
      /^(\S+)\s+(1--1|1--\*|\*--\*)\s+(\S+)(?:\s*:\s*(.+))?$/,
    );
    if (relMatch) {
      currentEntity = null;
      const fromName = relMatch[1];
      const marker = relMatch[2];
      const toName = relMatch[3];
      const label = relMatch[4];

      const fromEntity = entities.find((e) => e.name === fromName);
      const toEntity = entities.find((e) => e.name === toName);
      if (fromEntity && toEntity) {
        relations.push({
          id: `${fromEntity.id ?? fromEntity.name}_${toEntity.id ?? toEntity.name}`,
          from: fromEntity.id ?? fromEntity.name,
          to: toEntity.id ?? toEntity.name,
          type: parseERDMarker(marker),
          label,
        });
      }
      continue;
    }

    // Empty line resets current entity context
    if (line === "") {
      currentEntity = null;
    }
  }

  return { entities, relations };
}

function parseERDMarker(marker: string): RelationType {
  switch (marker) {
    case "1--1":
      return "one-to-one";
    case "1--*":
      return "one-to-many";
    case "*--*":
      return "many-to-many";
    default:
      return "one-to-many";
  }
}

function deserializeUML(input: string): DiagramSchema {
  const entities: DiagramEntityData[] = [];
  const relations: DiagramRelationData[] = [];
  const lines = input.split("\n");

  let currentEntity: DiagramEntityData | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "@startuml" || line === "@enduml" || line === "") continue;

    // Class header: class EntityName {
    const classMatch = line.match(/^class\s+(\S+)\s*\{$/);
    if (classMatch) {
      currentEntity = {
        id: classMatch[1].toLowerCase().replace(/\s+/g, "_"),
        name: classMatch[1],
        fields: [],
      };
      entities.push(currentEntity);
      continue;
    }

    // Closing brace
    if (line === "}") {
      currentEntity = null;
      continue;
    }

    // Field: name : type<<stereotype>>
    if (currentEntity) {
      const fieldMatch = line.match(
        /^(\S+)\s*:\s*(\S+?)(\?)?(?:\s*<<(PK|FK)>>)?$/,
      );
      if (fieldMatch) {
        const field: DiagramFieldData = {
          name: fieldMatch[1],
          type: fieldMatch[2],
        };
        if (fieldMatch[3]) field.nullable = true;
        if (fieldMatch[4] === "PK") field.primary = true;
        if (fieldMatch[4] === "FK") field.foreign = true;
        currentEntity.fields!.push(field);
      }
      continue;
    }

    // Relation: EntityA "1" -- "*" EntityB : label
    const relMatch = line.match(
      /^(\S+)\s+"([1*])"\s+--\s+"([1*])"\s+(\S+)(?:\s*:\s*(.+))?$/,
    );
    if (relMatch) {
      const fromName = relMatch[1];
      const fromCard = relMatch[2];
      const toCard = relMatch[3];
      const toName = relMatch[4];
      const label = relMatch[5];

      const fromEntity = entities.find((e) => e.name === fromName);
      const toEntity = entities.find((e) => e.name === toName);
      if (fromEntity && toEntity) {
        const type: RelationType =
          fromCard === "1" && toCard === "1"
            ? "one-to-one"
            : fromCard === "1" && toCard === "*"
              ? "one-to-many"
              : "many-to-many";
        relations.push({
          id: `${fromEntity.id ?? fromEntity.name}_${toEntity.id ?? toEntity.name}`,
          from: fromEntity.id ?? fromEntity.name,
          to: toEntity.id ?? toEntity.name,
          type,
          label,
        });
      }
    }
  }

  return { entities, relations };
}

function deserializeDFD(input: string): DiagramSchema {
  const entities: DiagramEntityData[] = [];
  const relations: DiagramRelationData[] = [];
  const lines = input.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    // Entity: entity EntityName
    const entityMatch = line.match(/^entity\s+(\S+)$/);
    if (entityMatch) {
      entities.push({
        id: entityMatch[1].toLowerCase().replace(/\s+/g, "_"),
        name: entityMatch[1],
        fields: [],
      });
      continue;
    }

    // Flow: EntityA -> EntityB "label"
    const flowMatch = line.match(
      /^(\S+)\s+->\s+(\S+)(?:\s+"(.+)")?$/,
    );
    if (flowMatch) {
      const fromName = flowMatch[1];
      const toName = flowMatch[2];
      const label = flowMatch[3];

      const fromEntity = entities.find((e) => e.name === fromName);
      const toEntity = entities.find((e) => e.name === toName);
      if (fromEntity && toEntity) {
        relations.push({
          id: `${fromEntity.id ?? fromEntity.name}_${toEntity.id ?? toEntity.name}`,
          from: fromEntity.id ?? fromEntity.name,
          to: toEntity.id ?? toEntity.name,
          type: "one-to-many",
          label,
        });
      }
    }
  }

  return { entities, relations };
}

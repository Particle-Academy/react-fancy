import { useRef, useCallback, type ChangeEvent } from "react";
import { cn } from "../../utils/cn";
import { useDiagram } from "./Diagram.context";
import type { DiagramToolbarProps, ExportFormat } from "./Diagram.types";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  erd: "ERD",
  uml: "UML",
  dfd: "DFD",
};

const FORMAT_EXTENSIONS: Record<ExportFormat, string> = {
  erd: "erd",
  uml: "puml",
  dfd: "dfd",
};

export function DiagramToolbar({ className }: DiagramToolbarProps) {
  const { schema, downloadableRef, importableRef, exportFormats, onImport } =
    useDiagram();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Freeze capabilities on mount — read refs once
  const canDownload = downloadableRef.current;
  const canImport = importableRef.current;

  const handleDownload = useCallback(
    async (format: ExportFormat) => {
      // Dynamic import to avoid loading serializers unless needed
      const { serializeToERD, serializeToUML, serializeToDFD } = await import(
        "./diagram.serializers"
      );

      let content: string;
      switch (format) {
        case "erd":
          content = serializeToERD(schema);
          break;
        case "uml":
          content = serializeToUML(schema);
          break;
        case "dfd":
          content = serializeToDFD(schema);
          break;
      }

      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `diagram.${FORMAT_EXTENSIONS[format]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [schema],
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImport) return;

      const text = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();

      // Dynamic import serializers
      const { deserializeSchema } = await import("./diagram.serializers");

      let format: ExportFormat = "erd";
      if (ext === "puml" || ext === "uml") format = "uml";
      else if (ext === "dfd") format = "dfd";

      const parsed = deserializeSchema(text, format);
      onImport(parsed);

      // Reset file input so the same file can be re-imported
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onImport],
  );

  if (!canDownload && !canImport) return null;

  return (
    <div
      data-react-fancy-diagram-toolbar=""
      className={cn(
        "absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/90",
        className,
      )}
    >
      {canDownload &&
        exportFormats.map((format) => (
          <button
            key={format}
            type="button"
            onClick={() => handleDownload(format)}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            {FORMAT_LABELS[format]}
          </button>
        ))}

      {canImport && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".erd,.puml,.uml,.dfd,.txt"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}

DiagramToolbar.displayName = "DiagramToolbar";

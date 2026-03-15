import { useEffect, useMemo } from "react";
import { File, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileUpload } from "./FileUpload.context";
import type { FileUploadListProps } from "./FileUpload.types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "";
}

function ThumbnailItem({ file, index, onRemove }: { file: File; index: number; onRemove: (i: number) => void }) {
  const isImage = file.type.startsWith("image/");
  const objectUrl = useMemo(() => (isImage ? URL.createObjectURL(file) : null), [file, isImage]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <div className="group relative flex w-20 flex-col items-center gap-1">
      <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
        {isImage && objectUrl ? (
          <img src={objectUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1">
            <File size={20} className="text-zinc-400" />
            <span className="text-[10px] font-medium text-zinc-500">{getExtension(file.name)}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
          aria-label={`Remove ${file.name}`}
        >
          <X size={10} />
        </button>
      </div>
      <span className="w-full truncate text-center text-xs text-zinc-500">{file.name}</span>
    </div>
  );
}

export function FileUploadList({ thumbnail, className }: FileUploadListProps) {
  const { files, removeFile } = useFileUpload();

  if (files.length === 0) return null;

  if (thumbnail) {
    return (
      <div data-react-fancy-file-upload-list="" className={cn("mt-3 flex flex-wrap gap-3", className)}>
        {files.map((file, i) => (
          <ThumbnailItem key={`${file.name}-${i}`} file={file} index={i} onRemove={removeFile} />
        ))}
      </div>
    );
  }

  return (
    <ul data-react-fancy-file-upload-list="" className={cn("mt-3 space-y-2", className)}>
      {files.map((file, i) => (
        <li
          key={`${file.name}-${i}`}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
        >
          <File size={16} className="shrink-0 text-zinc-400" />
          <span className="flex-1 truncate">{file.name}</span>
          <span className="shrink-0 text-xs text-zinc-400">
            {formatSize(file.size)}
          </span>
          <button
            type="button"
            onClick={() => removeFile(i)}
            className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label={`Remove ${file.name}`}
          >
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}

FileUploadList.displayName = "FileUploadList";

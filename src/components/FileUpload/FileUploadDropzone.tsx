import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "../../utils/cn";
import { useFileUpload } from "./FileUpload.context";
import type { FileUploadDropzoneProps } from "./FileUpload.types";

export function FileUploadDropzone({
  children,
  className,
}: FileUploadDropzoneProps) {
  const { addFiles, disabled } = useFileUpload();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      addFiles(e.dataTransfer.files);
    },
    [addFiles, disabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  return (
    <div
      data-react-fancy-file-upload-dropzone=""
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        dragOver
          ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-950"
          : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
        multiple
        disabled={disabled}
      />
      {children ?? (
        <>
          <Upload size={32} strokeWidth={1.5} className="mb-2 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            Drop files here or click to browse
          </p>
        </>
      )}
    </div>
  );
}

FileUploadDropzone.displayName = "FileUploadDropzone";

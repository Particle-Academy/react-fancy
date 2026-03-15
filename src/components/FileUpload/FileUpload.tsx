import { useCallback, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { FileUploadContext } from "./FileUpload.context";
import { FileUploadDropzone } from "./FileUploadDropzone";
import { FileUploadList } from "./FileUploadList";
import type { FileUploadProps } from "./FileUpload.types";

function FileUploadRoot({
  children,
  value,
  onChange,
  maxFiles,
  maxSize,
  disabled = false,
  className,
}: FileUploadProps) {
  const [internalFiles, setInternalFiles] = useState<File[]>([]);
  const files = value ?? internalFiles;

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      let toAdd = Array.from(newFiles);

      if (maxSize) {
        toAdd = toAdd.filter((f) => f.size <= maxSize);
      }

      const updated = [...files, ...toAdd];
      const limited = maxFiles ? updated.slice(0, maxFiles) : updated;

      if (value === undefined) setInternalFiles(limited);
      onChange?.(limited);
    },
    [files, maxFiles, maxSize, onChange, value],
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      if (value === undefined) setInternalFiles(updated);
      onChange?.(updated);
    },
    [files, onChange, value],
  );

  const ctx = useMemo(
    () => ({ files, addFiles, removeFile, disabled }),
    [files, addFiles, removeFile, disabled],
  );

  return (
    <FileUploadContext.Provider value={ctx}>
      <div data-react-fancy-file-upload="" className={cn(className)}>{children}</div>
    </FileUploadContext.Provider>
  );
}

export const FileUpload = Object.assign(FileUploadRoot, {
  Dropzone: FileUploadDropzone,
  List: FileUploadList,
});

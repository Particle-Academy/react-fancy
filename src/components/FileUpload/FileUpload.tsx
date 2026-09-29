import { useCallback, useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { FileUploadContext } from "./FileUpload.context";
import { FileUploadDropzone } from "./FileUploadDropzone";
import { FileUploadList } from "./FileUploadList";
import { matchesAccept } from "./matchesAccept";
import type { FileUploadProps } from "./FileUpload.types";

function FileUploadRoot({
  children,
  value,
  onChange,
  accept,
  multiple = true,
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

      // `accept` is enforced HERE, not only on the input: the input's attribute
      // governs the picker, and a drop never opens one.
      if (accept) {
        toAdd = toAdd.filter((f) => matchesAccept(f, accept));
      }

      if (maxSize) {
        toAdd = toAdd.filter((f) => f.size <= maxSize);
      }

      // `multiple={false}` is a cap of one, applied the same way `maxFiles` is —
      // first-wins rather than replace-last, so the two props cannot disagree
      // about what a single-file upload means.
      const cap = multiple === false ? 1 : maxFiles;

      const updated = [...files, ...toAdd];
      const limited = cap ? updated.slice(0, cap) : updated;

      if (value === undefined) setInternalFiles(limited);
      onChange?.(limited);
    },
    [accept, files, maxFiles, maxSize, multiple, onChange, value],
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
    () => ({ files, addFiles, removeFile, disabled, accept, multiple }),
    [files, addFiles, removeFile, disabled, accept, multiple],
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

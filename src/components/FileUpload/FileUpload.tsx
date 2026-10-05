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

      /*
       * `multiple={false}` REPLACES; `maxFiles` refuses the overflow.
       *
       * These used to be the same rule — a cap of one, first-wins — on the
       * reasoning that the two props must not disagree about what a single-file
       * upload means. But they are different statements:
       *
       *   - `maxFiles={n}` is a QUOTA. Dropping five files into a three-file
       *     field should keep three, not the last three.
       *   - `multiple={false}` is a FIELD SHAPE: this input holds one file. Its
       *     analogue is a radio group, where choosing again MOVES the selection.
       *
       * Under the old rule a single-file field could never change its mind: the
       * second choice computed `[old, new].slice(0, 1)` and discarded the new
       * file in silence. The YouGene estate worked around it by remounting the
       * component with a `key`, which is the shape of a bug rather than a
       * preference.
       */
      if (multiple === false) {
        /*
         * The FIRST of the incoming batch, not the last.
         *
         * Two separate questions hide here, and only one of them was the bug:
         *
         *   - ACROSS gestures — choose a file, then choose another. The second
         *     must win, or the field cannot change its mind. That is the fix.
         *   - WITHIN one gesture — drop two files at once onto a single-file
         *     field. Which one wins is arbitrary, and taking the first is what
         *     has always shipped; there is no replacement intent in a single
         *     ambiguous drop.
         *
         * Taking `slice(-1)` would have answered both with "the last", quietly
         * changing the second. The existing drop test caught it.
         */
        const replacement = toAdd.slice(0, 1);
        // Nothing survived the accept/size filters — leave the field alone
        // rather than clearing a file the user never asked to remove.
        const next = replacement.length > 0 ? replacement : files;

        if (value === undefined) setInternalFiles(next);
        onChange?.(next);

        return;
      }

      const updated = [...files, ...toAdd];
      const limited = maxFiles ? updated.slice(0, maxFiles) : updated;

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

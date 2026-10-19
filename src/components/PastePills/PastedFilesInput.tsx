import { useEffect, useRef } from "react";

export interface PastedFilesInputProps {
  /** The form field name the files are submitted under. */
  name: string;
  /** The files to submit, in the order the message holds them. */
  files: readonly File[];
  /** Associate with a `<form id>` elsewhere in the document, as `<input form>` does. */
  form?: string;
}

/**
 * A hidden `<input type="file">` carrying the files pasted into a field, so a
 * plain `<form>` submits them with everything else.
 *
 * A pasted file is not in any form field: the clipboard hands it to the paste
 * handler and nowhere else. Held as a pill, it is attached as far as the person can
 * see, and a native submit would then post the text without it. A file input is
 * the one element a form posts files from, and its `files` can be set from a
 * `DataTransfer`, so the pills keep it in step: delete a pill and its file leaves
 * the input too.
 *
 * Hidden rather than visually hidden: `hidden` keeps it out of the tab order and
 * the accessibility tree, where the pills already represent it, and does not stop
 * a form submitting it.
 */
export function PastedFilesInput({ name, files, form }: PastedFilesInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    // No DataTransfer (a server render, an old engine): nothing can be set, and
    // the host still has the files from its own state.
    if (!el || typeof DataTransfer === "undefined") return;

    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    el.files = transfer.files;
  }, [files]);

  return (
    <input
      ref={ref}
      type="file"
      name={name}
      form={form}
      multiple
      hidden
      tabIndex={-1}
      data-react-fancy-pasted-files={name}
    />
  );
}

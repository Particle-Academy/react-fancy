import type { ReactNode } from "react";

export interface FileUploadContextValue {
  files: File[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (index: number) => void;
  disabled: boolean;
  /** Mirrored onto the hidden input so the browse dialog filters too. */
  accept?: string;
  multiple: boolean;
}

/** Stable code for why a file was refused. */
export type FileRejectionReason = "accept" | "maxSize" | "maxFiles";

/** A refused file, as plain JSON so it can go to a log, a toast or an agent. */
export interface FileRejection {
  name: string;
  size: number;
  type: string;
  reason: FileRejectionReason;
}

export interface FileUploadProps {
  children: ReactNode;
  value?: File[];
  onChange?: (files: File[]) => void;
  /**
   * Files this gesture refused, one entry per file under the first rule it
   * failed. Not called when nothing was refused. Fires after `onChange`, for
   * the picker, a drop, and `useFileUpload().addFiles` alike.
   */
  onReject?: (rejections: FileRejection[]) => void;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

export interface FileUploadDropzoneProps {
  children?: ReactNode;
  className?: string;
  /**
   * Accessible name of the zone's browse button. Defaults to the visible copy
   * ("Drop files here or click to browse") on the default zone, and to
   * "Browse files" when the zone has custom children.
   */
  browseLabel?: string;
}

export interface FileUploadListProps {
  thumbnail?: boolean;
  className?: string;
}

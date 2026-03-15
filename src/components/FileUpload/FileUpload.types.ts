import type { ReactNode } from "react";

export interface FileUploadContextValue {
  files: File[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (index: number) => void;
  disabled: boolean;
}

export interface FileUploadProps {
  children: ReactNode;
  value?: File[];
  onChange?: (files: File[]) => void;
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
}

export interface FileUploadListProps {
  thumbnail?: boolean;
  className?: string;
}

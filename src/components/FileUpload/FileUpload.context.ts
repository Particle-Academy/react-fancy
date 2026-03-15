import { createContext, useContext } from "react";
import type { FileUploadContextValue } from "./FileUpload.types";

export const FileUploadContext =
  createContext<FileUploadContextValue | null>(null);

export function useFileUpload(): FileUploadContextValue {
  const ctx = useContext(FileUploadContext);
  if (!ctx) {
    throw new Error(
      "FileUpload compound components must be used within <FileUpload>",
    );
  }
  return ctx;
}

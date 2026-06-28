import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { PdfViewerProps } from "./PdfViewer.types";

/**
 * A standalone PDF viewer — embeds the document via the browser's native PDF
 * plugin (`<object>`), falling back to an `<iframe>`, then to a download link.
 * Fills its container, so give it a height (a `min-h` floor is built in).
 * Renders for PDF sources inside `<MediaViewer>`.
 *
 * ```tsx
 * <PdfViewer src="/report.pdf" title="report.pdf" style={{ height: 600 }} />
 * ```
 */
export const PdfViewer = forwardRef<HTMLDivElement, PdfViewerProps>(
  ({ src, title = "PDF document", className, style }, ref) => {
    return (
      <div
        ref={ref}
        data-react-fancy-pdf-viewer=""
        className={cn(
          "relative h-full min-h-[20rem] w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900",
          className,
        )}
        style={style}
      >
        <object data={src} type="application/pdf" className="h-full w-full">
          <iframe
            src={src}
            title={title}
            className="h-full w-full border-0"
          />
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <span>This browser can&apos;t display the PDF inline.</span>
            <a
              href={src}
              download
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Download PDF
            </a>
          </div>
        </object>
      </div>
    );
  },
);

PdfViewer.displayName = "PdfViewer";

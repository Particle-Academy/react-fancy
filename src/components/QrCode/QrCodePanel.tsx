import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import { QrCode } from "./QrCode";
import { qrCodePng, qrCodeSvg, safeFileName, type QrCodeFileOptions } from "./qr-export";
import type {
  QrCodeAction,
  QrCodeActionEvent,
  QrCodePanelLabels,
  QrCodePanelProps,
} from "./QrCodePanel.types";

const DEFAULT_ACTIONS: readonly QrCodeAction[] = ["download-svg", "download-png", "share", "print"];

const DEFAULT_LABELS: QrCodePanelLabels = {
  downloadSvg: "Download SVG",
  downloadPng: "Download PNG",
  share: "Share",
  copyLink: "Copy link",
  copy: "Copy",
  print: "Print",
  downloaded: "Downloaded",
  shared: "Shared",
  copied: "Copied",
  printing: "Opened the print dialog",
  failed: "That did not work",
};

const ICONS: Record<QrCodeAction, string> = {
  "download-svg": "download",
  "download-png": "download",
  share: "share-2",
  print: "printer",
};

/** `http:` or `https:`. Parsed by the platform, not matched by a pattern. */
function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError";
}

/** Hand a blob to the browser as a download. */
function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
  // Revoked on the next task, not synchronously: some browsers start reading
  // the URL after `click()` returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const PRINT_FRAME = "data-react-fancy-qr-code-print";

/**
 * A QR code with what a person does with one: download it as SVG or PNG,
 * share it (the Web Share sheet, or a copy where there is none), print it, and
 * read the value as text.
 *
 * ## Why a panel, and not props on `<QrCode>`
 *
 * `<QrCode>` is an `<svg>`: it drops into a label template, a PDF, a canvas or
 * a badge and draws a code, nothing else. Buttons, a live region and a print
 * frame inside an `<svg>` would be invalid markup, and making it a `<div>`
 * would break every caller that styles or measures it as an image. So the
 * actions compose AROUND it, the way `Card` composes its sections, and the
 * file formats are separate functions (`qrCodeSvg`, `qrCodePng`) that a host
 * or an agent can call without rendering anything.
 *
 * ## The code tile is light in dark mode too
 *
 * The panel draws black modules on a white tile, quiet zone included, in both
 * colour schemes. A QR code is read by contrast between dark modules and a
 * LIGHT surround; most scanners do not read an inverted code, and the quiet
 * zone must be the light colour for the finder patterns to be found. A dark
 * page around a white tile is fine. Black on white is 21:1, past WCAG AAA.
 *
 * ## Accessibility
 *
 * - The group is named by `label`, and so is the code inside it (`role="img"`).
 * - `showValue` puts the value on screen as selectable text, because a code is
 *   unusable to anyone who cannot point a second device at the screen.
 * - Every action is a react-fancy `Button` with a visible text label, in the
 *   tab order, operable by Enter and Space, with the kit's `focus-visible`
 *   ring. Default size `lg` is 44px tall, WCAG 2.5.5's AAA target size.
 * - What each action did is announced through a polite `role="status"`.
 *
 * @example
 * ```tsx
 * <QrCodePanel
 *   value="https://example.com/r/AbC123"
 *   label="Your sign-up link"
 *   showValue
 *   fileName="sign-up-link"
 *   onAction={(event) => console.log(event)}
 * />
 * ```
 */
export const QrCodePanel = forwardRef<HTMLDivElement, QrCodePanelProps>(
  (
    {
      value,
      label,
      size = 192,
      errorCorrection = "M",
      quietZone = 4,
      foreground = "#000000",
      background = "#ffffff",
      mode,
      version,
      actions = DEFAULT_ACTIONS,
      showValue = false,
      fileName = "qr-code",
      pngScale,
      shareTitle,
      printSizeMm = 50,
      labels: labelOverrides,
      onAction,
      buttonSize = "lg",
      className,
      ...props
    },
    ref,
  ) => {
    const labels = { ...DEFAULT_LABELS, ...labelOverrides };
    const [status, setStatus] = useState("");
    // Decided after mount, never during render: `navigator` does not exist on
    // the server, and reading it in render would make the server's markup and
    // the client's first render disagree.
    const [via, setVia] = useState<"share" | "clipboard">("clipboard");
    const frameRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
      setVia(typeof navigator !== "undefined" && typeof navigator.share === "function" ? "share" : "clipboard");
    }, []);

    useEffect(
      () => () => {
        frameRef.current?.remove();
        frameRef.current = null;
      },
      [],
    );

    const file: QrCodeFileOptions = { label, errorCorrection, mode, version, quietZone, foreground, background };
    const base = safeFileName(fileName, "qr-code");
    const link = isWebUrl(value);

    const report = useCallback(
      (event: QrCodeActionEvent, announcement: string) => {
        setStatus(announcement);
        onAction?.(event);
      },
      [onAction],
    );

    const downloadSvg = () => {
      const name = `${base}.svg`;
      try {
        saveBlob(new Blob([qrCodeSvg(value, file)], { type: "image/svg+xml" }), name);
        report({ action: "download-svg", outcome: "done", fileName: name }, labels.downloaded);
      } catch (error) {
        report({ action: "download-svg", outcome: "failed", error: message(error) }, labels.failed);
      }
    };

    const downloadPng = async () => {
      const name = `${base}.png`;
      try {
        const blob = await qrCodePng(value, { ...file, scale: pngScale });
        saveBlob(blob, name);
        report({ action: "download-png", outcome: "done", fileName: name }, labels.downloaded);
      } catch (error) {
        report({ action: "download-png", outcome: "failed", error: message(error) }, labels.failed);
      }
    };

    const copy = async () => {
      try {
        const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
        if (!clipboard || typeof clipboard.writeText !== "function") {
          throw new Error("The Clipboard API is unavailable");
        }
        await clipboard.writeText(value);
        report({ action: "share", outcome: "done", via: "clipboard" }, labels.copied);
      } catch (error) {
        report({ action: "share", outcome: "failed", via: "clipboard", error: message(error) }, labels.failed);
      }
    };

    const share = async () => {
      const title = shareTitle ?? label;
      const data: ShareData = link ? { title, url: value } : { title, text: value };
      const canShare =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (typeof navigator.canShare !== "function" || navigator.canShare(data));
      if (!canShare) {
        await copy();
        return;
      }
      try {
        await navigator.share(data);
        report({ action: "share", outcome: "done", via: "share" }, labels.shared);
      } catch (error) {
        if (isAbort(error)) {
          report({ action: "share", outcome: "cancelled", via: "share" }, "");
          return;
        }
        // Refused for another reason (no user activation, a permissions
        // policy): the person still asked to pass the value on, so copy it.
        await copy();
      }
    };

    const print = () => {
      frameRef.current?.remove();
      document.querySelectorAll(`iframe[${PRINT_FRAME}]`).forEach((stale) => stale.remove());

      const frame = document.createElement("iframe");
      frame.setAttribute(PRINT_FRAME, "");
      frame.setAttribute("aria-hidden", "true");
      frame.tabIndex = -1;
      // CSSOM, not a style attribute: a Content Security Policy without
      // 'unsafe-inline' blocks the attribute and allows this.
      Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
      document.body.appendChild(frame);
      frameRef.current = frame;

      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc || !win) {
        report({ action: "print", outcome: "failed", error: "The print frame has no document" }, labels.failed);
        return;
      }

      // Nothing but the code, and the value when it is shown on screen. Built
      // with DOM calls rather than written as HTML, so neither the label nor
      // the value is ever parsed as markup.
      doc.title = label;
      Object.assign(doc.body.style, {
        margin: "0",
        padding: "15mm 10mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6mm",
        color: "#000000",
        background: "#ffffff",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      });
      const parsed = new DOMParser().parseFromString(qrCodeSvg(value, file), "image/svg+xml");
      const svg = doc.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
      const millimetres = Number.isFinite(printSizeMm) && printSizeMm > 0 ? printSizeMm : 50;
      svg.setAttribute("width", `${millimetres}mm`);
      svg.setAttribute("height", `${millimetres}mm`);
      doc.body.appendChild(svg);
      if (showValue) {
        const text = doc.createElement("p");
        text.textContent = value;
        Object.assign(text.style, {
          margin: "0",
          maxWidth: `${Math.max(millimetres, 80)}mm`,
          fontSize: "12pt",
          textAlign: "center",
          overflowWrap: "anywhere",
        });
        doc.body.appendChild(text);
      }

      win.addEventListener("afterprint", () => {
        if (frameRef.current === frame) {
          frameRef.current = null;
        }
        frame.remove();
      });

      // On the next task, so the frame has laid out before the dialog opens.
      setTimeout(() => {
        try {
          win.print();
          report({ action: "print", outcome: "done" }, labels.printing);
        } catch (error) {
          report({ action: "print", outcome: "failed", error: message(error) }, labels.failed);
        }
      }, 0);
    };

    const run: Record<QrCodeAction, () => void> = {
      "download-svg": downloadSvg,
      "download-png": () => void downloadPng(),
      share: () => void share(),
      print,
    };

    const text: Record<QrCodeAction, string> = {
      "download-svg": labels.downloadSvg,
      "download-png": labels.downloadPng,
      share: via === "share" ? labels.share : link ? labels.copyLink : labels.copy,
      print: labels.print,
    };

    return (
      <div
        ref={ref}
        role="group"
        aria-label={label}
        data-react-fancy-qr-code-panel=""
        className={cn("inline-flex max-w-full flex-col items-center gap-3", className)}
        {...props}
      >
        <div data-react-fancy-qr-code-panel-code="" className="leading-none">
          <QrCode
            value={value}
            label={label}
            size={size}
            errorCorrection={errorCorrection}
            quietZone={quietZone}
            foreground={foreground}
            background={background}
            mode={mode}
            version={version}
          />
        </div>
        {showValue && (
          <p
            data-react-fancy-qr-code-panel-value=""
            className="m-0 max-w-full select-all break-all text-center font-mono text-sm text-zinc-900 dark:text-zinc-100"
          >
            {value}
          </p>
        )}
        {actions.length > 0 && (
          <div data-react-fancy-qr-code-panel-actions="" className="flex flex-wrap justify-center gap-2">
            {actions.map((action) => (
              <Button
                key={action}
                size={buttonSize}
                icon={action === "share" && via === "clipboard" ? "copy" : ICONS[action]}
                data-react-fancy-qr-code-action={action}
                data-via={action === "share" ? via : undefined}
                onClick={run[action]}
              >
                {text[action]}
              </Button>
            ))}
          </div>
        )}
        <span
          role="status"
          aria-live="polite"
          data-react-fancy-qr-code-panel-status=""
          className="sr-only"
        >
          {status}
        </span>
      </div>
    );
  },
);

QrCodePanel.displayName = "QrCodePanel";

import type { HTMLAttributes } from "react";

import type { Size } from "../../utils/types";
import type { QrErrorCorrection, QrMode } from "./qr-encode";

/** What a person can do with a code. Each renders one `Button`. */
export type QrCodeAction = "download-svg" | "download-png" | "share" | "print";

/**
 * How an action ended.
 *
 * - `done`: the file was handed to the browser, the share sheet completed, the
 *   value was copied, or the print dialog was opened.
 * - `cancelled`: the person dismissed the share sheet. Not an error.
 * - `failed`: nothing happened that the person asked for; `error` says why.
 */
export type QrCodeActionOutcome = "done" | "cancelled" | "failed";

/** One action, reported. Plain JSON, so it can go straight to an agent or a log. */
export interface QrCodeActionEvent {
  action: QrCodeAction;
  outcome: QrCodeActionOutcome;
  /** For `share`: whether the Web Share sheet or the clipboard carried it. */
  via?: "share" | "clipboard";
  /** For a download: the file name the browser was given. */
  fileName?: string;
  /** For `failed`: the reason, as text. */
  error?: string;
}

/** Visible button text and the announcements read out after each action. */
export interface QrCodePanelLabels {
  downloadSvg: string;
  downloadPng: string;
  share: string;
  /** The share button's text where Web Share is absent and a web link is copied. */
  copyLink: string;
  /** The same, for a value that is not a web link. */
  copy: string;
  print: string;
  downloaded: string;
  shared: string;
  copied: string;
  printing: string;
  failed: string;
}

export interface QrCodePanelProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  /** What the code carries. Any string; see `QrCode`'s `value`. */
  value: string;
  /**
   * What the code is FOR, e.g. "Your sign-up link". Required. Names the code,
   * the group around it, the SVG file's `<title>`, the print page's title,
   * and the share sheet's title unless `shareTitle` is set.
   */
  label: string;
  /** Rendered size of the code in pixels. Default 192. */
  size?: number;
  errorCorrection?: QrErrorCorrection;
  quietZone?: number;
  /**
   * Module colour. Default `#000000`, on screen as well as in files.
   *
   * The panel does NOT inherit text colour the way a bare `<QrCode>` does: a
   * code must be dark on light to scan, so the panel pins black on white in
   * dark mode too. Black on white is 21:1, past WCAG AAA's 7:1.
   */
  foreground?: string;
  /** Background, quiet zone included. Default `#ffffff`, in both colour schemes. */
  background?: string;
  mode?: QrMode;
  version?: number;
  /**
   * Which actions to offer, in order. Default all four:
   * `["download-svg", "download-png", "share", "print"]`. `[]` renders none.
   */
  actions?: readonly QrCodeAction[];
  /**
   * Show the value as selectable text under the code, and on the printed page.
   * Default `false`, because not every value is meant to be read out: a WiFi
   * block carries a password. Turn it on for a link or a reference a person
   * might type instead of scanning.
   */
  showValue?: boolean;
  /** Download file name, without extension. Sanitised. Default `"qr-code"`. */
  fileName?: string;
  /** PNG pixels per module, a whole number. Default 10. */
  pngScale?: number;
  /** Share sheet title. Default `label`. */
  shareTitle?: string;
  /** Printed width of the code in millimetres. Default 50. */
  printSizeMm?: number;
  /**
   * Size of the action buttons. Default `"lg"`, which is 44px tall: WCAG
   * 2.5.5's AAA target size. Smaller sizes still meet AA's 24px (2.5.8).
   */
  buttonSize?: Size;
  /** Button text and announcements, for translation. Partial; the rest default. */
  labels?: Partial<QrCodePanelLabels>;
  /** Called once per action, with how it ended. */
  onAction?: (event: QrCodeActionEvent) => void;
}

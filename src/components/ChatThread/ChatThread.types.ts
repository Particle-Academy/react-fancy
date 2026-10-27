import type { HTMLAttributes, ReactNode, Ref } from "react";
import type { ContentRendererProps } from "../ContentRenderer/ContentRenderer.types";

/**
 * Who a message is from. The named roles get default labels and styling; any
 * other string is carried verbatim (`data-chat-role`) and rendered neutrally.
 */
export type ChatRole =
  | "user"
  | "assistant"
  | "system"
  | "agent"
  | "staff"
  | "customer"
  | (string & {});

export type ChatMessageStatus = "pending" | "streaming" | "sent" | "failed";

/**
 * `internal` is a staff-only note. The component LABELS it; it never decides
 * who sees it. Pass only the messages the viewer is allowed to see.
 */
export type ChatMessageVisibility = "public" | "internal";

export interface ChatAuthor {
  name: string;
  /** Image URL for the avatar. Without it, initials are shown. */
  avatar?: string;
}

/** A file on a message. Rendered as a link, never auto-loaded inline. */
export interface ChatAttachment {
  id: string;
  name: string;
  /** Unsafe schemes (`javascript:`, `data:`, ...) render the name without a link. */
  url?: string;
  mimeType?: string;
  /** Bytes. */
  size?: number;
}

/**
 * An agent's suggested action awaiting a human: an approval card. The message
 * `content` is the draft (a reply, a field change, a page edit). The state is
 * the HOST's: the component shows decision buttons only while `pending`, and
 * never changes the state itself.
 */
export interface ChatProposal {
  /** Stable id, rendered as `data-chat-proposal`. Usually the card id. */
  id: string;
  title?: string;
  /** @default "pending" */
  state?: "pending" | "accepted" | "rejected" | "withdrawn";
  /** Overrides the thread's accept / reject labels for this card. */
  acceptLabel?: string;
  rejectLabel?: string;
}

/** One message. Plain JSON: an agent can emit it, a server can send it. */
export interface ChatMessageData {
  /** Stable id, rendered as `data-chat-message`. */
  id: string;
  role: ChatRole;
  author?: ChatAuthor;
  /** Markdown by default; see `format`. Always sanitised. */
  content: string;
  /** `"text"` renders the content literally (no markdown, no HTML). @default "markdown" */
  format?: "markdown" | "text";
  /** ISO 8601 string or epoch milliseconds. */
  createdAt: string | number;
  /** @default "sent" */
  status?: ChatMessageStatus;
  /** @default "public" */
  visibility?: ChatMessageVisibility;
  attachments?: ChatAttachment[];
  /** Makes this message an approval card. */
  proposal?: ChatProposal;
  /**
   * Align as the viewer's own message. Defaults to `ownRoles` containing
   * `role`.
   */
  own?: boolean;
  /** Anything the host wants carried along (card version, ticket ref, ...). Not rendered. */
  meta?: Record<string, unknown>;
}

/**
 * Every human interaction the thread hands to a callback, as one event stream
 * for presence, undo and coaching layers. Map it onto fancy-auto-common's
 * `AutoActivityEvent` (or anything else) in the host.
 */
export type ChatThreadActivity =
  | { type: "load-earlier" }
  | { type: "proposal-accept"; messageId: string; proposalId: string }
  | { type: "proposal-reject"; messageId: string; proposalId: string }
  | { type: "jump-to-latest"; unseen: number };

/** What `onActionError` is told about: the action whose Promise rejected. */
export type ChatThreadActionContext = Exclude<ChatThreadActivity, { type: "jump-to-latest" }>;

/** A callback that may be acknowledged: return a Promise to disable the control until it settles. */
export type ChatAction<A extends unknown[] = []> = (...args: A) => void | Promise<unknown>;

/** Every visible string, for translation. */
export interface ChatThreadLabels {
  /** The log's `aria-label` when there is no `heading`. */
  log: string;
  loadEarlier: string;
  loadingEarlier: string;
  /** The jump control's text. */
  newMessages: (count: number) => string;
  internal: string;
  pending: string;
  failed: string;
  proposal: string;
  accept: string;
  reject: string;
  accepted: string;
  rejected: string;
  withdrawn: string;
  attachments: string;
  /** Role names shown when a message has no `author`. */
  roles: Record<string, string>;
}

/** Content options passed to every message's `ContentRenderer`. `unsafe` is deliberately absent. */
export type ChatContentOptions = Pick<
  ContentRendererProps,
  "extensions" | "copyButtons" | "onCopy" | "clipboardWriter" | "lineSpacing"
>;

export interface ChatMessageClassNames {
  message?: string;
  bubble?: string;
  header?: string;
  actions?: string;
  proposal?: string;
}

/** Display options shared by `ChatThread` and a standalone `ChatMessage`. */
export interface ChatMessageDisplayProps {
  /** Roles aligned as the viewer's own. @default ["user"] */
  ownRoles?: string[];
  /**
   * How a message with `status: "streaming"` renders its unfinished tail
   * (`ContentRenderer`'s `streaming`). `true` holds back an open fence or tag;
   * `"progressive"` shows it as it fills. @default true
   */
  streaming?: true | "progressive";
  contentOptions?: ChatContentOptions;
  labels?: Partial<ChatThreadLabels>;
  /** Formats a message time. Default: locale time, hours and minutes. */
  formatTime?: (date: Date) => string;
  /** Replace how one attachment renders (it is still wrapped in `[data-chat-attachment]`). */
  renderAttachment?: (attachment: ChatAttachment, message: ChatMessageData) => ReactNode;
  onProposalAccept?: ChatAction<[message: ChatMessageData]>;
  onProposalReject?: ChatAction<[message: ChatMessageData]>;
  onActivity?: (event: ChatThreadActivity) => void;
  /**
   * Called when a Promise returned by `onLoadEarlier`, `onProposalAccept` or
   * `onProposalReject` rejects. Without it the rejection is left unhandled,
   * so it still reaches the console rather than vanishing.
   */
  onActionError?: (error: unknown, action: ChatThreadActionContext) => void;
  classNames?: ChatMessageClassNames;
}

export interface ChatMessageProps extends ChatMessageDisplayProps {
  message: ChatMessageData;
  /** The per-message actions slot (copy, edit, retry, ...). */
  actions?: ReactNode;
  /** A continuation of the previous message's group: the header is omitted. */
  grouped?: boolean;
  className?: string;
}

export interface ChatThreadClassNames extends ChatMessageClassNames {
  root?: string;
  heading?: string;
  log?: string;
  composer?: string;
  separator?: string;
  jump?: string;
}

/** Imperative handle, for a host or an agent bridge pointing at a message. */
export interface ChatThreadHandle {
  /** Scroll the log (only the log) to the newest message. */
  scrollToLatest(): void;
  /** Scroll the log (only the log) to a message. `false` if no such message is rendered. */
  scrollToMessage(id: string): boolean;
  /** The log element. */
  readonly element: HTMLDivElement | null;
}

export interface ChatThreadProps
  extends ChatMessageDisplayProps,
    Omit<HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  ref?: Ref<ChatThreadHandle>;
  /** The messages, oldest first. Controlled: the thread renders exactly these. */
  messages: ChatMessageData[];
  /** Visible title; the log is labelled by it. Without it the log gets `labels.log`. */
  heading?: ReactNode;
  /** @default 2 */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Shows a "Load earlier messages" control. Return a Promise to disable it until it settles. */
  onLoadEarlier?: ChatAction;
  /** Whether there is anything earlier to load. @default true when `onLoadEarlier` is set */
  hasEarlier?: boolean;
  /** Host-controlled loading state for the load-earlier control. */
  loadingEarlier?: boolean;
  /** Follow new messages while the reader is at the bottom. @default true */
  stickToBottom?: boolean;
  /** How close to the bottom (px) still counts as "at the bottom". @default 48 */
  bottomThreshold?: number;
  /** Called when the reader arrives at or leaves the bottom. */
  onAtBottomChange?: (atBottom: boolean) => void;
  /** `"day"` inserts a separator at each calendar-day change (local time). @default "none" */
  separators?: "none" | "day";
  /** Formats a day separator. Default: locale date, medium style. */
  formatDay?: (date: Date) => string;
  /**
   * Merge consecutive messages from the same author: `true` within 5 minutes,
   * or a window in milliseconds. Internal and public messages never merge.
   * @default false
   */
  groupConsecutive?: boolean | number;
  /** The per-message actions slot. Return `null` for none. */
  renderActions?: (message: ChatMessageData) => ReactNode;
  /** Rendered below the log: put a `Composer` or `PromptInput` here. */
  composer?: ReactNode;
  /** Shown in the log when there are no messages. */
  empty?: ReactNode;
  classNames?: ChatThreadClassNames;
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { sanitizeHref } from "../../utils/sanitize";
import { Avatar } from "../Avatar";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { ContentRenderer } from "../ContentRenderer";
import type {
  ChatAction,
  ChatAttachment,
  ChatMessageData,
  ChatMessageProps,
  ChatThreadActionContext,
  ChatThreadLabels,
} from "./ChatThread.types";
import {
  defaultFormatTime,
  formatBytes,
  initials,
  isOwn,
  mergeLabels,
  roleLabel,
  toDate,
} from "./chat-utils";

const BORDER =
  "border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]";
const SURFACE =
  "bg-[color:var(--fancy-surface,var(--color-white))] dark:bg-[color:var(--fancy-surface-dark,var(--color-zinc-900))]";
const SURFACE_MUTED =
  "bg-[color:var(--fancy-surface-muted,var(--color-zinc-100))] dark:bg-[color:var(--fancy-surface-muted-dark,var(--color-zinc-800))]";
const TEXT =
  "text-[color:var(--fancy-text,var(--color-zinc-900))] dark:text-[color:var(--fancy-text-dark,var(--color-zinc-100))]";
const TEXT_MUTED =
  "text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]";

/**
 * Run a host callback that may return a Promise. While it is pending the
 * control is busy and a second run is refused. A rejection goes to
 * `onActionError`, or is left unhandled so it still reaches the console.
 *
 * @internal shared by ChatMessage (proposal decisions) and ChatThread (load earlier)
 */
export function useAcknowledgedAction(
  onActionError?: (error: unknown, action: ChatThreadActionContext) => void,
): [busy: boolean, run: (fn: () => ReturnType<ChatAction>, ctx: ChatThreadActionContext) => void] {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const onErrorRef = useRef(onActionError);
  onErrorRef.current = onActionError;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback((fn: () => ReturnType<ChatAction>, ctx: ChatThreadActionContext) => {
    if (busyRef.current) return;
    const result = fn();
    if (!result || typeof (result as Promise<unknown>).then !== "function") return;

    busyRef.current = true;
    setBusy(true);
    const settle = () => {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    };
    void Promise.resolve(result).then(settle, (error: unknown) => {
      settle();
      const onError = onErrorRef.current;
      if (onError) onError(error, ctx);
      else throw error;
    });
  }, []);

  return [busy, run];
}

function AttachmentItem({
  attachment,
  message,
  renderAttachment,
}: {
  attachment: ChatAttachment;
  message: ChatMessageData;
  renderAttachment?: ChatMessageProps["renderAttachment"];
}) {
  let body: ReactNode;
  if (renderAttachment) {
    body = renderAttachment(attachment, message);
  } else {
    const href = sanitizeHref(attachment.url);
    const size = typeof attachment.size === "number" ? (
      <span className={cn("ml-1", TEXT_MUTED)}>({formatBytes(attachment.size)})</span>
    ) : null;
    body = href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all">
        {attachment.name}
        {size}
      </a>
    ) : (
      <span className="break-all">
        {attachment.name}
        {size}
      </span>
    );
  }

  return (
    <li data-chat-attachment={attachment.id} className="text-sm">
      {body}
    </li>
  );
}

function ProposalFooter({
  message,
  labels,
  busy,
  onAccept,
  onReject,
}: {
  message: ChatMessageData;
  labels: ChatThreadLabels;
  busy: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const proposal = message.proposal!;
  const state = proposal.state ?? "pending";

  if (state !== "pending") {
    const text = state === "accepted" ? labels.accepted : state === "rejected" ? labels.rejected : labels.withdrawn;
    const color = state === "accepted" ? "emerald" : state === "rejected" ? "red" : "zinc";
    return (
      <div className="mt-2">
        <Badge color={color} variant="soft" size="sm" data-chat-proposal-status={state}>
          {text}
        </Badge>
      </div>
    );
  }

  if (!onAccept && !onReject) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {onAccept && (
        <Button
          type="button"
          size="sm"
          color="emerald"
          disabled={busy}
          aria-busy={busy || undefined}
          data-chat-proposal-action="accept"
          onClick={onAccept}
        >
          {proposal.acceptLabel ?? labels.accept}
        </Button>
      )}
      {onReject && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          aria-busy={busy || undefined}
          data-chat-proposal-action="reject"
          onClick={onReject}
        >
          {proposal.rejectLabel ?? labels.reject}
        </Button>
      )}
    </div>
  );
}

/**
 * ChatMessage — one message of a `ChatThread`, usable on its own.
 *
 * Content is markdown through `ContentRenderer`, always sanitised (there is no
 * `unsafe` here on purpose: message bodies are text the host did not author).
 * `format: "text"` renders it literally. A message with a `proposal` is an
 * approval card: the host owns its state and decides it through
 * `onProposalAccept` / `onProposalReject`; the card never acts on its own.
 */
export function ChatMessage({
  message,
  actions,
  grouped = false,
  className,
  ownRoles = ["user"],
  streaming = true,
  contentOptions,
  labels: labelsProp,
  formatTime = defaultFormatTime,
  renderAttachment,
  onProposalAccept,
  onProposalReject,
  onActivity,
  onActionError,
  classNames,
}: ChatMessageProps) {
  const labels = mergeLabels(labelsProp);
  const [busy, run] = useAcknowledgedAction(onActionError);

  const status = message.status ?? "sent";
  const visibility = message.visibility ?? "public";
  const internal = visibility === "internal";
  const own = isOwn(message, ownRoles);
  const system = message.role === "system";
  const proposal = message.proposal;
  const date = toDate(message.createdAt);
  // Always a name: the author's, else the role's ("Assistant", or the host's own role capitalised).
  const name = message.author?.name || roleLabel(message.role, labels);

  const decide = (kind: "accept" | "reject") => {
    if (!proposal) return;
    const cb = kind === "accept" ? onProposalAccept : onProposalReject;
    if (!cb) return;
    const ctx: ChatThreadActionContext = {
      type: kind === "accept" ? "proposal-accept" : "proposal-reject",
      messageId: message.id,
      proposalId: proposal.id,
    };
    run(() => {
      onActivity?.(ctx);
      return cb(message);
    }, ctx);
  };

  const body =
    message.format === "text" ? (
      <div data-chat-content="" className="whitespace-pre-wrap break-words">
        {message.content}
      </div>
    ) : (
      <div data-chat-content="" className="min-w-0 break-words">
        <ContentRenderer
          {...contentOptions}
          value={message.content}
          format="markdown"
          streaming={status === "streaming" ? streaming : false}
        />
      </div>
    );

  const attachments =
    message.attachments && message.attachments.length > 0 ? (
      <ul data-chat-attachments="" aria-label={labels.attachments} className="mt-2 flex flex-col gap-1">
        {message.attachments.map((a) => (
          <AttachmentItem key={a.id} attachment={a} message={message} renderAttachment={renderAttachment} />
        ))}
      </ul>
    ) : null;

  const statusText =
    status === "pending" ? (
      <div data-chat-status-text="pending" className={cn("mt-1 text-xs", TEXT_MUTED)}>
        {labels.pending}
      </div>
    ) : status === "failed" ? (
      <div data-chat-status-text="failed" className="mt-1 text-xs text-red-600 dark:text-red-400">
        {labels.failed}
      </div>
    ) : null;

  const actionsSlot =
    actions !== undefined && actions !== null && actions !== false ? (
      <div data-chat-message-actions="" className={cn("mt-1 flex flex-wrap items-center gap-1", classNames?.actions)}>
        {actions}
      </div>
    ) : null;

  const rootAttrs = {
    "data-chat-message": message.id,
    "data-chat-role": message.role,
    "data-chat-status": status,
    "data-chat-visibility": visibility,
    "data-chat-own": own ? "" : undefined,
    "data-chat-grouped": grouped ? "" : undefined,
    "aria-busy": status === "streaming" ? true : undefined,
  };

  if (system && !proposal) {
    return (
      <article
        {...rootAttrs}
        className={cn("flex flex-col items-center px-4 py-1 text-center text-xs", TEXT_MUTED, className, classNames?.message)}
      >
        {internal && (
          <Badge color="amber" variant="soft" size="sm" data-chat-internal-label="">
            {labels.internal}
          </Badge>
        )}
        <div className={cn("max-w-prose", classNames?.bubble)}>{body}</div>
        {attachments}
        {actionsSlot}
      </article>
    );
  }

  const bubbleClass = cn(
    "rounded-2xl px-3.5 py-2.5 text-sm",
    TEXT,
    internal
      ? "border border-dashed border-amber-400 bg-amber-50 dark:border-amber-500/60 dark:bg-amber-950/30"
      : proposal
        ? cn("border-2 border-violet-300 dark:border-violet-500/60", SURFACE)
        : own
          ? cn("border", BORDER, SURFACE)
          : SURFACE_MUTED,
    status === "failed" && "ring-1 ring-red-400/70",
    classNames?.bubble,
    proposal && classNames?.proposal,
  );

  const bubbleInner = (
    <>
      {internal && (
        <div className="mb-1.5">
          <Badge color="amber" variant="soft" size="sm" data-chat-internal-label="">
            {labels.internal}
          </Badge>
        </div>
      )}
      {proposal && (
        <div data-chat-proposal-header="" className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge color="violet" variant="soft" size="sm">
            {labels.proposal}
          </Badge>
          {proposal.title && <span className="font-medium">{proposal.title}</span>}
        </div>
      )}
      {body}
      {attachments}
      {proposal && (
        <ProposalFooter
          message={message}
          labels={labels}
          busy={busy}
          onAccept={onProposalAccept ? () => decide("accept") : undefined}
          onReject={onProposalReject ? () => decide("reject") : undefined}
        />
      )}
    </>
  );

  return (
    <article
      {...rootAttrs}
      className={cn(
        "flex gap-2.5 px-3",
        grouped ? "pt-0.5" : "pt-3",
        own && "flex-row-reverse",
        className,
        classNames?.message,
      )}
    >
      <div className="w-8 shrink-0" aria-hidden={grouped || undefined}>
        {!grouped && (
          <Avatar size="sm" src={message.author?.avatar} alt="" fallback={initials(name)} />
        )}
      </div>
      <div className={cn("flex min-w-0 max-w-[85%] flex-col", own ? "items-end" : "items-start")}>
        {!grouped && (
          <div
            data-chat-header=""
            className={cn("mb-1 flex items-baseline gap-2 text-xs", own && "flex-row-reverse", classNames?.header)}
          >
            <span data-chat-author="" className={cn("font-medium", TEXT)}>
              {name}
            </span>
            {date && (
              <time dateTime={date.toISOString()} className={TEXT_MUTED}>
                {formatTime(date)}
              </time>
            )}
          </div>
        )}
        {proposal ? (
          <div
            data-chat-proposal={proposal.id}
            data-chat-proposal-state={proposal.state ?? "pending"}
            aria-busy={busy || undefined}
            className={cn("min-w-0 max-w-full", bubbleClass)}
          >
            {bubbleInner}
          </div>
        ) : (
          <div data-chat-bubble="" className={cn("min-w-0 max-w-full", bubbleClass)}>
            {bubbleInner}
          </div>
        )}
        {statusText}
        {actionsSlot}
      </div>
    </article>
  );
}

ChatMessage.displayName = "ChatMessage";

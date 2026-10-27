import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { cn } from "../../utils/cn";
import { Button } from "../Button";
import { ChatMessage, useAcknowledgedAction } from "./ChatMessage";
import type { ChatMessageData, ChatThreadProps } from "./ChatThread.types";
import {
  DEFAULT_GROUP_WINDOW_MS,
  continuesGroup,
  dayKey,
  defaultFormatDay,
  isOwn,
  mergeLabels,
  toDate,
} from "./chat-utils";

const TEXT_MUTED =
  "text-[color:var(--fancy-text-muted,var(--color-zinc-500))] dark:text-[color:var(--fancy-text-muted-dark,var(--color-zinc-400))]";
const BORDER =
  "border-[color:var(--fancy-border,var(--color-zinc-200))] dark:border-[color:var(--fancy-border-dark,var(--color-zinc-700))]";

// The isomorphic layout effect: scroll work must happen before paint in the
// browser, and must not warn during SSR.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface Seen {
  ids: Set<string>;
  first?: string;
  last?: string;
  scrollHeight: number;
  /** The reader's position as of the last render or scroll event, before any browser adjustment. */
  scrollTop: number;
}

/**
 * ChatThread — a controlled message list for agent and support conversations.
 *
 * - **Controlled.** It renders exactly `messages`, oldest first. Loading
 *   earlier history and deciding a proposal go through callbacks; nothing is
 *   held internally that an agent would need to read or write.
 * - **Stick to the bottom without yanking.** New messages are followed only
 *   while the reader is at the bottom. A reader who scrolled up stays put and
 *   gets an "N new messages" jump control. Prepended history keeps the
 *   reader's place. Only the log's own `scrollTop` is ever set, and focus moves
 *   with `preventScroll`, so no ancestor (or the page) scrolls (the 5.69 rule).
 * - **Visibility is the host's.** `visibility: "internal"` is labelled and
 *   styled, never filtered: pass only what the viewer may see.
 * - **Handles:** `data-react-fancy-chat-thread`, `data-chat-message="<id>"`,
 *   `data-chat-role`, `data-chat-status`, `data-chat-visibility`,
 *   `data-chat-proposal="<id>"`, `data-chat-proposal-action`.
 * - **Observable:** `onActivity` reports every interaction as one stream.
 *
 * Pair it with `Composer` or `PromptInput` in the `composer` slot (both have
 * acknowledged send). It does not ship an input of its own.
 */
export function ChatThread({
  ref,
  messages,
  heading,
  headingLevel = 2,
  onLoadEarlier,
  hasEarlier,
  loadingEarlier = false,
  stickToBottom = true,
  bottomThreshold = 48,
  onAtBottomChange,
  separators = "none",
  formatDay = defaultFormatDay,
  groupConsecutive = false,
  renderActions,
  composer,
  empty,
  classNames,
  className,
  // message display
  ownRoles = ["user"],
  streaming = true,
  contentOptions,
  labels: labelsProp,
  formatTime,
  renderAttachment,
  onProposalAccept,
  onProposalReject,
  onActivity,
  onActionError,
  onScroll: onScrollProp,
  ...rest
}: ChatThreadProps) {
  const labels = mergeLabels(labelsProp);
  const headingId = useId();
  const logRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const seenRef = useRef<Seen | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [loadBusy, runLoad] = useAcknowledgedAction(onActionError);

  const onAtBottomChangeRef = useRef(onAtBottomChange);
  onAtBottomChangeRef.current = onAtBottomChange;

  const measure = useCallback(
    (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight <= bottomThreshold,
    [bottomThreshold],
  );

  const commitAtBottom = useCallback((value: boolean) => {
    const changed = atBottomRef.current !== value;
    atBottomRef.current = value;
    setAtBottom(value);
    if (value) setUnseen(0);
    if (changed) onAtBottomChangeRef.current?.(value);
  }, []);

  const scrollLogToBottom = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    // The log's own scrollTop only. Never scrollIntoView: that scrolls every
    // scrollable ancestor too, up to the page.
    el.scrollTop = el.scrollHeight;
  }, []);

  // Follow, hold, or keep place, every time the messages change.
  useIsoLayoutEffect(() => {
    const el = logRef.current;
    if (!el) return;

    const ids = messages.map((m) => m.id);
    const first = ids[0];
    const last = ids[ids.length - 1];
    const prev = seenRef.current;

    if (!prev) {
      if (stickToBottom) scrollLogToBottom();
    } else {
      const prepended =
        prev.last !== undefined &&
        prev.last === last &&
        prev.first !== undefined &&
        prev.first !== first &&
        ids.includes(prev.first);

      if (prepended) {
        if (stickToBottom && atBottomRef.current) scrollLogToBottom();
        // From the position BEFORE the change, never the current one: the
        // browser's scroll anchoring (overflow-anchor) may already have moved
        // scrollTop by the inserted height, and adding it again overshoots.
        else el.scrollTop = prev.scrollTop + (el.scrollHeight - prev.scrollHeight);
      } else {
        const lastIndex = prev.last === undefined ? -1 : ids.indexOf(prev.last);
        const appended: ChatMessageData[] = [];
        for (let i = lastIndex + 1; i < messages.length; i++) {
          if (!prev.ids.has(messages[i].id)) appended.push(messages[i]);
        }

        if (stickToBottom && atBottomRef.current) {
          scrollLogToBottom();
        } else if (stickToBottom && appended.some((m) => isOwn(m, ownRoles))) {
          // The viewer's own send: show it, wherever they were reading.
          scrollLogToBottom();
        } else if (appended.length > 0) {
          setUnseen((n) => n + appended.length);
        }
      }
    }

    seenRef.current = { ids: new Set(ids), first, last, scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
    const nowAtBottom = measure(el);
    if (nowAtBottom !== atBottomRef.current || nowAtBottom) commitAtBottom(nowAtBottom);
    // ownRoles is compared by content inside; a new array each render must not re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, stickToBottom, measure, commitAtBottom, scrollLogToBottom]);

  // Content that grows without a messages change (images, fonts, a
  // ContentRenderer extension resolving) keeps a reader at the bottom there.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !stickToBottom || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) scrollLogToBottom();
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [stickToBottom, scrollLogToBottom]);

  const onScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      onScrollProp?.(e);
      if (seenRef.current) seenRef.current.scrollTop = e.currentTarget.scrollTop;
      const now = measure(e.currentTarget);
      if (now !== atBottomRef.current || now) commitAtBottom(now);
    },
    [measure, commitAtBottom, onScrollProp],
  );

  const jumpToLatest = useCallback(() => {
    onActivity?.({ type: "jump-to-latest", unseen });
    scrollLogToBottom();
    commitAtBottom(true);
    // The jump control is about to unmount; keep focus in the conversation
    // without scrolling anything (genie#1290).
    logRef.current?.focus({ preventScroll: true });
  }, [onActivity, unseen, scrollLogToBottom, commitAtBottom]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToLatest() {
        scrollLogToBottom();
        const el = logRef.current;
        if (el) commitAtBottom(measure(el));
      },
      scrollToMessage(id: string) {
        const el = logRef.current;
        if (!el) return false;
        const target = [...el.querySelectorAll<HTMLElement>("[data-chat-message]")].find(
          (n) => n.getAttribute("data-chat-message") === id,
        );
        if (!target) return false;
        el.scrollTop = target.offsetTop;
        commitAtBottom(measure(el));
        return true;
      },
      get element() {
        return logRef.current;
      },
    }),
    [scrollLogToBottom, commitAtBottom, measure],
  );

  const showLoadEarlier = Boolean(onLoadEarlier) && (hasEarlier ?? true);
  const earlierBusy = loadingEarlier || loadBusy;
  const showJump = unseen > 0 && !atBottom;
  const groupWindow =
    groupConsecutive === true ? DEFAULT_GROUP_WINDOW_MS : typeof groupConsecutive === "number" ? groupConsecutive : 0;

  const items: ReactNode[] = [];
  let prevDay: string | undefined;
  messages.forEach((m, i) => {
    const date = toDate(m.createdAt);
    let separator: ReactNode = null;
    if (separators === "day" && date) {
      const key = dayKey(date);
      if (key !== prevDay) {
        separator = (
          <div
            data-chat-day-separator={key}
            className={cn("flex items-center gap-3 px-4 pt-4 text-xs", TEXT_MUTED, classNames?.separator)}
          >
            <span aria-hidden="true" className={cn("h-px flex-1 border-t", BORDER)} />
            <span>{formatDay(date)}</span>
            <span aria-hidden="true" className={cn("h-px flex-1 border-t", BORDER)} />
          </div>
        );
        prevDay = key;
      }
    }
    const grouped = groupWindow > 0 && !separator && continuesGroup(messages[i - 1], m, groupWindow);

    items.push(
      <Fragment key={m.id}>
        {separator}
        <ChatMessage
          message={m}
          grouped={grouped}
          actions={renderActions?.(m)}
          ownRoles={ownRoles}
          streaming={streaming}
          contentOptions={contentOptions}
          labels={labelsProp}
          formatTime={formatTime}
          renderAttachment={renderAttachment}
          onProposalAccept={onProposalAccept}
          onProposalReject={onProposalReject}
          onActivity={onActivity}
          onActionError={onActionError}
          classNames={classNames}
        />
      </Fragment>,
    );
  });

  const H = `h${headingLevel}` as "h2";

  return (
    <div
      data-react-fancy-chat-thread=""
      {...rest}
      className={cn("flex min-h-0 flex-col", className, classNames?.root)}
    >
      {heading !== undefined && heading !== null && (
        <H
          id={headingId}
          data-react-fancy-chat-thread-heading=""
          className={cn("shrink-0 px-4 py-3 text-sm font-semibold", classNames?.heading)}
        >
          {heading}
        </H>
      )}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={logRef}
          data-react-fancy-chat-thread-log=""
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label={heading ? undefined : labels.log}
          aria-labelledby={heading ? headingId : undefined}
          tabIndex={0}
          onScroll={onScroll}
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--fancy-focus,var(--color-blue-500))]",
            classNames?.log,
          )}
        >
          <div ref={contentRef} className="flex flex-col pb-3">
            {showLoadEarlier && (
              <div className="flex justify-center pt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-react-fancy-chat-thread-load-earlier=""
                  disabled={earlierBusy}
                  aria-busy={earlierBusy || undefined}
                  onClick={() =>
                    runLoad(() => {
                      onActivity?.({ type: "load-earlier" });
                      return onLoadEarlier!();
                    }, { type: "load-earlier" })
                  }
                >
                  {earlierBusy ? labels.loadingEarlier : labels.loadEarlier}
                </Button>
              </div>
            )}
            {messages.length === 0 && empty !== undefined && (
              <div data-react-fancy-chat-thread-empty="" className={cn("px-4 py-8 text-center text-sm", TEXT_MUTED)}>
                {empty}
              </div>
            )}
            {items}
          </div>
        </div>
        {showJump && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button
              type="button"
              size="sm"
              data-react-fancy-chat-thread-jump=""
              data-unseen={unseen}
              iconTrailing="chevron-down"
              className={cn("pointer-events-auto shadow-md", classNames?.jump)}
              onClick={jumpToLatest}
            >
              {labels.newMessages(unseen)}
            </Button>
          </div>
        )}
      </div>
      {composer !== undefined && composer !== null && (
        <div data-react-fancy-chat-thread-composer="" className={cn("shrink-0", classNames?.composer)}>
          {composer}
        </div>
      )}
    </div>
  );
}

ChatThread.displayName = "ChatThread";

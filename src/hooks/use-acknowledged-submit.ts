import { useCallback, useEffect, useRef, useState } from "react";
import { fillLabel } from "../utils/label-template";

/** What an `onSubmit` Promise resolves to when the host refuses the send. */
export type SubmitRejection = { ok: false; error?: string };

/**
 * What an `onSubmit` Promise may resolve to. Anything other than a
 * `SubmitRejection` (including `undefined`) means the send was accepted.
 */
export type SubmitResult = void | SubmitRejection;

/**
 * `"idle"` — nothing in flight. `"submitting"` — an `onSubmit` Promise is
 * pending. `"error"` — the last one was refused or rejected; the draft is kept.
 */
export type SubmitStatus = "idle" | "submitting" | "error";

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function isRejection(value: unknown): value is SubmitRejection {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as { ok?: unknown }).ok === false
  );
}

/**
 * The acknowledged-send state machine `Composer` and `PromptInput` share, so the
 * two cannot disagree about what a Promise from `onSubmit` means.
 *
 * `track(result, accept)` is handed whatever `onSubmit` returned:
 *
 * - not a Promise → `accept()` runs NOW, which is exactly the old behaviour;
 * - a Promise → `"submitting"` until it settles; `accept()` runs on a resolve
 *   that is not `{ ok: false }`; a rejection or `{ ok: false }` leaves the draft
 *   alone, moves to `"error"`, calls `onSubmitError` and sets `message` for the
 *   live region.
 *
 * `busy()` reads a ref, not state, so two sends in the same tick (a double
 * Enter, Enter then a click) are refused before React has re-rendered.
 */
/**
 * The words announced when a send fails, for translation. `{error}` is the
 * host's `{ ok: false, error }` text.
 */
export interface SubmitMessages {
  /** @default "Message not sent. Your message has been kept." */
  notSent?: string;
  /** @default "Message not sent: {error}" */
  notSentDetail?: string;
}

export function useAcknowledgedSubmit(
  onSubmitError?: (error: unknown) => void,
  messages?: SubmitMessages,
) {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  const alive = useRef(true);
  const onErrorRef = useRef(onSubmitError);
  onErrorRef.current = onSubmitError;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const fail = useCallback((error: unknown, detail: string | undefined) => {
    if (alive.current) {
      setStatus("error");
      const words = messagesRef.current;
      setMessage(
        detail
          ? fillLabel(words?.notSentDetail ?? "Message not sent: {error}", { error: detail })
          : (words?.notSent ?? "Message not sent. Your message has been kept."),
      );
    }
    onErrorRef.current?.(error);
  }, []);

  /*
   * Each send has an identity. Only the NEWEST may acknowledge: an older send
   * settling after a newer one started neither runs its `accept` nor ends the
   * newer send's "submitting". The components refuse a second send while one is
   * pending, so this is the backstop for anything that ever bypasses that guard.
   * An older send that FAILS still reaches `onSubmitError`: the host is owed
   * every failure, even one the UI has moved past.
   */
  const latest = useRef(0);

  const track = useCallback(
    (result: unknown, accept: () => void) => {
      const id = ++latest.current;
      if (!isThenable(result)) {
        inFlight.current = false;
        accept();
        setStatus("idle");
        setMessage("");
        return;
      }

      inFlight.current = true;
      setStatus("submitting");
      setMessage("");
      result.then(
        (value) => {
          const current = id === latest.current;
          if (current) inFlight.current = false;
          if (isRejection(value)) {
            if (current) fail(value.error, value.error);
            else onErrorRef.current?.(value.error);
            return;
          }
          if (current && alive.current) {
            setStatus("idle");
            accept();
          }
        },
        (reason: unknown) => {
          if (id !== latest.current) {
            onErrorRef.current?.(reason);
            return;
          }
          inFlight.current = false;
          fail(reason, undefined);
        },
      );
    },
    [fail],
  );

  const busy = useCallback(() => inFlight.current, []);

  return { status, message, track, busy };
}

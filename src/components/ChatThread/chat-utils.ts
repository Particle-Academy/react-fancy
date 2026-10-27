import type { ChatMessageData, ChatThreadLabels } from "./ChatThread.types";

export const DEFAULT_LABELS: ChatThreadLabels = {
  log: "Conversation",
  loadEarlier: "Load earlier messages",
  loadingEarlier: "Loading earlier messages...",
  newMessages: (n) => (n === 1 ? "1 new message" : `${n} new messages`),
  internal: "Internal note",
  pending: "Sending...",
  failed: "Not sent",
  proposal: "Proposed",
  accept: "Accept",
  reject: "Reject",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  attachments: "Attachments",
  roles: {
    user: "You",
    assistant: "Assistant",
    system: "System",
    agent: "Agent",
    staff: "Staff",
    customer: "Customer",
  },
};

export function mergeLabels(labels?: Partial<ChatThreadLabels>): ChatThreadLabels {
  if (!labels) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...labels,
    roles: { ...DEFAULT_LABELS.roles, ...labels.roles },
  };
}

/** `null` for a missing or unparseable time: no time renders rather than "Invalid Date". */
export function toDate(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local calendar day, `YYYY-MM-DD`. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function defaultFormatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function defaultFormatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function roleLabel(role: string, labels: ChatThreadLabels): string {
  const known = labels.roles[role];
  if (known) return known;
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function isOwn(message: ChatMessageData, ownRoles: string[]): boolean {
  return message.own ?? ownRoles.includes(message.role);
}

export const DEFAULT_GROUP_WINDOW_MS = 5 * 60 * 1000;

/** Does `curr` continue `prev`'s group? Same role, same author, same visibility, within the window. */
export function continuesGroup(
  prev: ChatMessageData | undefined,
  curr: ChatMessageData,
  windowMs: number,
): boolean {
  if (!prev) return false;
  if (prev.role !== curr.role) return false;
  if ((prev.author?.name ?? "") !== (curr.author?.name ?? "")) return false;
  if ((prev.visibility ?? "public") !== (curr.visibility ?? "public")) return false;
  if (prev.proposal || curr.proposal) return false;
  if (curr.role === "system") return false;
  const a = toDate(prev.createdAt);
  const b = toDate(curr.createdAt);
  if (!a || !b) return false;
  const gap = b.getTime() - a.getTime();
  return gap >= 0 && gap <= windowMs;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

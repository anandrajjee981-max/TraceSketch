import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import {
  getRelayBase,
  getGroupHistory,
  recordGroupHistory,
  markGroupJoined,
  type GroupHistoryRow,
} from "../api/client";
import { ErrorState } from "../components/EmptyState";
import { Badge, CopyButton, PageHeader } from "../components/ui";

// ─── Types ──────────────────────────────────────────────────────────────────

/** The three types the relay persists in MongoDB. Mirrors the Mongoose enum. */
type PersistedType = "note" | "trace_share" | "replay_result";

/** "crazy" is ephemeral — socket broadcast only, never written anywhere. */
type MessageType = PersistedType | "crazy";

interface RelayMessage {
  id?: string;
  _id?: string;
  instanceId: string;
  summaryText: string;
  createdAt: string;
  groupCode?: string;
  /** Absent on legacy history rows written before `type` existed. */
  type?: MessageType;
  /** True only for socket-delivered crazy messages. */
  ephemeral?: boolean;
}

interface CrazyMessagePayload {
  instanceId: string;
  text: string;
  sentAt: number;
}

const TYPE_OPTIONS: { value: MessageType; label: string; hint: string }[] = [
  { value: "note", label: "Note", hint: "Persisted to the relay database" },
  { value: "trace_share", label: "Trace Share", hint: "Persisted to the relay database" },
  { value: "replay_result", label: "Replay Result", hint: "Persisted to the relay database" },
  { value: "crazy", label: "Crazy", hint: "Ephemeral socket broadcast only — never saved to database" },
];

/**
 * "restoring" covers the async window where we ask the relay whether the cached
 * group code is still valid. Rendering "in-group" optimistically caused a flash
 * of a dead group code before the check resolved.
 */
type PageState = "restoring" | "no-group" | "in-group" | "unreachable";

/**
 * Every persisted entry type is surfaced in History, notes included, so an
 * archived session replays the whole conversation. "joined" markers are the one
 * exception — they record membership, not conversation.
 */
type HistoryEntryType = Exclude<PersistedType, never>;

const HISTORY_TYPES: HistoryEntryType[] = ["note", "trace_share", "replay_result"];

type ViewMode = "live" | "history";

/**
 * One History row, normalised across its two sources: the collector's
 * `group_history` table and the live `group-message` socket event. Keeping a
 * single shape is what lets a socket-delivered entry and the persisted row for
 * the same message collapse into one list item.
 */
interface HistoryEntry {
  entryType: HistoryEntryType;
  instanceId: string;
  /** Null unless a trace id was actually persisted. See note on historyKey. */
  traceId: string | null;
  summary: string;
  /** ISO 8601, normalised from the collector's epoch-ms `saved_at`. */
  timestamp: string;
}

/**
 * Dedup key for a history entry.
 *
 * Deliberately NOT the source's own primary key: a collector row carries a
 * SQLite autoincrement `id` while a socket message carries a Mongo ObjectId
 * `id`. Keying on those would give the same logical message two different keys
 * and guarantee the duplicate this is meant to prevent. These three fields are
 * byte-identical for the same logical message across both sources, because the
 * writer stores the message text verbatim in `data`.
 */
function historyKey(e: HistoryEntry): string {
  return `${e.instanceId}|${e.entryType}|${e.summary}`;
}

function mergeHistory(existing: HistoryEntry[], incoming: HistoryEntry[]): HistoryEntry[] {
  const seen = new Set(existing.map(historyKey));
  const result = [...existing];
  for (const e of incoming) {
    const k = historyKey(e);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(e);
    }
  }
  return result;
}

function isHistoryType(type: MessageType | undefined): type is HistoryEntryType {
  // "crazy" is socket-only and never persisted, so it is excluded here.
  return type === "note" || type === "trace_share" || type === "replay_result";
}

/** Adapt a collector group_history row into the shared History shape. */
function rowToHistoryEntry(row: GroupHistoryRow): HistoryEntry | null {
  if (!isHistoryType(row.entry_type as MessageType)) return null;
  return {
    entryType: row.entry_type as HistoryEntryType,
    instanceId: row.instance_id,
    traceId: row.trace_id ?? null,
    summary: row.data ?? "",
    timestamp: new Date(row.saved_at).toISOString(),
  };
}

const LS_KEY = "tracesketch_group_code";

/** Distinguishes two crazy messages sent inside the same millisecond. */
let crazySeq = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dedupKey(m: RelayMessage): string {
  return m.id ?? m._id ?? `${m.instanceId}|${m.createdAt}|${m.summaryText}`;
}

function mergeMessages(existing: RelayMessage[], incoming: RelayMessage[]): RelayMessage[] {
  const seen = new Set(existing.map(dedupKey));
  const result = [...existing];
  for (const m of incoming) {
    const k = dedupKey(m);
    if (!seen.has(k)) {
      seen.add(k);
      result.push(m);
    }
  }
  return result;
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}

function CodeDisplay({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="px-4 py-1.5 rounded-[8px]" style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}>
        <span className="text-[26px] ts-mono font-bold tracking-[0.28em] text-white select-all">{code}</span>
      </div>
      <CopyButton value={code} className="btn-secondary !py-2 !px-3.5" copiedLabel="Copied!" title="Copy group code">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span>Copy Code</span>
      </CopyButton>
    </div>
  );
}

export interface RelayProps {
  embedded?: boolean;
  onClose?: () => void;
  initialSharedText?: string;
}

export function Relay({ embedded = false, onClose, initialSharedText }: RelayProps = {}) {
  const { instanceId } = useConfig();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const RELAY_BASE = getRelayBase();
  /** ?group=CODE opens a past group's archived history (from the navbar list). */
  const archiveCode = searchParams.get("group");

  // ── State ──
  // Starts as "restoring" — the mount effect decides whether the relay still
  // honours the cached group code before anything is rendered.
  const [pageState, setPageState] = useState<PageState>("restoring");
  const [groupCode, setGroupCode] = useState<string | null>(() => localStorage.getItem(LS_KEY));
  const [messages, setMessages] = useState<RelayMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("note");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // ── History state (relay group_history) ──
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Sync initialSharedText without an effect: when the host hands us new shared
  // text we adjust state during render (React's documented pattern).
  const [lastSharedText, setLastSharedText] = useState<string | undefined>(initialSharedText);
  if (initialSharedText && initialSharedText !== lastSharedText) {
    setLastSharedText(initialSharedText);
    setMessageInput(initialSharedText);
    setMessageType("trace_share");
  }

  // Join flow
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const feedRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // ── Scroll feed to bottom ──
  const scrollFeed = useCallback(() => {
    setTimeout(() => {
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // ── Fetch message history ──
  const fetchHistory = useCallback(
    async (code: string) => {
      try {
        const res = await fetch(`${RELAY_BASE}/group/${code}/messages`);
        if (res.ok) {
          const data = (await res.json()) as { messages: RelayMessage[] };
          setMessages((prev) => mergeMessages(prev, data.messages ?? []));
          scrollFeed();
        }
      } catch {
        // history fetch failing is non-fatal — live messages still arrive via socket
      }
    },
    [RELAY_BASE, scrollFeed]
  );

  // ── Fetch archived group history from the relay ──
  // Independent of the live feed: a failure here sets historyError only and
  // must never take down the live relay view.
  //
  // `manageLoading: false` is used by callers that already raised the loading
  // flag during render, so no state is written synchronously from an effect.
  // The flag is always lowered once the request settles.
  const fetchGroupHistory = useCallback(
    async (code: string, opts?: { manageLoading?: boolean }) => {
      const manageLoading = opts?.manageLoading !== false;
      if (manageLoading) {
        setHistoryLoading(true);
        setHistoryError(null);
      }
      try {
        const data = await getGroupHistory(code, { types: HISTORY_TYPES });
        const rows = (data.entries ?? []).map(rowToHistoryEntry).filter((e): e is HistoryEntry => e !== null);
        // Oldest first, matching the relay's sort order.
        setHistory((prev) => mergeHistory(prev, rows));
      } catch (e) {
        setHistoryError(e instanceof Error ? e.message : "Failed to load group history");
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  // ── Abandon a group that the relay no longer recognises ──
  // Shared by the mount-time validation and the socket's group-error event, so
  // an expired group always ends up in the same clean state.
  const abandonGroup = useCallback((reason: string | null) => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    localStorage.removeItem(LS_KEY);
    setGroupCode(null);
    setMessages([]);
    setHistory([]);
    setHistoryError(null);
    setLeaveError(reason);
    setPageState("no-group");
  }, []);

  // ── Connect socket ──
  const connectSocket = useCallback(    (code: string) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      const socket = io(RELAY_BASE, { transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-room", { groupCode: code, instanceId });
      });

      socket.on("group-message", (msg: RelayMessage) => {
        // Live behaviour, unchanged.
        setMessages((prev) => mergeMessages(prev, [msg]));
        scrollFeed();

        // Mirror persisted messages into History so the archived conversation
        // stays current without a refresh. mergeHistory drops it if the relay
        // already returned the same row. "crazy" is socket-only and never
        // persisted, so isHistoryType excludes it.
        const { type } = msg;
        if (isHistoryType(type)) {
          setHistory((prev) =>
            mergeHistory(prev, [
              {
                entryType: type,
                instanceId: msg.instanceId,
                traceId: null,
                summary: msg.summaryText,
                timestamp: msg.createdAt,
              },
            ])
          );
        }
      });

      // Ephemeral path. Normalised into the same feed shape so the UI treats
      // both event streams identically — only `type`/`ephemeral` differ.
      socket.on("crazy-message", (payload: CrazyMessagePayload) => {
        const msg: RelayMessage = {
          _id: `crazy-${payload.instanceId}-${payload.sentAt}-${crazySeq++}`,
          instanceId: payload.instanceId,
          summaryText: payload.text,
          createdAt: new Date(payload.sentAt).toISOString(),
          type: "crazy",
          ephemeral: true,
        };
        setMessages((prev) => mergeMessages(prev, [msg]));
        scrollFeed();
      });

      socket.on("crazy-message-error", ({ message }: { code: string; message: string }) => {
        setSendError(message);
      });

      socket.on("group-error", ({ code, message }: { code: string; message: string }) => {
        // The relay rejects join-room when the group has expired or this
        // instance is not a member. Without this the page sat on a dead group
        // code forever, because nothing else re-checks it after mount.
        if (code === "NOT_A_MEMBER" || code === "INTERNAL_ERROR" || code === "NOT_JOINED") {
          abandonGroup(`Session expired — ${message}`);
        }
      });

      socket.on("peer-left", ({ instanceId: leftId }: { instanceId: string }) => {
        if (leftId !== instanceId) {
          // inject a system notice into the feed
          const notice: RelayMessage = {
            _id: `peer-left-${Date.now()}`,
            instanceId: "__system__",
            summaryText: "Other developer left the group.",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => mergeMessages(prev, [notice]));
          scrollFeed();
        }
      });

      socket.on("session-ended", ({ instanceId: leftId }: { instanceId: string }) => {
        // The creator owns the session, so their departure deletes the group.
        // The room is dead but still exists client-side, so drop back to the
        // Create/Join screen instead of leaving a dead group code on screen.
        if (leftId !== instanceId) {
          abandonGroup("The developer who created this session left, so it has ended.");
        }
      });

      return socket;
    },
    [RELAY_BASE, instanceId, scrollFeed, abandonGroup]
  );

  // ── Enter State B ──
  const enterGroup = useCallback(
    (code: string) => {
      localStorage.setItem(LS_KEY, code);
      setGroupCode(code);
      setPageState("in-group");
      setMessages([]);
      setHistory([]);
      setHistoryError(null);
      setLeaveError(null);
      setViewMode("live");
      fetchHistory(code);
      fetchGroupHistory(code);
      connectSocket(code);
      // Record membership so this group shows up in the navbar history list,
      // even if this instance only ever sent plain notes.
      void markGroupJoined(code, { instanceId });
    },
    [fetchHistory, fetchGroupHistory, connectSocket, instanceId]
  );

  // ── Archive mode: ?group=CODE re-points the page at a past group's history ──
  // Applied during render (React's documented "adjust state while rendering"
  // pattern, already used above for initialSharedText) so it happens before any
  // effect runs and therefore can't race the live restore below.
  const [lastArchiveCode, setLastArchiveCode] = useState<string | null>(archiveCode);
  if (archiveCode !== lastArchiveCode) {
    setLastArchiveCode(archiveCode);
    if (archiveCode) {
      setGroupCode(archiveCode);
      setPageState("in-group");
      setViewMode("history");
      setMessages([]);
      setHistory([]);
      setLeaveError(null);
      // Raise the spinner here so the effect below only performs the fetch.
      setHistoryLoading(true);
      setHistoryError(null);
    }
  }

  // ── Load a group's persisted history ──
  useEffect(() => {
    if (!archiveCode) return;
    // Archive mode has no live socket: the group has almost certainly expired,
    // and viewing it must not make it look like the active session.
    socketRef.current?.disconnect();
    socketRef.current = null;
    localStorage.removeItem(LS_KEY);
    // Deferred by a tick so the spinner raised during render actually paints
    // before the request starts, instead of racing it inside the same commit.
    const timer = setTimeout(() => {
      void fetchGroupHistory(archiveCode, { manageLoading: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [archiveCode, fetchGroupHistory]);

  // ── Restore the live group, but only if the relay still knows about it ──
  useEffect(() => {
    // Archive mode positioned the page during render; nothing to restore.
    if (archiveCode) return;

    let cancelled = false;

    // A group lives for 6h in the relay, then it 404s. localStorage outlives
    // that, so a code read from it can point at a group that no longer exists.
    // The relay's session lookup is the only authority on whether it is still
    // alive, so it is consulted unconditionally — previously this was skipped
    // whenever localStorage had a value, which left a dead group code pinned to
    // the page forever.
    async function restore() {
      let activeCode: string | null = null;
      try {
        const res = await fetch(`${RELAY_BASE}/session/${encodeURIComponent(instanceId)}`);
        if (res.ok) {
          const data = (await res.json()) as { groupCode?: string };
          if (data.groupCode) activeCode = data.groupCode;
        }
        // 404 = no live session for this instance
      } catch {
        // relay unreachable — fall through and stay on State A
      }

      if (cancelled) return;

      const saved = localStorage.getItem(LS_KEY);

      if (activeCode) {
        // The relay may know a different code than the one cached locally
        // (e.g. joined from another tab). The relay wins.
        if (saved && saved !== activeCode) localStorage.setItem(LS_KEY, activeCode);
        enterGroup(activeCode);
        return;
      }

      if (saved) {
        // Stale: the group this instance was in has expired or been left.
        // Drop it so we don't render a group code that can never sync.
        abandonGroup(null);
        return;
      }
      // Stay on State A — Create/Join. Past sessions remain reachable from the
      // navbar group list.
      setPageState("no-group");
    }

    restore();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archiveCode]);

  // ── Create Group ──
  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch(`${RELAY_BASE}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorInstanceId: instanceId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { groupCode: string };
      enterGroup(data.groupCode);
    } catch (e) {
      if (e instanceof TypeError && e.message.includes("fetch")) {
        setPageState("unreachable");
      } else {
        setCreateError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Join Group ──
  const handleJoin = async () => {
    setJoinError(null);
    setJoining(true);
    try {
      const res = await fetch(`${RELAY_BASE}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupCode: joinCode.toUpperCase(), joinerInstanceId: instanceId }),
      });
      const data = (await res.json().catch(() => ({}))) as { groupCode?: string; message?: string };
      if (!res.ok) {
        setJoinError(data.message ?? `Error ${res.status}`);
        return;
      }
      enterGroup(data.groupCode ?? joinCode.toUpperCase());
    } catch (e) {
      if (e instanceof TypeError) {
        setPageState("unreachable");
      } else {
        setJoinError("Unexpected error. Try again.");
      }
    } finally {
      setJoining(false);
    }
  };

  // ── Send Message ──
  const handleSend = async () => {
    if (!messageInput.trim() || !groupCode) return;
    const text = messageInput.trim();
    setSendError(null);

    // Crazy: no REST call at all. The relay broadcasts it to the room and it
    // is never written to MongoDB, so it will not appear on page reload.
    if (messageType === "crazy") {
      const socket = socketRef.current;
      if (!socket?.connected) {
        setSendError("Not connected to the relay — crazy messages are not stored, so this one would be lost.");
        return;
      }
      socket.emit(
        "crazy-message",
        { groupCode, instanceId, text },
        (res: { success: boolean; message?: string }) => {
          if (!res?.success) setSendError(res?.message ?? "Failed to send message");
        }
      );
      setMessageInput("");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${RELAY_BASE}/group/${groupCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId, summaryText: text, type: messageType }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setSendError(data.message ?? `HTTP ${res.status}`);
        return;
      }
      // Mirror into the collector's local group_history. The durable record is
      // written by the relay itself when it accepts this message — a browser
      // write only reaches this machine's collector, so the peer would never
      // see it. This call is best-effort local bookkeeping and is allowed to
      // fail. The relay payload carries no trace id, so trace_id stays null and
      // the Trace Detail link stays hidden until one is actually available.
      if (isHistoryType(messageType)) {
        void recordGroupHistory(
          {
            group_code: groupCode,
            instance_id: instanceId,
            entry_type: messageType,
            trace_id: null,
            data: text,
          },
          { instanceId }
        );
      }
      // Don't add to feed here — wait for the socket group-message event
      setMessageInput("");
    } catch {
      // Send failed silently — could add error toast later
    } finally {
      setSending(false);
    }
  };

  // ── Leave Group ──
  const handleLeave = async () => {
    if (!groupCode) return;
    setLeaving(true);
    setLeaveError(null);
    try {
      const res = await fetch(`${RELAY_BASE}/group/${groupCode}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);

      socketRef.current?.disconnect();
      socketRef.current = null;
      localStorage.removeItem(LS_KEY);
      setGroupCode(null);
      setMessages([]);
      setHistory([]);
      setHistoryError(null);
      setPageState("no-group");
      setShowJoinInput(false);
      setJoinCode("");
      setJoinError(null);
    } catch (e) {
      setLeaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setLeaving(false);
    }
  };

  // ─── State R: Restoring ──────────────────────────────────────────────────────
  // Rendered while we ask the relay whether the cached group code is still
  // valid. Anything else would flash a dead group code before the check lands.
  if (pageState === "restoring") {
    return (
      <div
        className={`mx-auto flex items-center justify-center gap-2 ${embedded ? "pt-1" : "max-w-[560px] pt-10"}`}
        style={{ color: "var(--text-dim)" }}
      >
        <Spinner />
        <span className="text-[12px]">Restoring session…</span>
      </div>
    );
  }

  // ─── State C: Unreachable ────────────────────────────────────────────────────
  if (pageState === "unreachable") {    return (
      <div className={`mx-auto ${embedded ? "pt-2 max-w-none" : "max-w-[560px] pt-10"}`}>
        <ErrorState
          title="Unable to reach Relay server"
          description={`The real-time collaboration server is not responding at ${RELAY_BASE}. Start the relay service via npm run dev or check your connection.`}
          action={
            <button onClick={() => setPageState("no-group")} className="btn-secondary">
              ← Back to Relay
            </button>
          }
        />
      </div>
    );
  }

  // ─── State A: No group ───────────────────────────────────────────────────────
  if (pageState === "no-group") {
    return (
      <div className={`mx-auto flex flex-col gap-4 ${embedded ? "w-full max-w-none pt-1" : "max-w-[600px] pt-6"}`}>
        {!embedded && (
          <PageHeader
            title="Relay — Pair Debugging"
            description="Collaborate in real-time. Share captured traces, verify replay outcomes, and chat with instant socket synchronization."
            badge={<Badge>Live Sync</Badge>}
            actions={
              onClose ? (
                <button onClick={onClose} className="btn-secondary" title="Close Relay Dock">
                  ✕ Close
                </button>
              ) : undefined
            }
          />
        )}

        <div className="p-6 rounded-[12px] flex flex-col gap-4 ts-card ts-stagger" style={{ ["--stagger-i" as string]: 1 }}>
          <div className="flex gap-3 flex-wrap">
            <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1 py-2.5 text-[13px]">
              {creating ? (
                <Spinner />
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              {creating ? "Creating Group…" : "Create Group"}
            </button>

            <button onClick={() => setShowJoinInput((v) => !v)} disabled={creating} className="btn-secondary flex-1 py-2.5 text-[13px]">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10 8H3M6.5 5L3 8l3.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Join Group
            </button>
          </div>

          {createError && (
            <p role="alert" className="text-[12px]" style={{ color: "var(--red)" }}>
              {createError}
            </p>
          )}

          {showJoinInput && (
            <div className="flex flex-col gap-2 pt-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase().slice(0, 4));
                    setJoinError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && joinCode.length === 4 && handleJoin()}
                  placeholder="XXXX"
                  maxLength={4}
                  aria-label="Group code"
                  className="ts-input !w-[110px] text-center ts-mono text-[16px] font-bold tracking-[0.2em] ts-numeric"
                  autoFocus
                />
                <button onClick={handleJoin} disabled={joinCode.length !== 4 || joining} className="btn-primary py-2 px-4">
                  {joining ? "Joining…" : "Join Group"}
                </button>
              </div>
              {joinError && (
                <p role="alert" className="text-[12px]" style={{ color: "var(--red)" }}>
                  {joinError}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-center" style={{ color: "var(--text-dim)" }}>
          Relay server: <span className="ts-mono" style={{ color: "var(--text-secondary)" }}>{RELAY_BASE}</span>
        </p>
      </div>
    );
  }

  // ─── State B: In a group ─────────────────────────────────────────────────────
  return (
    <div
      className={`mx-auto flex flex-col gap-3.5 ${embedded ? "w-full max-w-none pt-0" : "max-w-[760px] pt-4"}`}
      style={{ height: embedded ? "100%" : "calc(100vh - 140px)", minHeight: embedded ? "540px" : undefined }}
    >
      {/* Group code + leave */}
      <div className="p-3.5 sm:p-4 rounded-[12px] flex items-center justify-between gap-3 shrink-0 ts-card ts-stagger">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="ts-overline">
            {archiveCode ? "Archived Group — Session Expired" : "Group Code — Share to Connect"}
          </p>
          <CodeDisplay code={groupCode!} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {archiveCode ? (
            // No live session to leave — this just closes the archive view.
            <button
              onClick={() => {
                setSearchParams({});
                setPageState("no-group");
                setGroupCode(null);
                setHistory([]);
              }}
              className="btn-secondary shrink-0"
            >
              ← Back
            </button>
          ) : (
            <button onClick={handleLeave} disabled={leaving} className="btn-destructive shrink-0">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{leaving ? "Leaving…" : "Leave"}</span>
            </button>
          )}
          {embedded && onClose && (
            <button onClick={onClose} className="btn-secondary shrink-0 !px-2.5 !py-1.5" title="Close Relay Dock">
              ✕
            </button>
          )}
        </div>
      </div>

      {leaveError && (
        <p role="alert" className="text-[12px] px-1" style={{ color: "var(--red)" }}>
          {leaveError}
        </p>
      )}

      {/* Message feed */}
      <div className="flex-1 rounded-[12px] overflow-hidden flex flex-col min-h-0 ts-card" style={{ background: "var(--bg-surface)" }}>
        <div className="ts-card-header shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={
                viewMode === "live"
                  ? { background: "#10B981", boxShadow: "0 0 6px #10B981" }
                  : { background: "var(--text-dim)" }
              }
            />
            <span className="ts-card-title">
              {viewMode === "live" ? "Live Discussion" : "Group History"}
            </span>
            <div className="ts-segmented shrink-0" role="radiogroup" aria-label="Relay view">
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "live"}
                onClick={() => setViewMode("live")}
                className="ts-segment"
                title="Real-time relay feed"
              >
                Live
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={viewMode === "history"}
                onClick={() => setViewMode("history")}
                className="ts-segment"
                title="Archived session messages and shared traces"
              >
                History
              </button>
            </div>
          </div>
          <Badge tone="neutral">
            <span className="ts-numeric">{viewMode === "live" ? messages.length : history.length}</span>{" "}
            {viewMode === "live"
              ? `message${messages.length !== 1 ? "s" : ""}`
              : `entr${history.length !== 1 ? "ies" : "y"}`}
          </Badge>
        </div>

        {viewMode === "history" ? (
          // ── History panel ──
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-0 ts-scroll-fade" aria-label="Group history">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 h-full py-10 text-[12px]" style={{ color: "var(--text-dim)" }}>
                <Spinner />
                Loading history…
              </div>
            ) : historyError ? (
              <div
                className="flex flex-col items-center justify-center gap-2 h-full text-center py-10"
                style={{ color: "var(--text-dim)" }}
              >
                <p className="text-[13px] font-medium" style={{ color: "var(--red)" }}>
                  Could not load group history
                </p>
                <p role="alert" className="text-[11px] max-w-[320px] ts-mono">
                  {historyError}
                </p>
                <p className="text-[12px] max-w-[320px]">
                  Live relay is unaffected — switch back to Live to keep collaborating.
                </p>
                <button
                  onClick={() => groupCode && fetchGroupHistory(groupCode)}
                  className="btn-secondary mt-1 !py-1.5 !px-3"
                >
                  Retry
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10" style={{ color: "var(--text-dim)" }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
                  style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "var(--text-dim)" }}>
                    <path d="M3 3v5h5M21 21v-5h-5M3.5 13a8.5 8.5 0 0 1 14-5.7M20.5 11a8.5 8.5 0 0 1-14 5.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-slate-300">No archived messages yet</p>
                <p className="text-[12px] max-w-[300px]">
                  Every message sent in this session is recorded here, including shared traces and replay results.
                </p>
              </div>
            ) : (
              history.map((entry) => (
                <div
                  key={historyKey(entry)}
                  className="flex flex-col gap-1.5 rounded-[12px] px-3.5 py-2.5 ts-chat-in"
                  style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="ts-chip-neutral !py-0 !px-1.5 !text-[9px]">
                      {entry.entryType === "trace_share"
                        ? "Trace Share"
                        : entry.entryType === "replay_result"
                          ? "Replay Result"
                          : "Note"}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: entry.instanceId === instanceId ? "var(--text-secondary)" : "var(--accent-text)" }}>
                      {entry.instanceId === instanceId ? "You" : "Peer Developer"}
                    </span>
                    <span className="text-[10px] ts-numeric" style={{ color: "var(--text-dim)" }} title={entry.timestamp}>
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>

                  <p className="text-[13px] leading-relaxed break-words" style={{ color: "#E2E8F0" }}>
                    {entry.summary}
                  </p>

                  {entry.traceId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/traces/${encodeURIComponent(entry.traceId!)}`)}
                      className="self-start text-[11px] ts-mono underline underline-offset-2 hover:opacity-80"
                      style={{ color: "var(--accent-text)" }}
                      title="Open trace detail"
                    >
                      {entry.traceId}
                    </button>
                  ) : (
                    <span className="text-[10px] italic" style={{ color: "var(--text-dim)" }}>
                      no trace id recorded
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
        <div ref={feedRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 min-h-0 ts-scroll-fade" aria-live="polite" aria-label="Relay messages">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10" style={{ color: "var(--text-dim)" }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1 ts-pop"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "var(--text-dim)" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[13px] font-medium text-slate-300">No messages yet in this group</p>
              <p className="text-[12px] max-w-[280px]">
                Send a note, share a trace, or test real-time collaboration with your peer.
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              // System notices (e.g. peer-left) render as a centred line
              if (msg.instanceId === "__system__") {
                return (
                  <div key={dedupKey(msg) + i} className="flex items-center gap-3 my-1 px-4 ts-chat-in">
                    <div className="flex-1 h-px" style={{ background: "var(--border-dim)" }} />
                    <span className="text-[11px] italic shrink-0" style={{ color: "var(--text-dim)" }}>
                      {msg.summaryText}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "var(--border-dim)" }} />
                  </div>
                );
              }
              const isMe = msg.instanceId === instanceId;
              const isCrazy = msg.type === "crazy" || msg.ephemeral === true;
              return (
                <div
                  key={dedupKey(msg) + i}
                  className={`flex flex-col gap-1 max-w-[82%] ts-chat-in ${isMe ? "self-end items-end" : "self-start items-start"}`}
                >
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[11px] font-medium" style={{ color: isMe ? "var(--text-secondary)" : "var(--accent-text)" }}>
                      {isMe ? "You" : "Peer Developer"}
                    </span>
                    {msg.type && msg.type !== "note" && !isCrazy && (
                      <span className="ts-chip-neutral !py-0 !px-1.5 !text-[9px]">
                        {msg.type === "trace_share" ? "Trace Share" : "Replay Result"}
                      </span>
                    )}
                    {isCrazy && (
                      <span
                        className="ts-chip !py-0 !px-1.5 !text-[9px]"
                        style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}
                      >
                        ephemeral · unsaved
                      </span>
                    )}
                    <span className="text-[10px] ts-numeric" style={{ color: "var(--text-dim)" }}>
                      {relativeTime(msg.createdAt)}
                    </span>
                  </div>

                  <div
                    className={`px-3.5 py-2 text-[13px] leading-relaxed break-words ${
                      isCrazy
                        ? "border border-dashed rounded-[12px] italic"
                        : isMe
                        ? "rounded-[14px] rounded-tr-[3px]"
                        : "rounded-[14px] rounded-tl-[3px]"
                    }`}
                    style={
                      isCrazy
                        ? { borderColor: "var(--red-border)", background: "var(--red-bg)", color: "#FDA4AF", boxShadow: "0 0 12px rgba(244, 63, 94, 0.12)" }
                        : isMe
                        ? { background: "rgba(108, 71, 255, 0.16)", border: "1px solid var(--border-accent)", color: "var(--text-primary)" }
                        : { background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "#E2E8F0" }
                    }
                  >
                    {msg.summaryText}
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Mode selector */}
        {viewMode === "live" && (
        <div className="px-4 py-2 flex items-center justify-between gap-2 flex-wrap shrink-0" style={{ background: "var(--bg-surface-2)", borderTop: "1px solid var(--border-dim)" }}>
          <div className="flex items-center gap-1.5">
            <span className="ts-overline shrink-0 mr-1">Mode</span>
            <div className="ts-segmented" role="radiogroup" aria-label="Message type">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={messageType === opt.value}
                  onClick={() => {
                    setMessageType(opt.value);
                    setSendError(null);
                  }}
                  className="ts-segment"
                  title={opt.hint}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {messageType === "crazy" && (
            <span className="text-[10px] italic" style={{ color: "#FDA4AF" }}>
              temporary — disappears on reload
            </span>
          )}
        </div>
        )}

        {/* Send input bar */}
        {viewMode === "live" && (
        <div className="px-4 py-3 flex items-center gap-2.5 shrink-0" style={{ background: "var(--bg-surface-2)", borderTop: "1px solid var(--border-dim)" }}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              if (sendError) setSendError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={messageType === "crazy" ? "Say something crazy (ephemeral)…" : "Type a message or paste trace context…"}
            aria-label="Message"
            className="flex-1 ts-input !rounded-full !px-4 !py-2"
          />
          <button
            onClick={handleSend}
            disabled={!messageInput.trim() || sending}
            className="btn-primary !rounded-full !px-4 !py-2 shrink-0"
            title="Send message"
          >
            {sending ? (
              <Spinner />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M14 8H2M14 8L9 3M14 8L9 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>Send</span>
          </button>
        </div>
        )}

        {sendError && viewMode === "live" && (
          <p role="alert" className="px-4 pb-2 text-[11px] shrink-0 ts-toast" style={{ color: "var(--red)", background: "var(--bg-surface-2)" }}>
            {sendError}
          </p>
        )}
      </div>

      <p className="text-[10px] text-center shrink-0" style={{ color: "var(--text-dim)" }}>
        Connected to relay at <span className="ts-mono" style={{ color: "var(--text-secondary)" }}>{RELAY_BASE}</span>
      </p>
    </div>
  );
}

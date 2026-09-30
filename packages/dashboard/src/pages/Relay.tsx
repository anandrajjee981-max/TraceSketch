import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useConfig } from "../context/ConfigContext";
import { getRelayBase } from "../api/client";
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

type PageState = "no-group" | "in-group" | "unreachable";

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
  const RELAY_BASE = getRelayBase();

  // ── State ──
  const [pageState, setPageState] = useState<PageState>(() =>
    localStorage.getItem(LS_KEY) ? "in-group" : "no-group"
  );
  const [groupCode, setGroupCode] = useState<string | null>(() => localStorage.getItem(LS_KEY));
  const [messages, setMessages] = useState<RelayMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("note");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

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

  // ── Connect socket ──
  const connectSocket = useCallback(
    (code: string) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      const socket = io(RELAY_BASE, { transports: ["websocket", "polling"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-room", { groupCode: code, instanceId });
      });

      socket.on("group-message", (msg: RelayMessage) => {
        setMessages((prev) => mergeMessages(prev, [msg]));
        scrollFeed();
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

      return socket;
    },
    [RELAY_BASE, instanceId, scrollFeed]
  );

  // ── Enter State B ──
  const enterGroup = useCallback(
    (code: string) => {
      localStorage.setItem(LS_KEY, code);
      setGroupCode(code);
      setPageState("in-group");
      setMessages([]);
      fetchHistory(code);
      connectSocket(code);
    },
    [fetchHistory, connectSocket]
  );

  // ── On mount: restore group — localStorage first, then relay fallback ──
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        if (!cancelled) enterGroup(saved);
        return;
      }
      // localStorage is empty — check the relay in case this instance still
      // has an active backend session (e.g. after a tab crash / cache clear).
      try {
        const res = await fetch(`${RELAY_BASE}/session/${encodeURIComponent(instanceId)}`);
        if (res.ok) {
          const data = (await res.json()) as { groupCode: string };
          if (data.groupCode && !cancelled) enterGroup(data.groupCode);
        }
        // 404 = no session — stay on State A, that's correct
      } catch {
        // relay unreachable — stay on State A
      }
    }
    restore();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ─── State C: Unreachable ────────────────────────────────────────────────────
  if (pageState === "unreachable") {
    return (
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
          <p className="ts-overline">Group Code — Share to Connect</p>
          <CodeDisplay code={groupCode!} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleLeave} disabled={leaving} className="btn-destructive shrink-0">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{leaving ? "Leaving…" : "Leave"}</span>
          </button>
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
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
            <span className="ts-card-title">Live Discussion</span>
          </div>
          <Badge tone="neutral">
            <span className="ts-numeric">{messages.length}</span> message{messages.length !== 1 ? "s" : ""}
          </Badge>
        </div>

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

        {/* Mode selector */}
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

        {/* Send input bar */}
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

        {sendError && (
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

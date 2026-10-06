import { io, type Socket } from "socket.io-client";
import {
  insertData,
  isLocalEntryType,
  listActiveMemberships,
  getMembership,
  pinMembershipSession,
  deactivateMembership,
} from "./dao/Group";
import { getOrCreateInstance } from "./service/instance.service";

/**
 * Headless relay archiver.
 *
 * The dashboard's socket handler writes to this same database, but only while a
 * browser tab is open. This client exists so the local permanent record does not
 * depend on that: the collector process itself holds a socket per active group
 * and writes straight into SQLite via the DAO, with no HTTP round-trip to
 * itself.
 *
 * Three invariants:
 *
 *  1. ONE SOCKET PER GROUP. The relay treats a socket as belonging to exactly one
 *     room and evicts it from the previous one on re-join, so a single shared
 *     socket would silently unhook itself from every group but the last.
 *
 *  2. OBSERVER MODE. These sockets join with `observer: true`, which makes the
 *     relay suppress `user-joined` / `peer-left` for them. Without it, every
 *     collector restart would tell the other developer that their partner had
 *     left the session.
 *
 *  3. SESSION PINNING. The relay returns the session's Mongo _id on join. It is
 *     stored, and if the same code later resolves to a different _id the code
 *     has been recycled to someone else's session - at which point this client
 *     drops the socket and deactivates the membership rather than archiving a
 *     stranger's conversation.
 */

const RELAY_URL = process.env.TRACESKETCH_RELAY_URL ?? "https://tracesketch.onrender.com";

/** Broadcast payload; matches StoredMessage on the relay. */
type RelayMessage = {
  id: string;
  groupCode: string;
  instanceId: string;
  summaryText: string;
  type: string;
  createdAt: string;
};

type JoinedAck = {
  success: boolean;
  code?: string;
  message?: string;
  sessionId?: string;
};

type GroupSocket = {
  socket: Socket;
  groupCode: string;
  /** Session _id this socket is pinned to; guards against code recycling. */
  sessionId: string | null;
};

const sockets = new Map<string, GroupSocket>();

function log(message: string) {
  console.log(`[relay-archiver] ${message}`);
}

/**
 * Persist a message that the collector received over the relay socket.
 *
 * Only trace_share/replay_result reach SQLite - notes are the relay's business
 * and "crazy" never arrives here at all (it is broadcast on a separate event
 * that this client does not subscribe to). insertData() re-validates anyway.
 *
 * `source_id` is the relay's Mongo _id, so when the dashboard's socket handler
 * has already mirrored the same message the unique index drops this insert.
 */
async function archive(message: RelayMessage): Promise<void> {
  if (!isLocalEntryType(message.type)) {
    log(`skipping ${message.type} for ${message.groupCode} (not a permanent type)`);
    return;
  }

  try {
    const result = await insertData(
      message.groupCode,
      message.instanceId,
      message.type,
      null as unknown as string,
      message.summaryText,
      message.id
    );

    if (result.duplicate) {
      log(`already have ${message.type} ${message.id} - skipped duplicate`);
    } else {
      log(`archived ${message.type} from ${message.instanceId} in ${message.groupCode}`);
    }
  } catch (error) {
    console.error("[relay-archiver] failed to archive message:", error);
  }
}

function openGroupSocket(groupCode: string, instanceId: string) {
  const existing = sockets.get(groupCode);
  if (existing) return;

  const socket = io(RELAY_URL, {
    // The collector is a background service: never let a transient outage turn
    // into a permanent silent stop. socket.io reconnects with backoff on its
    // own, and `join-room` is re-sent from the connect handler below.
    reconnection: true,
    reconnectionAttempts: Infinity,
    transports: ["websocket", "polling"],
  });

  const entry: GroupSocket = { socket, groupCode, sessionId: null };
  sockets.set(groupCode, entry);

  socket.on("connect", () => {
    log(`socket connected for ${groupCode}, joining as observer`);
    socket.emit(
      "join-room",
      { groupCode, instanceId, observer: true },
      (ack: JoinedAck) => {
        if (!ack?.success) {
          log(`join-room rejected for ${groupCode}: ${ack?.code ?? "unknown"} ${ack?.message ?? ""}`);
          return;
        }

        const pinned = getMembership(groupCode)?.session_id ?? null;
        const reported = ack.sessionId ?? null;

        // Invariant 3. A code that resolves to a different session is no longer
        // ours - it has been handed to a different pair of developers.
        if (pinned && reported && pinned !== reported) {
          log(
            `ABORT ${groupCode}: code was recycled (pinned ${pinned}, relay now reports ${reported}). ` +
              `Deactivating so another team's session is never archived locally.`
          );
          deactivateMembership(groupCode);
          closeGroupSocket(groupCode);
          return;
        }

        if (!pinned && reported) {
          pinMembershipSession(groupCode, reported);
        }
        entry.sessionId = reported;

        log(`observing ${groupCode} (session ${reported ?? "unknown"})`);
      }
    );
  });

  socket.on("group-message", (message: RelayMessage) => {
    // Guard against a late frame from a room we have already been evicted from.
    if (!sockets.has(groupCode)) return;
    void archive(message);
  });

  socket.on("group-error", ({ code, message }: { code: string; message: string }) => {
    if (code === "NOT_A_MEMBER") {
      // The relay no longer recognises this machine as a seat holder, so the
      // session ended or expired. Stop listening rather than retrying forever.
      log(`no longer a member of ${groupCode} (${message}) - closing socket`);
      deactivateMembership(groupCode);
      closeGroupSocket(groupCode);
      return;
    }
    log(`group-error for ${groupCode}: ${code} ${message}`);
  });

  socket.on("connect_error", (error: Error) => {
    log(`connect_error for ${groupCode}: ${error.message}`);
  });

  socket.on("disconnect", (reason: string) => {
    log(`socket disconnected for ${groupCode}: ${reason}`);
  });
}

export function closeGroupSocket(groupCode: string) {
  const entry = sockets.get(groupCode);
  if (!entry) return;
  sockets.delete(groupCode);
  entry.socket.removeAllListeners();
  entry.socket.disconnect();
  log(`stopped observing ${groupCode}`);
}

/** Called when the dashboard reports this machine joined a group. */
export function startObservingGroup(groupCode: string) {
  const code = groupCode.trim().toUpperCase();
  if (sockets.has(code)) return;
  openGroupSocket(code, getOrCreateInstance().instance_id);
}

/** Called when the dashboard reports a leave, or the session ended remotely. */
export function stopObservingGroup(groupCode: string) {
  closeGroupSocket(groupCode.trim().toUpperCase());
}

/**
 * Re-open sockets for every membership still marked active.
 *
 * This is what makes the archiver survive a collector restart: the dashboard
 * does not re-announce a group that was joined before the restart, so without
 * this the permanent record would quietly stop updating.
 */
export function resumeActiveMemberships() {
  const active = listActiveMemberships();
  if (active.length === 0) {
    log("no active memberships - nothing to observe");
    return;
  }
  const instanceId = getOrCreateInstance().instance_id;
  log(`resuming ${active.length} active membership(s) at ${RELAY_URL}`);
  for (const record of active) {
    openGroupSocket(record.group_code, instanceId);
  }
}

export function observingGroups(): string[] {
  return [...sockets.keys()];
}

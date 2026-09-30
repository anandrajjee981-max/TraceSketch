import type { Server, Socket } from "socket.io";
import { getGroupRole } from "../dao/group.dao.js";

type Ack = (response: unknown) => void;

const MAX_CRAZY_LENGTH = 4000;

/**
 * Ephemeral ("crazy") message path — a completely separate code path from the
 * persisted message flow in group.socket.ts.
 *
 * INVARIANT: this module must never import a message DAO, a Mongoose model, or
 * anything else capable of writing. It is registered through its own
 * `io.on("connection")` listener rather than sharing the handler in
 * group.socket.ts, so there is no shared branch, flag, or code path between the
 * two. Persisting a crazy message would require deliberately adding a write
 * import to this file — a future refactor of the message DAO cannot cause it.
 *
 * The single Mongo call below is getGroupRole(), a read-only seat check. It is
 * required, not optional: a 4-character group code is a lookup key, not a
 * credential, so membership is confirmed against the groups collection before
 * anything is broadcast.
 */
export function registerCrazyMessageSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "crazy-message",
      async (
        payload: { groupCode?: string; instanceId?: string; text?: string },
        ack?: Ack,
      ) => {
        const groupCode = payload?.groupCode?.trim().toUpperCase();
        const instanceId = payload?.instanceId?.trim();
        const text = payload?.text?.trim();

        // Errors go to the sending socket only — never broadcast, never stored.
        const fail = (code: string, message: string) => {
          ack?.({ success: false, code, message });
          socket.emit("crazy-message-error", { code, message });
        };

        if (!groupCode || !instanceId) {
          return fail("BAD_REQUEST", "groupCode and instanceId are required");
        }

        if (!text) {
          return fail("BAD_REQUEST", "text is required");
        }

        if (text.length > MAX_CRAZY_LENGTH) {
          return fail("TOO_LONG", `Message too long (max ${MAX_CRAZY_LENGTH} characters)`);
        }

        try {
          const role = await getGroupRole(groupCode, instanceId);

          if (!role) {
            return fail("NOT_A_MEMBER", "You are not a member of this group");
          }

          // Ephemeral by construction: the payload is assembled in memory and is
          // unreachable the moment this handler returns.
          io.to(groupCode).emit("crazy-message", {
            instanceId,
            text,
            sentAt: Date.now(),
          });

          ack?.({ success: true });
        } catch (error) {
          console.error("crazy-message error:", error);
          fail("INTERNAL_ERROR", "Failed to send message");
        }
      },
    );
  });
}

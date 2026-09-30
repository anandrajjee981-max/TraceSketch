import type { Server, Socket } from "socket.io";
import { getGroupRole, type GroupRole } from "../dao/group.dao.js";
import { addMessage } from "../dao/group-message.dao.js";

type Ack = (response: unknown) => void;

declare module "socket.io" {
  interface SocketData {
    groupCode?: string;
    instanceId?: string;
    role?: GroupRole;
  }
}

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Every socket starts unauthenticated. It only becomes a room member after the
 * relay has confirmed against Mongo that this instanceId actually holds a seat
 * in that group - knowing the 4-character code is not enough, because the code
 * space is tiny and codes are shared out loud.
 */
export function registerGroupSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.data.groupCode = undefined;
    socket.data.instanceId = undefined;
    socket.data.role = undefined;

    console.log("Socket connected:", socket.id);

    socket.on(
      "join-room",
      async (payload: { groupCode?: string; instanceId?: string }, ack?: Ack) => {
        const groupCode = payload?.groupCode?.trim().toUpperCase();
        const instanceId = payload?.instanceId?.trim();

        const fail = (message: string, code: string) => {
          ack?.({ success: false, code, message });
          socket.emit("group-error", { code, message });
        };

        if (!groupCode || !instanceId) {
          return fail("groupCode and instanceId are required", "BAD_REQUEST");
        }

        try {
          const role = await getGroupRole(groupCode, instanceId);

          if (!role) {
            return fail(
              "No session found for this code and instance id",
              "NOT_A_MEMBER",
            );
          }

          // A socket belongs to exactly one room. Re-joining with different
          // credentials must not leave it subscribed to the old one.
          if (socket.data.groupCode && socket.data.groupCode !== groupCode) {
            await socket.leave(socket.data.groupCode);
            socket.to(socket.data.groupCode).emit("peer-left", { instanceId: socket.data.instanceId });
          }

          socket.data.groupCode = groupCode;
          socket.data.instanceId = instanceId;
          socket.data.role = role;
          await socket.join(groupCode);

          console.log(`Socket ${socket.id} joined room ${groupCode} as ${role}`);

          socket.emit("joined", { groupCode, instanceId, role });
          socket.to(groupCode).emit("user-joined", { instanceId, role });

          ack?.({ success: true, groupCode, instanceId, role });
        } catch (error) {
          console.error("join-room error:", error);
          return fail("Failed to join room", "INTERNAL_ERROR");
        }
      },
    );

    socket.on(
      "group-message",
      async (payload: { summaryText?: string; type?: string }, ack?: Ack) => {
        const { groupCode, instanceId } = socket.data;
        const summaryText = payload?.summaryText?.trim();
        const type = payload?.type ?? "note";

        if (!groupCode || !instanceId) {
          const message = "Join a group before sending messages";
          ack?.({ success: false, code: "NOT_JOINED", message });
          return;
        }

        if (!summaryText) {
          const message = "summaryText is required";
          ack?.({ success: false, code: "BAD_REQUEST", message });
          return;
        }

        if (summaryText.length > MAX_MESSAGE_LENGTH) {
          const message = `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`;
          ack?.({ success: false, code: "TOO_LONG", message });
          return;
        }

        try {
          // groupCode and instanceId come from the verified session, never from
          // the client, so a socket cannot post into a room it does not own.
          // addMessage() re-validates `type` against the persisted set, so an
          // ephemeral type can never be written through this path either.
          const result = await addMessage(groupCode, instanceId, summaryText, type);

          if (!result.ok) {
            const message =
              result.reason === "not_found"
                ? "Group not found or expired"
                : result.reason === "forbidden"
                  ? "You are not a member of this group"
                  : "type must be one of: note, trace_share, replay_result";
            ack?.({ success: false, code: result.reason.toUpperCase(), message });
            return;
          }

          io.to(groupCode).emit("group-message", result.message);
          ack?.({ success: true, message: result.message });
        } catch (error) {
          console.error("group-message error:", error);
          ack?.({ success: false, code: "INTERNAL_ERROR", message: "Failed to send message" });
        }
      },
    );

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, "-", reason);
      if (socket.data.groupCode) {
        socket
          .to(socket.data.groupCode)
          .emit("peer-left", { instanceId: socket.data.instanceId });
      }
    });
  });
}

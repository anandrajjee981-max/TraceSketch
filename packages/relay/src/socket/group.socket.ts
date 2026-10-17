import type { Server, Socket } from "socket.io";
import { getGroupSession, type GroupSession } from "../dao/group.dao.js";
import { addMessage } from "../dao/group-message.dao.js";
import { recordHistory, type HistoryEntryType } from "../dao/group-history.dao.js";

type Ack = (response: unknown) => void;

declare module "socket.io" {
  interface SocketData {
    groupCode?: string;
    instanceId?: string;
    role?: GroupSession["role"];
    observer?: boolean;
    sessionId?: string;
  }
}

const MAX_MESSAGE_LENGTH = 4000;
const JOIN_TIMEOUT_MS = 10_000;

export function registerGroupSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {

    socket.data.groupCode = undefined;
    socket.data.instanceId = undefined;
    socket.data.role = undefined;
    socket.data.observer = false;
    socket.data.sessionId = undefined;

    // Join timeout: disconnect sockets that never join a room.
    const joinTimer = setTimeout(() => {
      if (!socket.data.groupCode) {
        socket.disconnect(true);
      }
    }, JOIN_TIMEOUT_MS);

    console.log("Socket connected:", socket.id);

    socket.on(
      "join-room",
      async (
        payload: { groupCode?: string; instanceId?: string; observer?: boolean },
        ack?: Ack,
      ) => {
        const groupCode = payload?.groupCode?.trim().toUpperCase();
        const instanceId = payload?.instanceId?.trim();
        const observer = payload?.observer === true;

        const fail = (message: string, code: string) => {
          ack?.({ success: false, code, message });
          socket.emit("group-error", { code, message });
        };

        if (!groupCode || !instanceId) {
          return fail("groupCode and instanceId are required", "BAD_REQUEST");
        }

        try {
          const session = await getGroupSession(groupCode, instanceId);

          if (!session) {
            return fail(
              "No session found for this code and instance id",
              "NOT_A_MEMBER",
            );
          }

          // A socket belongs to exactly one room. Re-joining with different
          // credentials leaves the old room first.
          if (socket.data.groupCode && socket.data.groupCode !== groupCode) {
            await socket.leave(socket.data.groupCode);
            if (!socket.data.observer) {
              socket.to(socket.data.groupCode).emit("peer-left", { instanceId: socket.data.instanceId });
            }
          }

          socket.data.groupCode = groupCode;
          socket.data.instanceId = instanceId;
          socket.data.role = session.role;
          socket.data.observer = observer;
          socket.data.sessionId = session.sessionId;
          await socket.join(groupCode);

          // Auth succeeded and room joined - cancel the disconnect timer.
          clearTimeout(joinTimer);

          console.log(
            `Socket ${socket.id} joined room ${groupCode} as ${session.role}${observer ? " (observer)" : ""}`,
          );

          socket.emit("joined", {
            groupCode,
            instanceId,
            role: session.role,
            sessionId: session.sessionId,
            observer,
          });
          if (!observer) {
            socket.to(groupCode).emit("user-joined", { instanceId, role: session.role });
          }

          ack?.({
            success: true,
            groupCode,
            instanceId,
            role: session.role,
            sessionId: session.sessionId,
            observer,
          });
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
          try {
            await recordHistory(
              groupCode,
              instanceId,
              result.message.type as HistoryEntryType,
              null,
              summaryText,
            );
          } catch (err) {
            console.error("recordHistory failed for", groupCode, err);
          }
          ack?.({ success: true, message: result.message });
        } catch (error) {
          console.error("group-message error:", error);
          ack?.({ success: false, code: "INTERNAL_ERROR", message: "Failed to send message" });
        }
      },
    );

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, "-", reason);
      if (socket.data.groupCode && !socket.data.observer) {
        socket
          .to(socket.data.groupCode)
          .emit("peer-left", { instanceId: socket.data.instanceId });
      }
    });
  });
}

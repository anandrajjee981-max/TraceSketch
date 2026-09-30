import { findGroupByCode } from "./group.dao.js";
import groupMessageModel from "../models/group-message.model.js";

export type MessageType = "note" | "trace_share" | "replay_result";

export type StoredMessage = {
  id: string;
  groupCode: string;
  instanceId: string;
  summaryText: string;
  type: MessageType;
  createdAt: Date;
};

export type MessageResult =
  | { ok: true; message: StoredMessage }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid_type" };

export function isValidMessageType(value: unknown): value is MessageType {
  return value === "note" || value === "trace_share" || value === "replay_result";
}

export async function addMessage(
  groupCode: string,
  instanceId: string,
  summaryText: string,
  type: unknown,
): Promise<MessageResult> {
  if (!isValidMessageType(type)) {
    return { ok: false, reason: "invalid_type" };
  }

  const group = await findGroupByCode(groupCode);

  if (!group) {
    return { ok: false, reason: "not_found" };
  }

  const isMember =
    group.creatorInstanceId === instanceId || group.joinerInstanceId === instanceId;

  if (!isMember) {
    return { ok: false, reason: "forbidden" };
  }

  const saved = await groupMessageModel.create({
    group: group._id,
    instanceId,
    summaryText,
    type,
  });

  return {
    ok: true,
    message: {
      id: saved._id.toString(),
      groupCode,
      instanceId,
      summaryText: saved.summaryText,
      type,
      createdAt: saved.createdAt,
    },
  };
}

export async function getMessages(groupCode: string): Promise<StoredMessage[] | null> {
  const group = await findGroupByCode(groupCode);

  if (!group) {
    return null;
  }

  const docs = await groupMessageModel
    .find({ group: group._id })
    .sort({ createdAt: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    groupCode,
    instanceId: doc.instanceId,
    summaryText: doc.summaryText,
    type: doc.type as MessageType,
    createdAt: doc.createdAt,
  }));
}

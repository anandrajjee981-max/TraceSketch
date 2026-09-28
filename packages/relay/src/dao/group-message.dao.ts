import { findGroupByCode } from "./group.dao";
import groupMessageModel from "../models/group-message.model";

export async function addMessage(
  groupCode: string,
  instanceId: string,
  summaryText: string
): Promise<'not_found' | 'forbidden' | true> {
  const group = await findGroupByCode(groupCode);

  if (!group) {
    return 'not_found';
  }

  const isMember =
    group.creatorInstanceId === instanceId || group.joinerInstanceId === instanceId;

  if (!isMember) {
    return 'forbidden';
  }

  await groupMessageModel.create({
    group: group._id,
    instanceId,
    summaryText
  });

  return true;
}

export async function getMessages(groupCode: string): Promise<any[] | null> {
  const group = await findGroupByCode(groupCode);

  if (!group) {
    return null;
  }

  return groupMessageModel.find({ group: group._id }).sort({ createdAt: 1 });
}

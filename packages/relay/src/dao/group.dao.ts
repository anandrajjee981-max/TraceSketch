import groupmodel from "../models/group.model.js";
import { randomInt } from "node:crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 excluded
const CODE_LENGTH = 4;

function generateSecureCode(length: number = CODE_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARSET.charAt(randomInt(0, CHARSET.length));
  }
  return result;
}

async function isCodeTaken(code: string): Promise<boolean> {
  const existing = await groupmodel.findOne({ groupCode: code }).lean();
  return !!existing;
}

export async function getUniqueSecureCode(): Promise<string> {
  let code: string;
  do {
    code = generateSecureCode(CODE_LENGTH);
  } while (await isCodeTaken(code));
  // Yahan koi manual "reserve" nahi karna - jab createGroup() ye code
  // save karega DB mein, wahi asli reservation ban jayega.
  // MongoDB ka TTL khud handle karega expiry - koi extra cleanup nahi chahiye.
  return code;
}

export async function isInstanceInActiveSession(instanceId: string): Promise<boolean> {
  const existing = await groupmodel
    .findOne({
      $or: [{ creatorInstanceId: instanceId }, { joinerInstanceId: instanceId }],
    })
    .lean();
  return !!existing;
}

export async function getGroupByInstanceId(instanceId: string): Promise<{ groupCode: string } | null> {
  const existing = await groupmodel
    .findOne({
      $or: [{ creatorInstanceId: instanceId }, { joinerInstanceId: instanceId }],
    })
    .lean();
  if (!existing) return null;
  return { groupCode: existing.groupCode };
}

export type LeaveOutcome = "joiner_left" | "creator_left" | "not_found" | "not_member";

/**
 * Release only the caller's own seat.
 *
 * This used to `findOneAndDelete` the whole Group document, which meant a
 * joiner leaving tore down the creator's session as well: the creator's next
 * `/session` lookup 404'd, re-joining the same code reported "group not found
 * or has expired", and neither peer could post again.
 *
 * Both steps are single atomic operations so two simultaneous departures
 * cannot both claim the same outcome.
 */
export async function leaveGroup(groupCode: string, instanceId: string): Promise<LeaveOutcome> {
  // Joiner frees the seat. The group survives, so the same code can be joined
  // again and the creator keeps working.
  const freed = await groupmodel.findOneAndUpdate(
    { groupCode, joinerInstanceId: instanceId },
    { $set: { joinerInstanceId: null } },
    { new: true },
  );
  if (freed) return "joiner_left";

  // Creator ends the session. It is a two-seat session the creator owns, so
  // this necessarily tears it down for both peers.
  const tornDown = await groupmodel.findOneAndDelete({ groupCode, creatorInstanceId: instanceId });
  if (tornDown) return "creator_left";

  const stillThere = await groupmodel.findOne({ groupCode }).lean();
  return stillThere ? "not_member" : "not_found";
}

export async function createGroup(creatorInstanceId: string): Promise<string> {
  // Retry loop: two creators can roll the same 4-char code in the same
  // millisecond. The unique index is the real reservation, so on a duplicate
  // key we simply roll again instead of failing the request.
  for (let attempt = 0; attempt < 5; attempt++) {
    const groupCode = await getUniqueSecureCode();
    try {
      await groupmodel.create({ groupCode, creatorInstanceId, joinerInstanceId: null });
      return groupCode;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) continue;
      throw err;
    }
  }
  throw new Error("Could not allocate a unique group code. Please retry.");
}

export type JoinFailure =
  | "not_found"
  | "already_full"
  | "own_group"
  | "already_in_session";

export type JoinResult =
  | { success: true; groupCode: string; message: string }
  | { success: false; reason: JoinFailure; message: string };

export async function joinGroup(
  groupCode: string,
  joinerInstanceId: string,
): Promise<JoinResult> {
  // Single atomic claim. A plain find-then-save lets two joiners both pass the
  // "is it full?" check and then both write, silently overfilling the room.
  const group = await groupmodel
    .findOneAndUpdate(
      { groupCode, joinerInstanceId: null },
      { $set: { joinerInstanceId } },
      { new: true },
    )
    .lean();

  if (group) return { success: true, groupCode, message: "Joined successfully" };

  // Claim failed - work out exactly why so the caller gets a useful message.
  const existing = await groupmodel.findOne({ groupCode }).lean();
  if (!existing) {
    return { success: false, reason: "not_found", message: "Group not found or has expired" };
  }
  if (existing.creatorInstanceId === joinerInstanceId) {
    return { success: false, reason: "own_group", message: "You cannot join your own group" };
  }
  if (existing.joinerInstanceId) {
    return { success: false, reason: "already_full", message: "This group is already full" };
  }
  return { success: false, reason: "already_in_session", message: "You are already in a session" };
}

export async function checkGroup(groupCode: string): Promise<boolean> {
  const group = await groupmodel.findOne({ groupCode }).lean();
  return !!group;
}

export async function findGroupByCode(groupCode: string) {
  return groupmodel.findOne({ groupCode }).lean();
}

export type GroupRole = "creator" | "joiner";

/**
 * Authoritative membership check for the socket layer. A socket must never be
 * able to enter a room or broadcast into it just because it knows a 4-char
 * code - the code is only 32^4 combinations, so it is a lookup key, not a
 * credential. The instanceId must match a seat already claimed in Mongo.
 */
export async function getGroupRole(
  groupCode: string,
  instanceId: string,
): Promise<GroupRole | null> {
  const group = await groupmodel.findOne({ groupCode }).lean();
  if (!group) return null;
  if (group.creatorInstanceId === instanceId) return "creator";
  if (group.joinerInstanceId === instanceId) return "joiner";
  return null;
}

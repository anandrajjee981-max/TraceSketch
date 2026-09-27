import groupmodel from "../models/group.model";
import { randomInt } from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I, O, 0, 1 excluded

function generateSecureCode(length: number = 4): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET.charAt(randomInt(0, CHARSET.length));
  }
  return result;
}

async function isCodeTaken(code: string): Promise<boolean> {
  const existing = await groupmodel.findOne({ groupCode: code });
  return !!existing;
}

export async function getUniqueSecureCode(): Promise<string> {
  let code: string;
  do {
    code = generateSecureCode(4);
  } while (await isCodeTaken(code));
  // Yahan koi manual "reserve" nahi karna - jab createGroup() ye code
  // save karega DB mein, wahi asli reservation ban jayega.
  // MongoDB ka TTL khud handle karega expiry - koi extra cleanup nahi chahiye.
  return code;
}

export async function isInstanceInActiveSession(instanceId: string): Promise<boolean> {
  const existing = await groupmodel.findOne({
    $or: [
      { creatorInstanceId: instanceId },
      { joinerInstanceId: instanceId }
    ]
  });
  return !!existing;
}

export async function createGroup(creatorInstanceId: string): Promise<string> {
  const groupCode = await getUniqueSecureCode();
  await groupmodel.create({
    groupCode,
    creatorInstanceId,
    joinerInstanceId: null,
    summaryText: ""
  });
  return groupCode;
}

export async function joinGroup(groupCode: string, joinerInstanceId: string): Promise<{ success: boolean; message: string }> {
  const group = await groupmodel.findOne({ groupCode });

  if (!group) {
    return { success: false, message: "Group not found or has expired" };
  }

  if (group.joinerInstanceId) {
    return { success: false, message: "This group is already full" };
  }

  if (group.creatorInstanceId === joinerInstanceId) {
    return { success: false, message: "You cannot join your own group" };
  }

  group.joinerInstanceId = joinerInstanceId;
  await group.save();

  return { success: true, message: "Joined successfully" };
}
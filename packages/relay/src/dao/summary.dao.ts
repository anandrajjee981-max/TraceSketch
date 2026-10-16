import groupModel from "../models/group.model";
import summaryModel from "../models/summary.model";

export async function createSummary(
  instanceId: string,
  message: string,
  groupCode: string
) {
  const group = await groupModel.findOne({
    groupCode,
    $or: [
      { creatorInstanceId: instanceId },
      { joinerInstanceId: instanceId }
    ]
  });

  if (!group) {
    throw new Error("Group not found for the given instance ID.");
  }

  return summaryModel.create({
    group: group._id,
    instanceId,
    message
  });
}

export async function getSummaries(groupCode: string) {
  const group = await groupModel.findOne({ groupCode });

  if (!group) {
    return null;
  }

  return summaryModel.find({ group: group._id }).sort({ createdAt: 1 });
}

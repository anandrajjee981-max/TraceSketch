import groupmodel from "../models/group.model.js";
import groupSummaryModel from "../models/group-summary.model.js";

export async function addSummaryEntry(
  groupCode: string,
  instanceId: string,
  summaryText: string
): Promise<boolean> {
  const group = await groupmodel.findOne({ groupCode });

  if (!group) {
    return false;
  }

  await groupSummaryModel.create({
    groupCode,
    instanceId,
    summaryText
  });

  return true;
}

export async function getSummaryEntries(groupCode: string): Promise<any[]> {
  return groupSummaryModel.find({ groupCode }).sort({ createdAt: 1 });
}

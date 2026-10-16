import { Request, Response } from "express";
import { checkGroup } from "../dao/group.dao.js";
import { getSummaries , createSummary } from "../dao/summary.dao.js";

export async function createSummaryController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { summary, message, instanceId, instanceid } = req.body;
    const memberInstanceId = instanceId ?? instanceid;
    const summaryMessage = message ?? summary;

    if (!memberInstanceId || typeof summaryMessage !== "string" || !summaryMessage.trim()) {
      return res.status(400).json({
        message: "instanceId and message are required"
      });
    }

    if (!(await checkGroup(groupCode))) {
      return res.status(404).json({ message: "Group not found" });
    }

    const result = await createSummary(memberInstanceId, summaryMessage, groupCode);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSummaryController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const result = await getSummaries(groupCode);

    if (result === null) {
      return res.status(404).json({ message: "Group not found" });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

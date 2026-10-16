import { Request, Response } from "express";
import { findGroupByCode } from "../dao/group.dao";
import { addSummaryEntry, getSummaryEntries } from "../dao/group-summary.dao";

export async function addSummaryEntryController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { instanceId, summaryText } = req.body;

    if (!instanceId || !summaryText) {
      return res.status(400).json({ message: "instanceId and summaryText are required" });
    }

    const group = await findGroupByCode(groupCode);

    if (!group) {
      return res.status(404).json({ message: "group not found or expired" });
    }

    const isMember =
      group.creatorInstanceId === instanceId || group.joinerInstanceId === instanceId;

    if (!isMember) {
      return res.status(403).json({ message: "you are not a member of this group" });
    }

    const added = await addSummaryEntry(groupCode, instanceId, summaryText);

    if (!added) {
      return res.status(500).json({ message: "internal server error" });
    }

    return res.status(201).json({ message: "summary added" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function getSummaryEntriesController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;

    const group = await findGroupByCode(groupCode);

    if (!group) {
      return res.status(404).json({ message: "group not found or expired" });
    }

    const entries = await getSummaryEntries(groupCode);

    return res.status(200).json({ message: "summary entries fetched", entries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
}

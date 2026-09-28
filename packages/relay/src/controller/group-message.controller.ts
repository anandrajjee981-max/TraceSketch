import { Request, Response } from "express";
import { addMessage, getMessages } from "../dao/group-message.dao";

export async function addMessageController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { instanceId, summaryText } = req.body;

    if (!instanceId || !summaryText) {
      return res.status(400).json({ message: "instanceId and summaryText are required" });
    }

    const result = await addMessage(groupCode, instanceId, summaryText);

    if (result === 'not_found') {
      return res.status(404).json({ message: "group not found or expired" });
    }

    if (result === 'forbidden') {
      return res.status(403).json({ message: "you are not a member of this group" });
    }

    return res.status(201).json({ message: "message added" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function getMessagesController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;

    const messages = await getMessages(groupCode);

    if (messages === null) {
      return res.status(404).json({ message: "group not found or expired" });
    }

    return res.status(200).json({ message: "messages fetched", messages });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal server error" });
  }
}

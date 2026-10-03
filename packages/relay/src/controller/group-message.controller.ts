import { Request, Response } from "express";
import { addMessage, getMessages, isValidMessageType } from "../dao/group-message.dao.js";
import { recordHistory } from "../dao/group-history.dao.js";

export async function addMessageController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { instanceId, summaryText, type } = req.body;
    const io = req.app.get("io");

    if (!instanceId || !summaryText) {
      return res.status(400).json({ message: "instanceId and summaryText are required" });
    }

    if (!isValidMessageType(type)) {
      return res.status(400).json({
        message: "type is required and must be one of: note, trace_share, replay_result",
      });
    }

    const result = await addMessage(groupCode, instanceId, summaryText, type);

    if (!result.ok) {
      if (result.reason === "not_found") {
        return res.status(404).json({ message: "group not found or expired" });
      }
      if (result.reason === "forbidden") {
        return res.status(403).json({ message: "you are not a member of this group" });
      }
      return res.status(400).json({
        message: "type must be one of: note, trace_share, replay_result",
      });
    }

    if (io) {
      io.to(groupCode).emit("group-message", result.message);
    }

    // Durable shared history. Written here, server-side, rather than by the
    // sender's browser: a browser write can only reach its own machine's
    // collector, so the peer would never see it. Writing from the relay is what
    // makes one entry visible to both sides — and it outlives the 6h TTL on
    // GroupMessage, which is what History reads once the session is gone.
    //
    // Every persisted type is archived, notes included, so the History tab can
    // replay the whole conversation and not just the shared traces.
    //
    // Never let a history failure lose an accepted message: the live feed has
    // already been broadcast by this point.
    try {
      await recordHistory(groupCode, instanceId, type, null, summaryText);
    } catch (err) {
      console.error("recordHistory failed for", groupCode, err);
    }

    return res.status(201).json({ message: "message added", data: result.message });
  } catch (err) {
    console.error("addMessageController error:", err);
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
    console.error("getMessagesController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

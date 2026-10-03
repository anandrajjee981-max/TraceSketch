import { Request, Response } from "express";
import { createGroup, joinGroup, isInstanceInActiveSession, leaveGroup, getGroupByInstanceId } from "../dao/group.dao.js";

export async function getSessionController(req: Request, res: Response) {
  try {
    const { instanceId } = req.params as { instanceId: string };
    if (!instanceId) return res.status(400).json({ message: "instanceId is required" });

    const session = await getGroupByInstanceId(instanceId);
    if (!session) return res.status(404).json({ message: "No active session" });

    return res.status(200).json({ groupCode: session.groupCode });
  } catch (err) {
    console.error("getSessionController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function leaveGroupController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { instanceId } = req.body;

    if (!instanceId) {
      return res.status(400).json({ message: "instanceId is required" });
    }

    const outcome = await leaveGroup(groupCode, instanceId);

    if (outcome === "not_found") {
      return res.status(404).json({ message: "group not found or expired" });
    }
    if (outcome === "not_member") {
      return res.status(403).json({ message: "you are not a member of this group" });
    }

    const io = req.app.get("io");

    if (outcome === "creator_left") {
      // The session is gone for both peers, so say so explicitly instead of
      // letting the remaining peer sit in a dead room.
      io?.to(groupCode).emit("session-ended", { instanceId, reason: "creator_left" });
    } else {
      // Seat freed, group still alive: the peer may be replaced by a new joiner.
      io?.to(groupCode).emit("peer-left", { instanceId });
    }

    return res.status(200).json({ message: "Left group", outcome });
  } catch (err) {
    console.error("leaveGroupController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function createGroupController(req: Request, res: Response) {
  try {
    const { creatorInstanceId } = req.body;

    if (!creatorInstanceId) {
      return res.status(400).json({ message: "creatorInstanceId is required" });
    }

    const alreadyActive = await isInstanceInActiveSession(creatorInstanceId);
    if (alreadyActive) {
      return res
        .status(409)
        .json({ message: "You already have an active session. Leave it before creating a new one." });
    }

    const groupCode = await createGroup(creatorInstanceId);

    return res.status(201).json({ message: "Group created", groupCode });
  } catch (err) {
    console.error("createGroupController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function joinGroupController(req: Request, res: Response) {
  try {
    const { groupCode, joinerInstanceId } = req.body;

    // 1. Validation
    if (!groupCode || !joinerInstanceId) {
      return res
        .status(400)
        .json({ message: "groupCode and joinerInstanceId are required" });
    }

    // 2. Check active session
    const alreadyActive = await isInstanceInActiveSession(joinerInstanceId);
    if (alreadyActive) {
      return res
        .status(409)
        .json({ message: "You already have an active session. Leave it before joining another." });
    }

    // 3. Database operation (atomic claim of the joiner seat)
    const result = await joinGroup(groupCode, joinerInstanceId);
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    // 4. Broadcast so the creator's socket learns a peer is ready.
    const io = req.app.get("io");
    if (io) {
      io.to(groupCode).emit("user-joined", { joinerInstanceId });
    }

    // 5. Send HTTP Response
    return res.status(200).json({ message: result.message, groupCode });
  } catch (err) {
    console.error("joinGroupController error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

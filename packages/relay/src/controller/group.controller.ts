import { Request, Response } from "express";
import { createGroup, joinGroup, isInstanceInActiveSession } from "../dao/group.dao";
import server from "server";

export async function createGroupController(req: Request, res: Response) {
  try {
    const { creatorInstanceId } = req.body;

    if (!creatorInstanceId) {
      return res.status(400).json({ message: "creatorInstanceId is required" });
    }

    const alreadyActive = await isInstanceInActiveSession(creatorInstanceId);
    if (alreadyActive) {
      return res.status(409).json({ message: "You already have an active session. Leave it before creating a new one." });
    }

    const groupCode = await createGroup(creatorInstanceId); 

    res.status(201).json({ message: "Group created", groupCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}

export async function joinGroupController(req: Request, res: Response) {
  try {
    const { groupCode, joinerInstanceId } = req.body;

    // 1. Validation
    if (!groupCode || !joinerInstanceId) {
      return res.status(400).json({ 
        message: "groupCode and joinerInstanceId are required" 
      });
    }

    // 2. Check active session
    const alreadyActive = await isInstanceInActiveSession(joinerInstanceId);
    if (alreadyActive) {
      return res.status(409).json({ 
        message: "You already have an active session. Leave it before joining another." 
      });
    }

    // 3. Database operation
    const result = await joinGroup(groupCode, joinerInstanceId);
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    // 4. (Optional) Broadcast socket event to room to notify connected clients
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
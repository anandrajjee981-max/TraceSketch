import groupmodel from "../models/group.model.js";
import jwt from "jsonwebtoken";
import { Config } from "../config/config.js";

export async function verifyme(req: any, res: any, next: any) {
  try {
    const rawHeader = req.headers?.authorization;
    const token =
      req.cookies?.token ||
      (typeof rawHeader === "string" ? rawHeader.replace(/^Bearer\s+/i, "").trim() : undefined) ||
      req.headers?.["x-token"];

    if (token) {
      try {
        const decoded: any = jwt.verify(token, Config.JWT_SECRET);
        const id = decoded?.instanceId;
        if (id) {
          req.instanceId = id;
          return next();
        }
      } catch {
        // Token invalid or expired; fallback to membership check
      }
    }

    // Fallback: check instanceId against the group's active members
    const groupCode = (req.params?.code as string)?.trim().toUpperCase();
    const instanceId =
      req.body?.instanceId?.trim() ||
      req.query?.instanceId?.trim() ||
      req.headers?.["x-instance-id"];

    if (groupCode && instanceId) {
      const group = await groupmodel.findOne({
        groupCode,
        $or: [{ creatorInstanceId: instanceId }, { joinerInstanceId: instanceId }],
      });
      if (group) {
        req.instanceId = instanceId;
        return next();
      }
    }

    if (instanceId) {
      const group = await groupmodel.findOne({
        $or: [{ creatorInstanceId: instanceId }, { joinerInstanceId: instanceId }],
      });
      if (group) {
        req.instanceId = instanceId;
        return next();
      }
    }

    return res.status(401).json({ message: "Unauthorized: Invalid or missing token/credentials" });
  } catch (err) {
    console.error("verifyme error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

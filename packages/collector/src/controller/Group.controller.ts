import { Request, Response } from "express";
import { insertHistory, insertData, dropData } from "../dao/Group";

export async function insertHistoryController(req: Request, res: Response) {
  try {
    const { group_code, instance_id, entry_type } = req.body;

    if (!group_code || !instance_id || !entry_type) {
      return res.status(400).json({ error: "Missing required fields: group_code, instance_id, entry_type" });
    }

    const result = await insertHistory(group_code, instance_id, entry_type);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

export async function insertDataController(req: Request, res: Response) {
  try {
    const { group_code, instance_id, entry_type, trace_id, data } = req.body;

    if (!group_code || !instance_id || !entry_type) {
      return res.status(400).json({ error: "Missing required fields: group_code, instance_id, entry_type" });
    }

    const result = await insertData(group_code, instance_id, entry_type, trace_id, data);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

export async function dropDataController(req: Request, res: Response) {
  try {
    const { group_code } = req.params as { group_code: string };

    if (!group_code) {
      return res.status(400).json({ error: "Missing required field: group_code" });
    }

    const result = await dropData(group_code);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
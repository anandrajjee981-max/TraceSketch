import { Request, Response } from "express";
import {
  listGroupsForInstance,
  insertHistory,
  insertData,
  getHistory,
  dropData,
} from "../dao/Group";

export async function listGroupsController(req: Request, res: Response) {
  try {
    const { instance_id } = req.query as { instance_id?: string };

    if (!instance_id) {
      return res.status(400).json({ error: "Missing required query param: instance_id" });
    }

    const groups = await listGroupsForInstance(instance_id);
    return res.status(200).json({ instance_id, count: groups.length, groups });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

export async function insertHistoryController(req: Request, res: Response) {
  try {
    const { group_code, instance_id, entry_type } = req.body;

    if (!group_code || !instance_id || !entry_type) {
      return res.status(400).json({ error: "Missing required fields: group_code, instance_id, entry_type" });
    }

    const result = await insertHistory(group_code, instance_id, entry_type);
    // 200 (not 201) when the marker already existed, so re-entering a group is
    // observably a no-op rather than a fresh creation.
    return res.status(result.duplicate ? 200 : 201).json(result);
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

export async function getHistoryController(req: Request, res: Response) {
  try {
    const { group_code } = req.params as { group_code: string };

    if (!group_code) {
      return res.status(400).json({ error: "Missing required field: group_code" });
    }

    // Optional `?types=trace_share,replay_result` filter. Unset returns every row.
    const { types } = req.query as { types?: string };
    const entryTypes = types
      ? types.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const entries = await getHistory(group_code, entryTypes);
    return res.status(200).json({ group_code, count: entries.length, entries });
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

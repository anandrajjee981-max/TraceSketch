import { Request, Response } from "express";
import {
  listGroupsForInstance,
  insertHistory,
  insertData,
  getHistory,
  dropData,
  isLocalEntryType,
  LOCAL_ENTRY_TYPES,
  setMembershipActive,
} from "../dao/Group";
import { startObservingGroup, stopObservingGroup } from "../relay-archiver";

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
    const { group_code, instance_id, entry_type, trace_id, data, source_id } = req.body;

    if (!group_code || !instance_id || !entry_type) {
      return res.status(400).json({ error: "Missing required fields: group_code, instance_id, entry_type" });
    }

    // Don't trust the caller to have filtered this. The dashboard already
    // restricts itself to trace_share/replay_result, but the endpoint is
    // reachable by anything that can hit the collector, and "note"/"crazy" must
    // never enter the permanent local record. insertData() re-checks.
    if (!isLocalEntryType(entry_type)) {
      return res.status(400).json({
        error: `entry_type must be one of: ${LOCAL_ENTRY_TYPES.join(", ")}`,
      });
    }

    const result = await insertData(group_code, instance_id, entry_type, trace_id, data, source_id);
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

/**
 * Announce that this machine has joined (active: true) or left (active: false)
 * a group.
 *
 * This is the collector's only source of truth about membership - it has no way
 * to observe a browser joining a session on its own. The membership is persisted
 * so it survives a collector restart, and the archiver's socket is opened or
 * closed immediately so the local record keeps filling with no tab open.
 */
export async function setMembershipController(req: Request, res: Response) {
  try {
    const { group_code, active } = req.body;

    if (!group_code || typeof active !== "boolean") {
      return res.status(400).json({
        error: "group_code (string) and active (boolean) are required",
      });
    }

    const code = setMembershipActive(group_code, active);

    if (active) {
      startObservingGroup(code);
    } else {
      stopObservingGroup(code);
    }

    return res.status(200).json({ group_code: code, active, observing: active });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

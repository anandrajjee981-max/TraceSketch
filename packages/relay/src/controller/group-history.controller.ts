import { Request, Response } from "express";
import {
  getHistory,
  listGroupsForInstance,
  recordHistory,
  deleteHistoryForGroup,
  isHistoryEntryType,
  type HistoryEntryType,
} from "../dao/group-history.dao.js";

/**
 * DELETE /group/:code/history
 *
 * Lets a participant clear out an archived session they no longer want in their
 * list. Authorisation is a recorded history row for that instance — see
 * deleteHistoryForGroup for why the (by then usually expired) Group document
 * cannot be used instead.
 */
export async function deleteHistoryController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { instanceId } = req.body;

    if (!instanceId) {
      return res.status(400).json({ message: "instanceId is required" });
    }

    const result = await deleteHistoryForGroup(groupCode, instanceId);

    if (!result.ok) {
      return res.status(403).json({
        message: "You were not a participant in this group's history",
      });
    }

    return res.status(200).json({
      group_code: groupCode,
      deleted: result.deleted,
      message: `Deleted ${result.deleted} archived entr${result.deleted !== 1 ? "ies" : "y"}`,
    });
  } catch (err) {
    console.error("deleteHistoryController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

/**
 * POST /group/:code/history — record a membership marker.
 *
 * Only "joined" is accepted here. Shares are written by addMessageController
 * from the message itself, so a client cannot fabricate a share entry that no
 * peer ever received.
 */
export async function recordMarkerController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;
    const { instanceId } = req.body;

    if (!instanceId) {
      return res.status(400).json({ message: "instanceId is required" });
    }

    const result = await recordHistory(groupCode, instanceId, "joined");
    return res.status(result.duplicate ? 200 : 201).json({
      message: result.duplicate ? "Already recorded" : "History recorded successfully",
      duplicate: result.duplicate,
    });
  } catch (err) {
    console.error("recordMarkerController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

/**
 * GET /group/:code/history?types=trace_share,replay_result
 *
 * Reads do not require an active session: the Group document is gone once the
 * 6h TTL fires, and reading expired history is the entire purpose here.
 */
export async function getHistoryController(req: Request, res: Response) {
  try {
    const groupCode = req.params.code as string;

    const raw = req.query.types;
    const requested = typeof raw === "string" ? raw.split(",").map((t) => t.trim()) : [];
    const invalid = requested.filter((t) => t && !isHistoryEntryType(t));

    if (invalid.length) {
      return res.status(400).json({
        message: `invalid types: ${invalid.join(", ")}`,
      });
    }

    const types = requested.filter(Boolean) as HistoryEntryType[];
    const entries = await getHistory(groupCode, types.length ? types : undefined);

    return res.status(200).json({ group_code: groupCode, count: entries.length, entries });
  } catch (err) {
    console.error("getHistoryController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

/** GET /history/groups?instance_id=... — drives the navbar archive. */
export async function listJoinedGroupsController(req: Request, res: Response) {
  try {
    const { instance_id } = req.query as { instance_id?: string };

    if (!instance_id) {
      return res.status(400).json({ message: "instance_id is required" });
    }

    const groups = await listGroupsForInstance(instance_id);
    return res.status(200).json({ instance_id, count: groups.length, groups });
  } catch (err) {
    console.error("listJoinedGroupsController error:", err);
    return res.status(500).json({ message: "internal server error" });
  }
}

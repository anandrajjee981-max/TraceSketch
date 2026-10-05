import groupHistoryModel from "../models/group-history.model.js";

export type HistoryEntryType = "joined" | "note" | "trace_share" | "replay_result";

/** Wire shape shared with the dashboard's GroupHistoryRow. */
export type StoredHistoryEntry = {
  id: string;
  group_code: string;
  instance_id: string;
  entry_type: HistoryEntryType;
  trace_id: string | null;
  data: string | null;
  /** Epoch milliseconds, so the dashboard needs no date parsing. */
  saved_at: number;
};

export type GroupSummary = {
  group_code: string;
  last_activity: number;
  my_entries: number;
  share_entries: number;
  total_entries: number;
};

export function isHistoryEntryType(value: unknown): value is HistoryEntryType {
  return (
    value === "joined" ||
    value === "note" ||
    value === "trace_share" ||
    value === "replay_result"
  );
}

/**
 * Append one durable entry.
 *
 * Idempotent for "joined" only: the dashboard posts a membership marker every
 * time the Relay page mounts, so an unguarded insert would add a duplicate row
 * per reload and inflate the counts forever. Messages are never deduplicated —
 * two identical notes are two real messages.
 */
export async function recordHistory(
  groupCode: string,
  instanceId: string,
  entryType: HistoryEntryType,
  traceId: string | null = null,
  data: string | null = null,
): Promise<{ duplicate: boolean }> {
  if (entryType === "joined") {
    const existing = await groupHistoryModel
      .findOne({ groupCode, instanceId, entryType })
      .lean();
    if (existing) return { duplicate: true };
  }

  await groupHistoryModel.create({ groupCode, instanceId, entryType, traceId, data });
  return { duplicate: false };
}

/**
 * Entries for one group, oldest first, so a client can replay the timeline in
 * the order it happened. Survives group expiry, which is the whole point.
 *
 * `types` is an optional allowlist; omit it to get every entry type.
 */
export async function getHistory(
  groupCode: string,
  types?: HistoryEntryType[],
): Promise<StoredHistoryEntry[]> {
  const filter: Record<string, unknown> = { groupCode };
  if (types?.length) filter.entryType = { $in: types };

  const docs = await groupHistoryModel
    .find(filter)
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    group_code: doc.groupCode,
    instance_id: doc.instanceId,
    entry_type: doc.entryType as HistoryEntryType,
    trace_id: doc.traceId ?? null,
    data: doc.data ?? null,
    saved_at: new Date(doc.createdAt).getTime(),
  }));
}

/** Raw aggregate output, before it is reshaped into GroupSummary. */
type RawGroupRow = {
  _id: string;
  last_activity: Date;
  my_entries: number;
};

/** Second-pass counts, spanning every participant in a group. */
type RawTotalRow = {
  _id: string;
  total_entries: number;
  share_entries: number;
};

/**
 * Delete every archived entry for a group.
 *
 * Authorisation: the caller must already be a recorded participant in that
 * group. This endpoint cannot fall back to the Group collection for membership
 * because the group has usually expired by the time anyone wants to delete its
 * history — and an expired group is precisely the case this endpoint serves.
 *
 * That fallback matters for safety, not just tidiness. Group codes are four
 * characters and are shared out loud, and history reads are already
 * unauthenticated, so a delete with no participant check would let anyone wipe
 * any other team's archived conversation by guessing a code. Requiring a row
 * that only a real participant could have written closes that off.
 */
export async function deleteHistoryForGroup(
  groupCode: string,
  instanceId: string,
): Promise<{ ok: true; deleted: number } | { ok: false; reason: "not_a_participant" }> {
  const participant = await groupHistoryModel.exists({ groupCode, instanceId });

  if (!participant) {
    return { ok: false, reason: "not_a_participant" };
  }

  const result = await groupHistoryModel.deleteMany({ groupCode });
  return { ok: true, deleted: result.deletedCount ?? 0 };
}

/**
 * Every group this instance has ever been part of, most recently active first.
 *
 * Membership comes from the marker rows the dashboard writes on entry. Counts
 * span every participant in the group, not just this instance, so the summary
 * reflects the whole conversation.
 *
 * The Group collection is not consulted: it expires after 6h and would report
 * nothing for exactly the expired sessions this list exists to surface.
 */
export async function listGroupsForInstance(instanceId: string): Promise<GroupSummary[]> {
  // Pass 1 — membership and ordering, restricted to this instance.
  const mine = await groupHistoryModel.aggregate<RawGroupRow>([
    { $match: { instanceId } },
    {
      $group: {
        _id: "$groupCode",
        last_activity: { $max: "$createdAt" },
        my_entries: { $sum: 1 },
      },
    },
    { $sort: { last_activity: -1 } },
  ]);

  const codes = mine.map((r) => r._id);

  // Pass 2 — counts across every participant in those groups.
  //
  // This has to be a separate pass. Grouping after `$match: { instanceId }`
  // would count only this instance's rows, making total_entries a duplicate of
  // my_entries and hiding whatever the peer contributed.
  const totals = await groupHistoryModel.aggregate<RawTotalRow>([
    { $match: { groupCode: { $in: codes } } },
    {
      $group: {
        _id: "$groupCode",
        total_entries: { $sum: 1 },
        share_entries: {
          $sum: {
            $cond: [{ $in: ["$entryType", ["trace_share", "replay_result"]] }, 1, 0],
          },
        },
      },
    },
  ]);

  const totalByCode = new Map(totals.map((r) => [r._id, r]));

  return mine.map((r) => {
    const t = totalByCode.get(r._id);
    return {
      group_code: r._id,
      last_activity: new Date(r.last_activity).getTime(),
      my_entries: r.my_entries,
      share_entries: t?.share_entries ?? 0,
      total_entries: t?.total_entries ?? r.my_entries,
    };
  });
}

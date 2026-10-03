import { db } from "../config/db";

// `db` is a better-sqlite3 handle: statements must be prepared with `?`
// placeholders (there is no `$n` syntax and no `db.query()` helper).

// Insert initial history record
//
// Idempotent by design. The dashboard posts a marker whenever the Relay page
// mounts on a group, so a plain INSERT would append a duplicate row on every
// reload and inflate my_entries/total_entries without bound. Re-entering an
// already-recorded group is therefore treated as a no-op.
export async function insertHistory(
  group_code: string,
  instance_id: string,
  entry_type: string
) {
  const existing = db
    .prepare(
      `
      SELECT 1 FROM group_history
      WHERE group_code = ? AND instance_id = ? AND entry_type = ?
      LIMIT 1
    `
    )
    .get(group_code, instance_id, entry_type);

  if (existing) {
    return { message: "Already recorded", duplicate: true };
  }

  db.prepare(
    `
    INSERT INTO group_history (group_code, instance_id, entry_type, saved_at)
    VALUES (?, ?, ?, ?)
  `
  ).run(group_code, instance_id, entry_type, Date.now());

  return { message: "History recorded successfully" };
}

// Append new data entry to group history
export async function insertData(
  group_code: string,
  instance_id: string,
  entry_type: string,
  trace_id: string,
  data: string
) {
  db.prepare(
    `
    INSERT INTO group_history (group_code, instance_id, entry_type, trace_id, data, saved_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(group_code, instance_id, entry_type, trace_id, data, Date.now());

  return { message: "Data appended to history successfully" };
}

/**
 * Read back the persisted entries for a group, oldest first, so a client can
 * replay the timeline in the order it was recorded.
 *
 * `entry_types` is an optional allowlist. Passing it keeps the response limited
 * to the entry types the caller cares about (e.g. trace_share, replay_result)
 * instead of returning every row including bare session markers.
 */
export async function getHistory(group_code: string, entry_types?: string[]) {
  const types = entry_types?.filter(Boolean) ?? [];

  const rows = types.length
    ? db
        .prepare(
          `
          SELECT id, group_code, instance_id, entry_type, trace_id, data, saved_at
          FROM group_history
          WHERE group_code = ? AND entry_type IN (${types.map(() => "?").join(", ")})
          ORDER BY saved_at ASC, id ASC
        `
        )
        .all(group_code, ...types)
    : db
        .prepare(
          `
          SELECT id, group_code, instance_id, entry_type, trace_id, data, saved_at
          FROM group_history
          WHERE group_code = ?
          ORDER BY saved_at ASC, id ASC
        `
        )
        .all(group_code);

  return rows;
}

/**
 * List every group this instance has ever taken part in, most recently active
 * first.
 *
 * Membership is inferred from `group_history.instance_id`: the client records a
 * marker row via insertHistory() whenever it enters a group, so any group this
 * instance touched appears here even if it only ever sent plain notes.
 *
 * Counts are computed across every participant in the group, not just this
 * instance, so the summary reflects the whole conversation.
 *
 * Caveat: the relay recycles 4-character group codes over time and this table
 * has no session discriminator, so two distinct sessions can share a code.
 */
export async function listGroupsForInstance(instance_id: string) {
  const rows = db
    .prepare(
      `
      SELECT
        g.group_code                                        AS group_code,
        MAX(g.saved_at)                                     AS last_activity,
        SUM(CASE WHEN g.instance_id = ? THEN 1 ELSE 0 END)  AS my_entries,
        SUM(CASE WHEN g.entry_type IN ('trace_share', 'replay_result') THEN 1 ELSE 0 END) AS share_entries,
        COUNT(*)                                            AS total_entries
      FROM group_history g
      WHERE g.group_code IN (
        SELECT DISTINCT group_code FROM group_history WHERE instance_id = ?
      )
      GROUP BY g.group_code
      ORDER BY last_activity DESC
    `
    )
    .all(instance_id, instance_id);

  return rows;
}

// Drop history entries for a given group_code
export async function dropData(group_code: string) {
  db.prepare(`DELETE FROM group_history WHERE group_code = ?`).run(group_code);
  return { message: "Group history dropped successfully" };
}

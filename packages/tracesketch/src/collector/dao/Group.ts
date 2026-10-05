import { db } from "../config/db";

// `db` is a better-sqlite3 handle: statements must be prepared with `?`
// placeholders (there is no `$n` syntax and no `db.query()` helper).

/**
 * The only entry types allowed in the local permanent record.
 *
 * The relay's shared archive keeps the whole conversation, notes included, but
 * locally only trace_share and replay_result are worth keeping — those are what
 * outlive the relay's 6h TTL. Notes and "crazy" must never land here.
 *
 * Defined in the DAO rather than the controller on purpose: the collector's own
 * socket client calls insertData() directly, so a check that lived only in the
 * HTTP layer would be bypassed by the exact caller that needs it most.
 */
export const LOCAL_ENTRY_TYPES = ["trace_share", "replay_result"] as const;
export type LocalEntryType = (typeof LOCAL_ENTRY_TYPES)[number];

export function isLocalEntryType(value: unknown): value is LocalEntryType {
  return value === "trace_share" || value === "replay_result";
}

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
//
// `source_id` is the relay's Mongo _id for the message being mirrored. Two
// independent writers can be active at once - the dashboard's socket handler
// and the collector's own relay socket - and both see the same broadcast. The
// unique index on source_id makes the second one lose the insert rather than
// duplicate the row, so ON CONFLICT is scoped to that index specifically: a
// plain INSERT OR IGNORE would also swallow NOT NULL failures.
export async function insertData(
  group_code: string,
  instance_id: string,
  entry_type: string,
  trace_id: string,
  data: string,
  source_id?: string | null
) {
  // Defence in depth: the HTTP controller checks this too, but the collector's
  // socket client reaches this function without going through Express.
  if (!isLocalEntryType(entry_type)) {
    throw new Error(
      `entry_type must be one of: ${LOCAL_ENTRY_TYPES.join(", ")} (got "${String(entry_type)}")`
    );
  }

  const info = db
    .prepare(
      `
      INSERT INTO group_history (group_code, instance_id, entry_type, trace_id, data, saved_at, source_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_id) DO NOTHING
    `
    )
    .run(group_code, instance_id, entry_type, trace_id, data, Date.now(), source_id ?? null);

  if (info.changes === 0) {
    return { message: "Already recorded", duplicate: true };
  }

  return { message: "Data appended to history successfully" };
}

// ─── Group membership ─────────────────────────────────────────────────────────
//
// Tracks which groups this machine currently holds a seat in. The dashboard
// writes here on join/leave; the collector's relay socket reads it to decide
// which rooms to be listening to. This is the only membership state the
// collector has - it cannot infer an active session from group_history alone,
// because that table also holds months-old archived conversations.

export type MembershipRecord = {
  group_code: string;
  session_id: string | null;
  active: number;
  updated_at: number;
};

/** Record (or clear) that this machine is in a group. */
export function setMembershipActive(group_code: string, active: boolean) {
  const code = group_code.trim().toUpperCase();
  db.prepare(
    `
    INSERT INTO group_membership (group_code, session_id, active, updated_at)
    VALUES (?, NULL, ?, ?)
    ON CONFLICT(group_code) DO UPDATE SET active = excluded.active, updated_at = excluded.updated_at
  `
  ).run(code, active ? 1 : 0, Date.now());

  return code;
}

/**
 * Pin the relay session this membership belongs to.
 *
 * Only ever set once per membership, and only if none is stored: the pin must
 * survive a reconnect so that a code which has since been recycled to a new
 * session is still detected. A different session_id is never adopted here -
 * the caller deactivates the membership instead.
 */
export function pinMembershipSession(group_code: string, session_id: string) {
  db.prepare(
    `
    UPDATE group_membership SET session_id = ?, updated_at = ?
    WHERE group_code = ? AND session_id IS NULL
  `
  ).run(session_id, Date.now(), group_code);
}

export function getMembership(group_code: string): MembershipRecord | null {
  const row = db
    .prepare(`SELECT group_code, session_id, active, updated_at FROM group_membership WHERE group_code = ?`)
    .get(group_code.trim().toUpperCase());
  return (row as MembershipRecord | undefined) ?? null;
}

export function listActiveMemberships(): MembershipRecord[] {
  return db
    .prepare(
      `SELECT group_code, session_id, active, updated_at FROM group_membership WHERE active = 1`,
    )
    .all() as MembershipRecord[];
}

/** Mark a membership finished - explicit leave, or a detected recycled code. */
export function deactivateMembership(group_code: string) {
  db.prepare(
    `UPDATE group_membership SET active = 0, updated_at = ? WHERE group_code = ?`,
  ).run(Date.now(), group_code.trim().toUpperCase());
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

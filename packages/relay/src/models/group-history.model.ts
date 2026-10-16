import mongoose from "mongoose";

/**
 * Shared archive of relay activity with a 6h TTL.
 *
 * GroupMessage, Group, GroupSummary and Summary collections all carry
 * `expires: 21600`, so MongoDB reaps them 6h after creation. This collection
 * follows the same rule: every entry (joined markers included) expires 6h
 * after creation because the permanent record lives in each machine's
 * collector SQLite (`group_history` table, fed by the relay-archiver socket
 * and the dashboard mirror). The relay is the live/shared window; SQLite is
 * the durable archive.
 *
 * The relay is the only writer. That matters: a browser-side write to the
 * collector's local SQLite lands on whichever machine sent it, so peers never
 * see each other's shares. Writing here means one entry for everyone (while
 * the 6h window lasts).
 */
const groupHistorySchema = new mongoose.Schema(
  {
    groupCode: { type: String, required: true },
    instanceId: { type: String, required: true },
    entryType: {
      type: String,
      // Every persisted message type, so the archive replays the whole
      // conversation rather than only the shared traces. "joined" is the
      // membership marker the dashboard writes on entry.
      enum: ["joined", "note", "trace_share", "replay_result"],
      required: true,
    },
    // GroupMessage carries no trace id, so this stays null until one is
    // actually available. The dashboard only renders a Trace Detail link when
    // trace_id is set.
    traceId: { type: String, default: null },
    data: { type: String, default: null },
    // 6h TTL, matching Group / GroupMessage. MongoDB's TTL monitor deletes
    // entries ~6h after createdAt; the collector SQLite copy is what outlives
    // the session. All entry types expire — see LOCAL_ENTRY_TYPES on the
    // collector for what is retained locally (trace_share/replay_result).
    createdAt: { type: Date, default: Date.now, expires: 21600 },
  },
  { collection: "group_history", versionKey: false },
);

groupHistorySchema.index({ groupCode: 1, createdAt: 1 });
groupHistorySchema.index({ instanceId: 1, createdAt: -1 });

const groupHistoryModel = mongoose.model("GroupHistory", groupHistorySchema);
export default groupHistoryModel;

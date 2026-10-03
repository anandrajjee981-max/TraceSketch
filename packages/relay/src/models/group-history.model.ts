import mongoose from "mongoose";

/**
 * Durable, shared archive of relay activity.
 *
 * Deliberately has NO `expires` field. The GroupMessage and Group collections
 * both carry `expires: 21600`, so MongoDB reaps them 6h after creation. This
 * collection is the only place a shared trace or replay result outlives the
 * session that produced it.
 *
 * The relay is the only writer. That matters: a browser-side write to the
 * collector's local SQLite lands on whichever machine sent it, so peers never
 * see each other's shares. Writing here means one entry for everyone.
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
    createdAt: { type: Date, default: Date.now ,expires:21600},
  },
  { collection: "group_history", versionKey: false },
);

groupHistorySchema.index({ groupCode: 1, createdAt: 1 });
groupHistorySchema.index({ instanceId: 1, createdAt: -1 });

const groupHistoryModel = mongoose.model("GroupHistory", groupHistorySchema);
export default groupHistoryModel;

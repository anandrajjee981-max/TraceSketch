import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'group', required: true },
  instanceId: { type: String, required: true },
  summaryText: { type: String, required: true },
  type: { type: String, enum: ['note', 'trace_share', 'replay_result'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 21600 }
});

groupMessageSchema.index({ group: 1, createdAt: 1 });

const groupMessageModel = mongoose.model("GroupMessage", groupMessageSchema);
export default groupMessageModel;

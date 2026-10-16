import mongoose from "mongoose";

const summarySchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: "group", required: true },
  instanceId: { type: String, required: true },
  message: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now, expires: 21600 }
});

summarySchema.index({ group: 1, createdAt: 1 });

const summaryModel = mongoose.model("summary", summarySchema);
export default summaryModel;

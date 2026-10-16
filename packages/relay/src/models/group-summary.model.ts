import mongoose from "mongoose";

const groupSummarySchema = new mongoose.Schema({
  groupCode: { type: String, required: true },
  instanceId: { type: String, required: true },
  summaryText: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now, expires: 21600 }
});

groupSummarySchema.index({ groupCode: 1 });

const groupSummaryModel = mongoose.model("groupSummary", groupSummarySchema);
export default groupSummaryModel;  

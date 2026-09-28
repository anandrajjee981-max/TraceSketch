import mongoose from "mongoose";
const groupSchema = new mongoose.Schema({
  groupCode: { type: String, required: true, unique: true },
  creatorInstanceId: { type: String, required: true },
  joinerInstanceId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, expires: 21600 }
});

const groupmodel = mongoose.model("group",groupSchema)
export default groupmodel


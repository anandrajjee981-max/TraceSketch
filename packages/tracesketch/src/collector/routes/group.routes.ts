import express from "express";
import {
  listGroupsController,
  insertHistoryController,
  insertDataController,
  getHistoryController,
  dropDataController,
  setMembershipController,
} from "../controller/Group.controller";

const GroupRouter = express.Router();

// RESTful route definitions
GroupRouter.get("/", listGroupsController);
GroupRouter.post("/history", insertHistoryController);
GroupRouter.post("/data", insertDataController);
GroupRouter.post("/membership", setMembershipController);
GroupRouter.get("/history/:group_code", getHistoryController);
GroupRouter.delete("/history/:group_code", dropDataController);

export default GroupRouter;

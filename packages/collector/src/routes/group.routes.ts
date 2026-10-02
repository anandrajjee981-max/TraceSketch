import express from "express";
import {
  insertHistoryController,
  insertDataController,
  dropDataController,
} from "../controller/Group.controller";

const GroupRouter = express.Router();

// RESTful route definitions
GroupRouter.post("/history", insertHistoryController);
GroupRouter.post("/data", insertDataController);
GroupRouter.delete("/history/:group_code", dropDataController);

export default GroupRouter;

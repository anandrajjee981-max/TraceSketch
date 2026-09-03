import express from "express";
const tracerouter = express.Router()
import { createTrace,gettrace,getalltrace } from "../controller/Trace";

tracerouter.post("/", createTrace);
tracerouter.get("/:traceId", gettrace);
tracerouter.get("/", getalltrace);
export default tracerouter;




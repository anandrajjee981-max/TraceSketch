import express from 'express';
import { listAllReplays, listReplaysForTrace, replayTrace } from '../controller/replay';
const replayrouter = express.Router()

// GET /traces/replays -> list all recent replays (must be before :traceId)
replayrouter.get("/replays", listAllReplays)
replayrouter.get("/:traceId/replays", listReplaysForTrace)

replayrouter.post("/:traceId/replay", replayTrace)


export default replayrouter
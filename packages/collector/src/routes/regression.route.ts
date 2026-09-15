import express from 'express';
const regressionrouter = express.Router()
import { getregression, postregression, ReplayRegression, listAllRegressions } from '../controller/regression';

// GET /traces/regressions -> list all regression tests (must be before /:traceId routes)
regressionrouter.get("/regressions", listAllRegressions)

regressionrouter.post("/:traceId/regression", postregression)
regressionrouter.get("/:traceId/regression", getregression)
regressionrouter.post("/:traceId/regression/:regressionId/run" ,ReplayRegression)

export default regressionrouter
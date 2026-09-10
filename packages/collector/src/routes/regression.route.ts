import express from 'express';
const regressionrouter = express.Router()
import { getregression, postregression } from '../controller/regression';

regressionrouter.post("/:traceId/regression", postregression)
regressionrouter.get("/:traceId/regression", getregression)


export default regressionrouter
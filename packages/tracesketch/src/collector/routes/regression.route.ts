import express from 'express';
const regressionrouter = express.Router()
import { getregression, postregression ,ReplayRegression} from '../controller/regression';

regressionrouter.post("/:traceId/regression", postregression)
regressionrouter.get("/:traceId/regression", getregression)
regressionrouter.post("/:traceId/regression/:regressionId/run" ,ReplayRegression)

export default regressionrouter
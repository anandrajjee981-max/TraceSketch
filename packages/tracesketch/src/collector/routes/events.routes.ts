import express from 'express';
import { createEvents, getDurations ,getTraceEventsHandler } from '../controller/trace.Events';
const router = express.Router();

router.post('/:traceId/events', createEvents);
router.get('/:traceId/durations', getDurations);
router.get('/:traceId/events', getTraceEventsHandler);
// Dashboard expects /traces/:traceId/timeline -> alias to events
router.get('/:traceId/timeline', getTraceEventsHandler);

export default router;

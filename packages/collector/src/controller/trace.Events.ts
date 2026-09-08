import { insertTraceEvent,checktraceidExists ,getEventDurations ,getTraceEvents} from "../dao/Events";
import { Request, Response } from "express";
export async function createEvents(req:Request , res:Response){
try{
let traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId
const check = await checktraceidExists(traceId)
if(!check){
    return res.status(404).json({
        message: "Trace ID not found"
    });
}
const { eventType, service, operation, durationMs, metadata } = req.body;
if (!eventType || !service || !operation || !durationMs || !metadata) {
    return res.status(400).json({
        message: "Missing required fields"
    });
}
const result = await insertTraceEvent(traceId, eventType, service, operation, durationMs, metadata, Date.now());
if (!result) {
    return res.status(500).json({
        message: "Failed to insert trace event"
    });
}
res.status(200).json({
    message: "Trace event created successfully",
    traceId: traceId
})
}
catch(err){
    res.status(500).json({
message:"internal server error"
    })
}


}

export async function getDurations(req:Request , res:Response){
    try{
        let traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId
        const check = await checktraceidExists(traceId)
        if(!check){
            return res.status(404).json({
                message: "Trace ID not found"
            });
        }   
        const durations = await getEventDurations(traceId);
        res.status(200).json({
            message: "Event durations retrieved successfully",
            durations: durations
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
}

export async function getTraceEventsHandler(req: Request, res: Response) {
    try {
        let traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId;
        const check = await checktraceidExists(traceId);
        if (!check) {
            return res.status(404).json({
                message: "Trace ID not found"
            });
        }

        const events = await getTraceEvents(traceId);
        res.status(200).json({
            message: "Trace events retrieved successfully",
            events: events
        });
    } catch (err) {
        res.status(500).json({
            message: "Internal server error"
        });
    }
}


import { Request,Response } from "express";
import { getTrace } from "../dao/trace.dao";

export function postregression (req:Request,res:Response ){
try{
 const traceId = Array.isArray(req.params.traceId)
      ? req.params.traceId[0]
      : req.params.traceId;
    const { target_base_url } = req.body;

    if (!target_base_url) {
      return res.status(400).json({ message: "target_base_url is required" });
    }

    const trace = getTrace(traceId);

    if (!trace) {
      return res.status(404).json({ message: "trace not found" });
    }
 const {name , expected_status}  = req.body()
    



}

catch(err){
res.status(500).json({
    message:"internal server error"
})

}

}














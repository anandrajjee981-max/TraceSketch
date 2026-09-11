import { Request,Response } from "express";
import { getTrace } from "../dao/trace.dao";
import { getRegressionsByTraceId, insertregression ,getRegressionById} from "../dao/regression.dao";


export async function postregression (req:Request,res:Response ){
try{
 const traceId = Array.isArray(req.params.traceId)
      ? req.params.traceId[0]
      : req.params.traceId;
    // const { target_base_url } = req.body;

    // if (!target_base_url) {
    //   return res.status(400).json({ message: "target_base_url is required" });
    // }

    const trace = getTrace(traceId);

    if (!trace) {
      return res.status(404).json({ message: "trace not found" });
    }
 const { name, expected_status, expected_schema } = req.body;
 const source_trace_id = traceId;

const regression = await insertregression(source_trace_id,name,expected_status,expected_schema)
if(!regression){
  return res.status(500).json({
    message:"regression not submitted"
  })
}
res.status(200).json({
  message:"regression test submitted successfully",
  regression
})

}

catch(err){
res.status(500).json({
    message:"internal server error"
})

}

}

export async function getregression(req:Request,res:Response){
try{
const sourceTraceId = Array.isArray(req.params.traceId)
  ? req.params.traceId[0]
  : req.params.traceId;

const trace = getTrace(sourceTraceId);
if (!trace) {
  return res.status(404).json({ message: "trace not found" });
}

const regressions = getRegressionsByTraceId(sourceTraceId);
return res.status(200).json({ message: "regressions found", regressions });
}
catch(err){
console.error(err);
return res.status(500).json({ message: "internal server error" });
}

}

export async function ReplayRegression(req:Request,res:Response){
  try{
const sourceTraceId = Array.isArray(req.params.traceId)
  ? req.params.traceId[0]
  : req.params.traceId;

const regressionId = Array.isArray(req.params.regressionId)
?req.params.regressionId[0]
:req.params.regressionId;
const trace = await getTrace(sourceTraceId)
if(!trace){
  return res.status(404).json({
    message:"trace not found"
  })
}
const {method, path, request_body, request_headers} = trace as any
const { target_base_url } = req.body as { target_base_url?: string };
if (!target_base_url) {
  return res.status(400).json({ message: "target_base_url is required" });
}

const regression = getRegressionById(regressionId)
if(!regression){
    return res.status(404).json({
    message:"regression not found"
  })
}
const {expected_status , source_trace_id} = regression as any ;
const fullUrl = target_base_url + path 
    const parsedHeaders = request_headers ? JSON.parse(request_headers) : {};
    const parsedBody = request_body ? JSON.parse(request_body) : {};
    const response = await fetch(fullUrl, {
      method: method,
      headers: parsedHeaders,
      body: method !== 'GET' ? JSON.stringify(parsedBody) : undefined
    });
    const actual_status = response.status
if(response.status === expected_status){
  res.status(200).json({
    message :"passed regression ",
    expected_status,
    actual_status

  })
}
else{
    res.status(404).json({
    message :"failed regression ",
      expected_status,
    actual_status
  })
}

  }
  catch(err){

res.status(500).json({
  message:"internal server error"
})
  }
}











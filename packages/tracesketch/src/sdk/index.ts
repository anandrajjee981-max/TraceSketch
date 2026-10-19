import express from 'express'
const app = express()
import { expressmiddleware, TraceSketchOptions } from './middleware/Express.middleware'

export type { TraceSketchOptions }

export function traceSketch(options: TraceSketchOptions = {}) {
  const middleware = expressmiddleware(options)
  ;(middleware as any).options = options
  return middleware
}


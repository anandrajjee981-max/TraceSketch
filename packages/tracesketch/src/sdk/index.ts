import express from 'express'
const app = express()
import { expressmiddleware } from './middleware/Express.middleware'


export function traceSketch() {
  return expressmiddleware;
}


import dotenv from 'dotenv';
dotenv.config();
import express from 'express'
import connectdb from './config/db';
import { log } from 'node:console';
const app = express()
connectdb()

app.listen(7000,()=>{
console.log("db is listen on 7000")
})


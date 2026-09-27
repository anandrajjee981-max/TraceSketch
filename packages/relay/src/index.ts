import dotenv from 'dotenv';
dotenv.config();
import express from 'express'
import connectdb from './config/db';
import { log } from 'node:console';
import grouprouter from './routes/group.route';
const app = express()
app.use(express.json())
connectdb()
app.use('/api',grouprouter)


app.listen(7000,()=>{
console.log("db is listen on 7000")
})


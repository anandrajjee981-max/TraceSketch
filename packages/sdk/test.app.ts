import express from 'express'
import { traceSketch } from './src/index'

const app = express()

app.use(traceSketch())

app.get('/hello', (req, res) => {
  res.status(200).json({ message: "hello world" })
})
app.get('/auth',(req,res)=>{
   res.status(200).json({
    message:"hello sketch"
   })
})
app.get('/arj',(req,res)=>{
      res.status(200).json({
    message:"hello raj"
   })
})
app.listen(6001, () => {
  console.log("Test app running on 6001")
})

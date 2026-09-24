import mongoose from "mongoose";
import { Config } from "./config";

export default async function connectdb(){
await mongoose.connect(Config.MONGO_URI)
.then(()=>{
    console.log("db connected")
})

}



import { log } from "console";
import { db, initSchema } from "../config/db";
import crypto from 'crypto'

function generateuuid(){
const uuid = crypto.randomUUID()
return uuid

}

export async function checkinstance(id:string){
  const stmt = db.prepare('SELECT * FROM traces where id = ${id}');
const rows = stmt.columns;
if(!rows){
  
}

}

export async function generateinstance(){
try{
const instanceid = await generateuuid
return instanceid

}
catch(err){
console.log("internal server error")
}
}








import {db} from '../../src/config/db'
import crypto from 'crypto';
import { randomInt } from 'crypto';
import { checkInstanceExists} from '../../src/dao/trace.dao'
function generateSecureCode(length: number = 4): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = randomInt(0, characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}
export async  function createGroup(
 creator_instance_id :string,
 joiner_instance_id :string,

){
  
const check = await checkInstanceExists( creator_instance_id)
if(!check){
    return false
}
 const group_code = await generateSecureCode()



}







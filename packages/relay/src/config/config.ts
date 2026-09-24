import { configDotenv } from "dotenv";

configDotenv(); 
if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined");
}
export const Config = {
    MONGO_URI: process.env.MONGO_URI,

}



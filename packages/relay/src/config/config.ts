import { configDotenv } from "dotenv";

configDotenv(); 
if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable is not defined");
}
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not defined");
}
export const Config = {
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET
}



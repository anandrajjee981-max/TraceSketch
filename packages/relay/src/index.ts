import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

import connectdb from "./config/db.js";
import grouprouter from "./routes/group.route.js";
import { registerGroupSocket } from "./socket/group.socket.js";
import { registerCrazyMessageSocket } from "./socket/crazy-message.socket.js";

const PORT = Number(process.env.PORT ?? 7000);

const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "64kb" }));
app.use(cors({ origin: true, credentials: true }));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:8470",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // order matters — websocket priority
  pingTimeout: 20000, // itne time tak pong na aaye toh disconnect maan lo
  pingInterval: 25000, // kitni der mein ping bhejna hai
  maxHttpBufferSize: 1e6, // 1MB — max message size, DOS se bachne ke liye
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // temp disconnect pe state recover
  },
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

registerGroupSocket(io);
// Separate registration (own connection listener, own file) so the ephemeral
// path shares no code with the persisted message flow.
registerCrazyMessageSocket(io);

app.set("io", io);
app.use(grouprouter);

async function start() {
  try {
    await connectdb();
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`Relay listening on http://localhost:${PORT}`);
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`\n${signal} received, shutting down`);
    io.close();
    server.close(() => process.exit(0));
  });
}

start();

export default server;

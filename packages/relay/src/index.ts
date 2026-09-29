import dotenv from 'dotenv';
dotenv.config();
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import connectdb from './config/db';
import { log } from 'node:console';
import grouprouter from './routes/group.route';
const app = express()
const server = http.createServer(app)
app.use(express.json())
connectdb()
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8470",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // order matters — websocket priority
  pingTimeout: 20000,   // itne time tak pong na aaye toh disconnect maan lo
  pingInterval: 25000,  // kitni der mein ping bhejna hai
  maxHttpBufferSize: 1e6, // 1MB — max message size (default), DOS se bachne ke liye
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // temp disconnect pe state recover
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-room", async ({ groupCode }, ack) => {
    try {
      socket.join(groupCode);

      console.log(
        `Socket ${socket.id} joined room ${groupCode}`
      );

      ack?.({
        success: true,
        groupCode,
      });
    } catch (error) {
      console.error("Join room error:", error);

      ack?.({
        success: false,
        message: "Failed to join room",
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id);
    console.log("Reason:", reason);
  });
});

app.set("io",io)
app.use('/api',grouprouter)

export default server
server.listen(7000,()=>{
console.log("db is listen on 7000")
})


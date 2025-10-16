const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { conectarDB, Mensaje } = require("./db.js");

const app = express();

// CORS para Render y local
app.use(cors({
  origin: ["http://localhost:5173", "https://chat-front-y7bq.onrender.com"], // ⚠️ cambia esta URL por tu frontend real
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.get("/", (req, res) => {
  res.send("Servidor del chat funcionando ✅");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://chat-front-y7bq.onrender.com"],
    methods: ["GET", "POST"]
  }
});

(async () => await conectarDB())();

let usuariosConectados = {};

io.on("connection", async (socket) => {
  console.log("Usuario conectado:", socket.id);
  socket.emit("mensaje", "✅ Conectado al servidor");

  socket.on("mensaje", async (data) => {
    io.emit("mensaje", data);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

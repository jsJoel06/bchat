const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { conectarDB, Mensaje } = require("./db");

// Inicializar app
const app = express();

// CORS configurado para Render + localhost (desarrollo)
app.use(cors({
  origin: ["http://localhost:5173", "https://tu-dominio-frontend.vercel.app"],
  methods: ["GET", "POST"]
}));

app.use(express.json());

// Crear servidor HTTP y Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://tu-dominio-frontend.vercel.app"],
    methods: ["GET", "POST"],
  },
  transports: ["polling", "websocket"], // polling primero para Render
});

// Conectar a la DB
(async () => await conectarDB())();

// Usuarios conectados
let usuariosConectados = {};

io.on("connection", async (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Enviar historial de mensajes
  const historial = await Mensaje.findAll({ order: [["fecha", "ASC"]] });
  historial.forEach(m => socket.emit("mensaje", `${m.de}: ${m.texto}`));

  // Nuevo usuario
  socket.on("nuevoUsuario", (nombre) => {
    usuariosConectados[socket.id] = nombre;
    io.emit("mensaje", `⚡ ${nombre} se ha unido al chat`);
  });

  // Recibir mensaje
  socket.on("mensaje", async (msg) => {
    const nombre = usuariosConectados[socket.id] || "Anónimo";
    await Mensaje.create({ de: nombre, texto: msg });
    io.emit("mensaje", `${nombre}: ${msg}`);
  });

  // Desconexión
  socket.on("disconnect", () => {
    const nombre = usuariosConectados[socket.id];
    if (nombre) io.emit("mensaje", `❌ ${nombre} ha salido del chat`);
    delete usuariosConectados[socket.id];
  });
});

// Puerto dinámico de Render
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));


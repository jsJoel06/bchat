// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let usuariosConectados = {}; // { socketId: nombre }

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Nuevo usuario
  socket.on("nuevoUsuario", (nombre) => {
    usuariosConectados[socket.id] = nombre;
    io.emit("mensaje", { usuario: "Sistema", texto: `⚡ ${nombre} se ha unido al chat` });

    // Lista de usuarios
    const lista = Object.entries(usuariosConectados).map(([id, nombre]) => ({ id, nombre }));
    io.emit("usuariosConectados", lista);
  });

  // Mensajes
  socket.on("mensaje", (msg) => io.emit("mensaje", msg));

  // Señalización WebRTC
  socket.on("llamada", ({ de, a }) => {
    if (usuariosConectados[a]) {
      io.to(a).emit("llamadaEntrante", { de, nombre: usuariosConectados[de] });
    }
  });

  socket.on("responderLlamada", ({ de, respuesta }) => {
    io.to(de).emit("respuestaLlamada", { respuesta, from: socket.id });
  });

  socket.on("ofertaLlamada", ({ to, offer }) => {
    io.to(to).emit("ofertaLlamada", { from: socket.id, offer });
  });

  socket.on("respuestaWebRTC", ({ to, answer }) => {
    io.to(to).emit("respuestaWebRTC", { from: socket.id, answer });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(to).emit("iceCandidate", { from: socket.id, candidate });
  });

  // Desconexión
  socket.on("disconnect", () => {
    const nombre = usuariosConectados[socket.id];
    delete usuariosConectados[socket.id];
    io.emit("mensaje", { usuario: "Sistema", texto: `❌ ${nombre} ha salido del chat` });

    const lista = Object.entries(usuariosConectados).map(([id, nombre]) => ({ id, nombre }));
    io.emit("usuariosConectados", lista);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

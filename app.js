const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { conectarDB, Mensaje } = require("./express/db/db");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let usuariosConectados = {};

(async () => await conectarDB())();

io.on("connection", async (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Enviar historial de mensajes
  const mensajesHistorial = await Mensaje.findAll({ order: [["created_at", "ASC"]] });
  mensajesHistorial.forEach((m) => socket.emit("mensaje", `${m.usuario}: ${m.mensaje}`));

  socket.on("nuevoUsuario", (nombre) => {
    usuariosConectados[socket.id] = nombre;
    io.emit("mensaje", `⚡ ${nombre} se ha unido al chat`);
  });

  socket.on("mensaje", async (data) => {
    const nombre = usuariosConectados[socket.id] || "Anonimo";
    await Mensaje.create({ usuario: nombre, mensaje: data });
    io.emit("mensaje", `${nombre}: ${data}`);
  });

  socket.on("disconnect", () => {
    const nombre = usuariosConectados[socket.id];
    if (nombre) io.emit("mensaje", `❌ ${nombre} ha salido del chat`);
    delete usuariosConectados[socket.id];
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

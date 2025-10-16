const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { conectarDB, Mensaje } = require("./db.js");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let usuariosConectados = {};

(async () => await conectarDB())();

io.on("connection", async (socket) => {
  console.log("Usuario conectado:", socket.id);

  const mensajesHistorial = await Mensaje.findAll({ order: [["fecha", "ASC"]] });
  mensajesHistorial.forEach((m) => socket.emit("mensaje", `${m.de}: ${m.texto}`));

  socket.on("nuevoUsuario", (nombre) => {
    usuariosConectados[socket.id] = nombre;
    io.emit("mensaje", `⚡ ${nombre} se ha unido al chat`);
  });

  socket.on("mensaje", async (data) => {
    const nombre = usuariosConectados[socket.id] || "Anónimo";
    await Mensaje.create({ de: nombre, texto: data });
    io.emit("mensaje", `${nombre}: ${data}`);
  });

  socket.on("disconnect", () => {
    const nombre = usuariosConectados[socket.id];
    if (nombre) io.emit("mensaje", `❌ ${nombre} ha salido del chat`);
    delete usuariosConectados[socket.id];
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));

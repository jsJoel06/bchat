// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { conectarDB, Mensaje, Usuario } = require("./db");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let usuariosConectados = {};

conectarDB();

// --- Registro / Login ---
app.post("/registrar", async (req, res) => {
  const { nombre, password } = req.body;
  if (!nombre || !password) return res.status(400).json({ error: "Faltan datos" });

  try {
    let usuario = await Usuario.findOne({ where: { nombre } });
    if (!usuario) {
      usuario = await Usuario.create({ nombre, password });
      return res.json({ mensaje: "Usuario creado", usuario: { id: usuario.id, nombre: usuario.nombre } });
    } else {
      if (usuario.password !== password)
        return res.status(401).json({ error: "Contraseña incorrecta" });
      return res.json({ mensaje: "Login exitoso", usuario: { id: usuario.id, nombre: usuario.nombre } });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- Socket.io ---
io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("loginUsuario", async ({ nombre, password }) => {
    try {
      let usuario = await Usuario.findOne({ where: { nombre } });
      if (!usuario) usuario = await Usuario.create({ nombre, password: password || "1234" });
      usuariosConectados[socket.id] = usuario.id;

      io.emit("mensaje", { usuario: "Sistema", texto: `${usuario.nombre} se ha unido al chat` });

      const lista = await Promise.all(
        Object.entries(usuariosConectados).map(async ([id, userId]) => {
          const u = await Usuario.findByPk(userId);
          return { id, nombre: u.nombre };
        })
      );
      io.emit("usuariosConectados", lista);

      socket.emit("loginSuccess", { usuario: { id: usuario.id, nombre: usuario.nombre } });
    } catch (err) {
      console.error(err);
      socket.emit("loginError", { mensaje: "Error en el servidor" });
    }
  });

  socket.on("mensaje", async (msg) => {
    try {
      await Mensaje.create({ de: msg.usuario, texto: msg.texto });
      io.emit("mensaje", msg);
    } catch (err) {
      console.error(err);
    }
  });

  // --- Aquí van las funciones de llamadas WebRTC ---
  // llamada, responderLlamada, ofertaLlamada, respuestaWebRTC, iceCandidate

  socket.on("disconnect", async () => {
    const userId = usuariosConectados[socket.id];
    if (userId) {
      const u = await Usuario.findByPk(userId);
      delete usuariosConectados[socket.id];
      io.emit("mensaje", { usuario: "Sistema", texto: `${u.nombre} ha salido del chat` });

      const lista = await Promise.all(
        Object.entries(usuariosConectados).map(async ([id, uid]) => {
          const user = await Usuario.findByPk(uid);
          return { id, nombre: user.nombre };
        })
      );
      io.emit("usuariosConectados", lista);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

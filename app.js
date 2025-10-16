// server.js
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

// Map de usuarios conectados: { socketId: usuarioId }
let usuariosConectados = {};

conectarDB();

// --- Registro / Login ---
app.post("/registrar", async (req, res) => {
  const { nombre, password } = req.body;
  if (!nombre || !password)
    return res.status(400).json({ error: "Faltan datos (nombre o password)" });

  try {
    let usuario = await Usuario.findOne({ where: { nombre } });
    if (!usuario) {
      usuario = await Usuario.create({ nombre, password });
      console.log("✅ Usuario creado:", usuario.nombre);
      return res.json({
        mensaje: "Usuario creado",
        usuario: { id: usuario.id, nombre: usuario.nombre },
      });
    } else {
      if (usuario.password !== password) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }
      console.log("🔑 Login exitoso:", usuario.nombre);
      return res.json({
        mensaje: "Login exitoso",
        usuario: { id: usuario.id, nombre: usuario.nombre },
      });
    }
  } catch (err) {
    console.error("❌ Error registro/login:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- Socket.io ---
io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Login por socket
  socket.on("loginUsuario", async ({ nombre, password }) => {
    try {
      let usuario = await Usuario.findOne({ where: { nombre } });
      if (!usuario) {
        usuario = await Usuario.create({ nombre, password: password || "1234" });
        console.log("👤 Usuario creado desde socket:", usuario.nombre);
      }
      usuariosConectados[socket.id] = usuario.id;

      io.emit("mensaje", {
        usuario: "Sistema",
        texto: `⚡ ${usuario.nombre} se ha unido al chat`,
      });

      const lista = await Promise.all(
        Object.entries(usuariosConectados).map(async ([id, userId]) => {
          const u = await Usuario.findByPk(userId);
          return { id, nombre: u.nombre };
        })
      );
      io.emit("usuariosConectados", lista);

      socket.emit("loginSuccess", { usuario: { id: usuario.id, nombre: usuario.nombre } });
    } catch (err) {
      console.error("Error login usuario:", err);
      socket.emit("loginError", { mensaje: "Error en el servidor" });
    }
  });

  // Chat
  socket.on("mensaje", async (msg) => {
    try {
      await Mensaje.create({ de: msg.usuario, texto: msg.texto });
      io.emit("mensaje", msg);
    } catch (err) {
      console.error("Error mensaje:", err);
    }
  });

  // --- LLAMADAS WEBRTC ---
  // Iniciar llamada
  socket.on("llamada", ({ de, a }) => {
    const socketDestino = Object.keys(usuariosConectados).find(
      (id) => usuariosConectados[id] === a
    );
    if (socketDestino) {
      io.to(socketDestino).emit("llamadaEntrante", { de, nombre: de });
    }
  });

  // Responder llamada
  socket.on("responderLlamada", ({ de, a, respuesta }) => {
    const socketDestino = Object.keys(usuariosConectados).find(
      (id) => usuariosConectados[id] === a
    );
    if (socketDestino) {
      io.to(socketDestino).emit("respuestaLlamada", { respuesta });
    }
  });

  // Oferta WebRTC
  socket.on("ofertaLlamada", ({ to, offer }) => {
    io.to(to).emit("ofertaLlamada", { from: socket.id, offer });
  });

  // Respuesta WebRTC
  socket.on("respuestaWebRTC", ({ to, answer }) => {
    io.to(to).emit("respuestaWebRTC", { answer });
  });

  // ICE candidates
  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(to).emit("iceCandidate", { candidate });
  });

  // Desconexión
  socket.on("disconnect", async () => {
    const userId = usuariosConectados[socket.id];
    if (userId) {
      const u = await Usuario.findByPk(userId);
      delete usuariosConectados[socket.id];
      io.emit("mensaje", {
        usuario: "Sistema",
        texto: `❌ ${u.nombre} ha salido del chat`,
      });

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
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));

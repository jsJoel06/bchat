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

let usuariosConectados = {}; // { socketId: usuarioId }

// Conectar a la base de datos
conectarDB();

// --- Endpoint para registrar o iniciar sesión ---
app.post("/registrar", async (req, res) => {
  const { email, nombre } = req.body;
  if (!email || !nombre)
    return res.status(400).json({ error: "Falta nombre o correo" });

  try {
    let usuario = await Usuario.findOne({ where: { email } });

    if (!usuario) {
      // Si no existe, crear
      usuario = await Usuario.create({ email, nombre });
      console.log("✅ Usuario creado:", usuario.email);
      res.json({
        mensaje: "Usuario creado",
        usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      });
    } else {
      // Si ya existe, hacer login automático
      console.log("🔑 Usuario existente:", usuario.email);
      res.json({
        mensaje: "Login exitoso",
        usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      });
    }
  } catch (err) {
    console.error("❌ Error registrar/login usuario:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- Socket.io ---
io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Login con email (crea si no existe)
  socket.on("loginUsuario", async ({ email, nombre }) => {
    try {
      let usuario = await Usuario.findOne({ where: { email } });

      // Si no existe, lo crea automáticamente
      if (!usuario) {
        usuario = await Usuario.create({ email, nombre: nombre || "Usuario" });
        console.log("👤 Usuario creado desde socket:", usuario.email);
      }

      usuariosConectados[socket.id] = usuario.id;

      // Notificación global
      io.emit("mensaje", {
        usuario: "Sistema",
        texto: `⚡ ${usuario.nombre} se ha unido al chat`,
      });

      // Lista de usuarios conectados
      const lista = await Promise.all(
        Object.entries(usuariosConectados).map(async ([id, userId]) => {
          const u = await Usuario.findByPk(userId);
          return { id, nombre: u.nombre };
        })
      );
      io.emit("usuariosConectados", lista);

      socket.emit("loginSuccess", {
        usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
      });
    } catch (err) {
      console.error("Error login usuario:", err);
      socket.emit("loginError", { mensaje: "Error en el servidor" });
    }
  });

  // Mensajes
  socket.on("mensaje", async (msg) => {
    try {
      await Mensaje.create({ de: msg.usuario, texto: msg.texto });
      io.emit("mensaje", msg);
    } catch (err) {
      console.error("Error mensaje:", err);
    }
  });

  // WebRTC
  socket.on("llamada", ({ de, a }) => {
    if (usuariosConectados[a]) {
      io.to(a).emit("llamadaEntrante", { de, nombre: de });
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
server.listen(PORT, () =>
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
);

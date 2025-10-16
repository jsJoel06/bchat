const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { conectarDB, Mensaje } = require("./db");

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "https://tu-dominio-frontend.vercel.app"],
  methods: ["GET", "POST"]
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://tu-dominio-frontend.vercel.app"],
    methods: ["GET", "POST"]
  },
  transports: ["polling", "websocket"]
});

(async () => await conectarDB())();

let usuariosConectados = {};

io.on("connection", async (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Historial
  const historial = await Mensaje.findAll({ order: [["fecha", "ASC"]] });
  historial.forEach(m => socket.emit("mensaje", { usuario: m.de, texto: m.texto }));

  // Nuevo usuario
  socket.on("nuevoUsuario", (nombre) => {
    usuariosConectados[socket.id] = nombre;
    io.emit("mensaje", { usuario: "Sistema", texto: `⚡ ${nombre} se ha unido al chat` });

    const lista = Object.entries(usuariosConectados).map(([id, nombre]) => ({ id, nombre }));
    io.emit("usuariosConectados", lista);
  });

  // Mensajes
  socket.on("mensaje", async (msg) => {
    const nombre = msg.usuario;
    await Mensaje.create({ de: nombre, texto: msg.texto });
    io.emit("mensaje", { usuario: nombre, texto: msg.texto });
  });

  // Llamadas
  socket.on("llamada", ({ de, a }) => {
    if (usuariosConectados[a]) io.to(a).emit("llamadaEntrante", { de });
  });

  socket.on("responderLlamada", ({ de, respuesta }) => {
    io.to(de).emit("respuestaLlamada", { respuesta });
  });

  // Desconexión
  socket.on("disconnect", () => {
    const nombre = usuariosConectados[socket.id];
    if (nombre) io.emit("mensaje", { usuario: "Sistema", texto: `❌ ${nombre} ha salido del chat` });
    delete usuariosConectados[socket.id];

    const lista = Object.entries(usuariosConectados).map(([id, nombre]) => ({ id, nombre }));
    io.emit("usuariosConectados", lista);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));

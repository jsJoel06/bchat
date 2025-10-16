
const { Sequelize, DataTypes } = require("sequelize");

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://root:hlVC21CoVqKbBrq1mV6qxYFJkkZcsPGI@dpg-d3o851ripnbc73fp2rtg-a.oregon-postgres.render.com:5432/chat_db_tdov";

// Conexión con SSL para Render
const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // importante para Render
    },
  },
});

// Modelo de mensajes
const Mensaje = sequelize.define("Mensaje", {
  de: { type: DataTypes.STRING, allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Modelo de usuarios
const Usuario = sequelize.define("Usuario", {
  nombre: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false, defaultValue: "1234" },
  fechaCreacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Conectar a DB
const conectarDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL conectado");

    // Sincronizar tablas
    await sequelize.sync();
    console.log("✅ Tablas sincronizadas (Mensaje, Usuario)");
  } catch (err) {
    console.error("❌ Error al conectar DB:", err);
  }
};

module.exports = { sequelize, Mensaje, Usuario, conectarDB };

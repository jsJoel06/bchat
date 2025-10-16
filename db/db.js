// db.js
const { Sequelize, DataTypes } = require("sequelize");

// URL de conexión a PostgreSQL
const DATABASE_URL = "postgresql://root:hlVC21CoVqKbBrq1mV6qxYFJkkZcsPGI@dpg-d3o851ripnbc73fp2rtg-a.oregon-postgres.render.com:5432/chat_db_tdov";

// Crear instancia de Sequelize
const sequelize = new Sequelize(DATABASE_URL, {
  logging: false, // desactiva logs de SQL
  dialect: "postgres",
});

// Definir modelo de mensajes
const Mensaje = sequelize.define("Mensaje", {
  de: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  texto: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

// Función para conectar y crear tabla si no existe
const conectarDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL conectado");
    await sequelize.sync();

    // Agregar mensajes iniciales si la tabla está vacía
    const count = await Mensaje.count();
    if (count === 0) {
      await Mensaje.bulkCreate([
        { de: "Sistema", texto: "Bienvenido al chat!" },
        { de: "Sistema", texto: "Aquí puedes hablar con tus amigos." },
      ]);
      console.log("💬 Mensajes iniciales creados");
    }

  } catch (error) {
    console.error("❌ Error al conectar DB:", error);
  }
};

// Exportar sequelize y modelo
module.exports = { sequelize, Mensaje, conectarDB };

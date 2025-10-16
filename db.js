const { Sequelize, DataTypes } = require("sequelize");

// URL de conexión a PostgreSQL (Render)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://root:hlVC21CoVqKbBrq1mV6qxYFJkkZcsPGI@dpg-d3o851ripnbc73fp2rtg-a.oregon-postgres.render.com:5432/chat_db_tdov";

// Crear conexión con SSL (obligatorio en Render)
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // necesario para Render
    },
  },
});

// ===== MODELOS =====

// Modelo Mensaje
const Mensaje = sequelize.define("Mensaje", {
  de: { type: DataTypes.STRING, allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// Modelo Usuario
const Usuario = sequelize.define("Usuario", {
  nombre: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  fechaCreacion: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// ===== CONEXIÓN Y SINCRONIZACIÓN =====
const conectarDB = async (borrarTodo = false) => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión exitosa con PostgreSQL");

    // 🔥 Si quieres borrar las tablas y recrearlas desde cero:
    // cambia 'false' por 'true' en conectarDB(true)
    await sequelize.sync({ force: borrarTodo });

    console.log(
      borrarTodo
        ? "⚠️  Tablas eliminadas y recreadas desde cero"
        : "✅ Tablas sincronizadas (Mensaje, Usuario)"
    );
  } catch (error) {
    console.error("❌ Error al conectar DB:", error);
  }
};

// Exportar conexión y modelos
module.exports = { sequelize, Mensaje, Usuario, conectarDB };

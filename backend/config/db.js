try {
  require("dotenv").config();
} catch (e) {
  console.log("dotenv not available, using environment variables");
}

module.exports = {
  development: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "la_build_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
  },
};
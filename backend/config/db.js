try {
  require("dotenv").config();
} catch (e) {
  console.log("dotenv not available, using environment variables");
}

const config = {};

console.log("[DB Config] DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("[DB Config] DB_PASSWORD exists:", !!process.env.DB_PASSWORD);

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    config.development = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.substring(1),
      user: url.username,
      password: url.password,
      ssl: {
        rejectUnauthorized: false,
        require: true
      }
    };
    console.log("[DB Config] Using DATABASE_URL, host:", url.hostname);
  } catch (e) {
    console.error("[DB Config] Invalid DATABASE_URL:", e.message);
    process.exit(1);
  }
} else if (process.env.DB_PASSWORD) {
  config.development = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "la_build_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  };
  console.log("[DB Config] Using individual DB_* variables, host:", config.development.host);
} else {
  console.error("ERROR: Neither DATABASE_URL nor DB_PASSWORD is set");
  console.error("Please set DATABASE_URL in Render Environment Variables");
  process.exit(1);
}

module.exports = config;
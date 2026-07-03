try {
  require("dotenv").config();
} catch (e) {
  console.log("dotenv not available, using environment variables");
}

const config = {};

if (process.env.DATABASE_URL) {
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
} else {
  if (!process.env.DB_PASSWORD) {
    console.error("ERROR: DB_PASSWORD is not set in .env file");
    process.exit(1);
  }
  
  config.development = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "la_build_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  };
}

module.exports = config;
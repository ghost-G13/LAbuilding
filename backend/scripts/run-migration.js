require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "la_build_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

if (!process.env.DB_PASSWORD) {
  console.error("ERROR: DB_PASSWORD is not set in .env file");
  process.exit(1);
}

async function run() {
  try {
    const sql = fs.readFileSync("./scripts/update-user-table.sql", "utf8");
    await pool.query(sql);
    console.log("User table updated successfully");
  } catch (error) {
    console.error("Error updating table:", error.message);
  } finally {
    await pool.end();
  }
}

run();
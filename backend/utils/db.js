const { Pool } = require("pg");
const config = require("../config/db");

const env = process.env.NODE_ENV || "development";
const pool = new Pool(config[env]);

const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("Query executed:", { text, duration, rows: result.rowCount });
  return result;
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = {
  query,
  getClient,
  pool,
};

require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || "la_build_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

async function run() {
  try {
    console.log("=== 用户表 users ===");
    const users = await pool.query(
      "SELECT id, username, email, phone, role, created_at FROM users ORDER BY id DESC LIMIT 10"
    );
    console.table(users.rows);

    console.log("\n=== 查询记录表 userdata ===");
    const records = await pool.query(
      "SELECT id, user_id, query_type, result_count, created_at FROM userdata ORDER BY id DESC LIMIT 10"
    );
    console.table(records.rows);

    console.log("\n=== user_301513 的查询记录 ===");
    const userRecords = await pool.query(
      "SELECT * FROM userdata u JOIN users us ON u.user_id = us.id WHERE us.username = $1 ORDER BY u.created_at DESC",
      ["user_301513"]
    );
    console.log("记录数:", userRecords.rows.length);
    if (userRecords.rows.length > 0) {
      console.table(userRecords.rows.map(r => ({
        id: r.id,
        query_type: r.query_type,
        result_count: r.result_count,
        created_at: r.created_at,
      })));
    } else {
      console.log("该用户暂无查询记录（刚才的测试只注册了账号，没有保存查询记录）");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await pool.end();
  }
}

run();
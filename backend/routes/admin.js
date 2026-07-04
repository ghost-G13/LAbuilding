const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");
const { requireRole } = require("../middleware/roleGuard");

router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const { page = 1, pageSize = 20, role } = req.query;

    let sql = "SELECT id, username, email, phone, role, email_verified, phone_verified, created_at, last_login FROM users";
    const params = [];

    if (role) {
      params.push(role);
      sql += ` WHERE role = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM (${sql}) as t`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const start = (Number(page) - 1) * Number(pageSize);
    params.push(start, Number(pageSize));
    sql += ` ORDER BY id DESC OFFSET $${params.length - 1} LIMIT $${params.length}`;

    const result = await query(sql, params);

    res.json({
      code: 0,
      message: "success",
      data: {
        records: result.rows,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/user/:userId", requireRole("admin"), async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      "SELECT id, username, email, phone, role, email_verified, phone_verified, created_at, last_login FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "用户不存在",
      });
    }

    res.json({
      code: 0,
      message: "success",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.put("/user/:userId/role", requireRole("admin"), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        code: 400,
        message: "角色不能为空",
      });
    }

    const validRoles = ["admin", "regulator", "dispatcher", "planner", "user"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        code: 400,
        message: "无效的角色",
      });
    }

    const result = await query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "用户不存在",
      });
    }

    res.json({
      code: 0,
      message: "角色更新成功",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/userdata/:userId", requireRole("admin"), async (req, res) => {
  try {
    const { userId } = req.params;
    const { query_type, page = 1, pageSize = 20 } = req.query;

    let sql = "SELECT id, user_id, query_type, query_params, result_count, created_at FROM userdata WHERE user_id = $1";
    const params = [userId];

    if (query_type) {
      params.push(query_type);
      sql += ` AND query_type = $${params.length}`;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM (${sql}) as t`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    const start = (Number(page) - 1) * Number(pageSize);
    params.push(start, Number(pageSize));
    sql += ` ORDER BY created_at DESC OFFSET $${params.length - 1} LIMIT $${params.length}`;

    const result = await query(sql, params);

    const records = result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      query_type: row.query_type,
      query_params: row.query_params ? JSON.parse(row.query_params) : null,
      result_count: row.result_count,
      created_at: row.created_at,
    }));

    res.json({
      code: 0,
      message: "success",
      data: {
        records,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get user userdata error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/userdata/detail/:recordId", requireRole("admin"), async (req, res) => {
  try {
    const { recordId } = req.params;

    const result = await query(
      "SELECT id, user_id, query_type, query_params, result_count, result_data, created_at FROM userdata WHERE id = $1",
      [recordId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "记录不存在",
      });
    }

    const row = result.rows[0];

    res.json({
      code: 0,
      message: "success",
      data: {
        id: row.id,
        user_id: row.user_id,
        query_type: row.query_type,
        query_params: row.query_params ? JSON.parse(row.query_params) : null,
        result_count: row.result_count,
        result_data: row.result_data ? JSON.parse(row.result_data) : null,
        created_at: row.created_at,
      },
    });
  } catch (error) {
    console.error("Get userdata detail error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.delete("/userdata/:recordId", requireRole("admin"), async (req, res) => {
  try {
    const { recordId } = req.params;

    const result = await query(
      "DELETE FROM userdata WHERE id = $1 RETURNING id",
      [recordId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "记录不存在",
      });
    }

    res.json({
      code: 0,
      message: "删除成功",
    });
  } catch (error) {
    console.error("Delete userdata error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.delete("/user/:userId", requireRole("admin"), async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) === parseInt(req.user.id)) {
      return res.status(400).json({
        code: 400,
        message: "不能删除自己",
      });
    }

    await query("DELETE FROM userdata WHERE user_id = $1", [userId]);

    const result = await query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        code: 404,
        message: "用户不存在",
      });
    }

    res.json({
      code: 0,
      message: "用户删除成功",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/stats", requireRole("admin"), async (req, res) => {
  try {
    const userCount = await query("SELECT COUNT(*) as count FROM users");
    const buildingCount = await query("SELECT COUNT(*) as count FROM la_building");
    const noflyCount = await query("SELECT COUNT(*) as count FROM nofly_zone");
    const queryCount = await query("SELECT COUNT(*) as count FROM userdata");

    const roleStats = await query(
      "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC"
    );

    const queryTypeStats = await query(
      "SELECT query_type, COUNT(*) as count FROM userdata GROUP BY query_type ORDER BY count DESC"
    );

    res.json({
      code: 0,
      message: "success",
      data: {
        total_users: parseInt(userCount.rows[0].count),
        total_buildings: parseInt(buildingCount.rows[0].count),
        total_nofly_zones: parseInt(noflyCount.rows[0].count),
        total_queries: parseInt(queryCount.rows[0].count),
        role_stats: roleStats.rows,
        query_type_stats: queryTypeStats.rows,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;
const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

router.post("/save", async (req, res) => {
  try {
    const { query_type, query_params, result_count, result_data } = req.body;
    const user_id = req.user.id;

    if (!query_type) {
      return res.status(400).json({
        code: 400,
        message: "查询类型不能为空",
      });
    }

    const result = await query(
      "INSERT INTO userdata (user_id, query_type, query_params, result_count, result_data) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at",
      [
        user_id,
        query_type,
        JSON.stringify(query_params),
        result_count || 0,
        result_data ? JSON.stringify(result_data) : null,
      ]
    );

    res.json({
      code: 0,
      message: "保存成功",
      data: {
        id: result.rows[0].id,
        created_at: result.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Save userdata error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/list", async (req, res) => {
  try {
    const user_id = req.user.id;
    const { query_type, page = 1, pageSize = 20 } = req.query;

    let sql = "SELECT id, user_id, query_type, query_params, result_count, created_at FROM userdata WHERE user_id = $1";
    const params = [user_id];

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
    console.error("Get userdata list error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

router.get("/detail/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const user_id = req.user.id;

    const result = await query(
      "SELECT id, user_id, query_type, query_params, result_count, result_data, created_at FROM userdata WHERE id = $1 AND user_id = $2",
      [recordId, user_id]
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

router.delete("/delete/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const user_id = req.user.id;

    const result = await query(
      "DELETE FROM userdata WHERE id = $1 AND user_id = $2 RETURNING id",
      [recordId, user_id]
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

module.exports = router;
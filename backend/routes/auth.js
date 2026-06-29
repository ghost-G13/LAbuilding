const express = require("express");
const router = express.Router();
const { query } = require("../utils/db");

// 用户注册
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: "用户名和密码不能为空",
      });
    }

    // 检查用户名是否已存在
    const existingUser = await query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        code: 400,
        message: "用户名已存在",
      });
    }

    // 创建用户
    const result = await query(
      "INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at",
      [username, password, email || null, role || "user"]
    );

    res.json({
      code: 0,
      message: "注册成功",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

// 用户登录
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: "用户名和密码不能为空",
      });
    }

    // 验证用户
    const result = await query(
      "SELECT id, username, email, role, created_at FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        code: 401,
        message: "用户名或密码错误",
      });
    }

    // 更新最后登录时间
    await query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [result.rows[0].id]
    );

    res.json({
      code: 0,
      message: "登录成功",
      data: {
        ...result.rows[0],
        token: `token_${result.rows[0].id}_${Date.now()}`, // 简单token示例
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

// 获取用户信息
router.get("/info/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      "SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1",
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
    console.error("Get user info error:", error);
    res.status(500).json({
      code: 500,
      message: "服务器内部错误",
      error: error.message,
    });
  }
});

module.exports = router;